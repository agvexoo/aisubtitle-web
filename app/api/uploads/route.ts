// POST /api/uploads
// Multipart body: { file: <audio or video file> }
//
// Flow:
//   1. Auth check (requireUser).
//   2. Feature gate (canUpload). 403 with upgradeRequired=true if the user's
//      plan limits are hit.
//   3. Create an Upload row with status=PENDING so the dashboard can see
//      in-flight jobs.
//   4. Forward the file to the FastAPI transcription backend at
//      SUBTITLE_API_URL. Stream as multipart; the backend returns the SRT
//      as application/x-subrip.
//   5. On success: mark Upload COMPLETE, increment Usage counters (uploads
//      and estimated minutes parsed from the SRT), return the SRT to the
//      client with a friendly filename.
//   6. On failure: mark Upload FAILED, do NOT increment usage.
//
// Returns: 200 with text/plain SRT body on success.
//          403 { error, upgradeRequired } if gate denied.
//          400 / 502 / 500 on other failures.
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { canUpload } from "@/lib/gates";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { estimateMinutesFromSrt, incrementUsage } from "@/lib/usage";

export const runtime = "nodejs";
// Disable Next's response caching — every upload is unique.
export const dynamic = "force-dynamic";

const ACCEPTED_PREFIXES = ["audio/", "video/"];

export async function POST(request: NextRequest) {
  const session = await requireUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dbUser } = session;

  // Gate first. Avoid even reading the file body if the user is blocked.
  const gate = await canUpload(dbUser.id);
  if (!gate.allowed) {
    return NextResponse.json(
      {
        error: gate.reason ?? "Upload not allowed",
        upgradeRequired: gate.upgradeRequired ?? false,
      },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse multipart form" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Missing file in 'file' field" },
      { status: 400 },
    );
  }

  if (!ACCEPTED_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
    return NextResponse.json(
      { error: "File must be an audio or video file" },
      { status: 400 },
    );
  }

  const upload = await db.upload.create({
    data: {
      userId: dbUser.id,
      fileName: file.name,
      fileSize: file.size,
      status: "PROCESSING",
    },
  });

  // Forward to FastAPI as multipart. FastAPI's main.py expects a single
  // "file" field on POST /generate-srt.
  const forwardForm = new FormData();
  forwardForm.append("file", file, file.name);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${env.SUBTITLE_API_URL}/generate-srt`, {
      method: "POST",
      body: forwardForm,
    });
  } catch (err) {
    await db.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED" },
    });
    const message =
      err instanceof Error ? err.message : "Subtitle backend unreachable";
    return NextResponse.json(
      {
        error: `Could not reach transcription service: ${message}`,
      },
      { status: 502 },
    );
  }

  if (!backendResponse.ok) {
    await db.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED" },
    });
    const detail = await backendResponse.text().catch(() => "");
    return NextResponse.json(
      {
        error: `Transcription backend returned ${backendResponse.status}: ${
          detail.slice(0, 200) || "(no body)"
        }`,
      },
      { status: 502 },
    );
  }

  const srt = await backendResponse.text();
  const minutes = estimateMinutesFromSrt(srt);

  await db.upload.update({
    where: { id: upload.id },
    data: {
      status: "COMPLETE",
      durationSeconds: minutes * 60,
    },
  });

  await incrementUsage(dbUser.id, 1, minutes);

  const baseName = file.name.includes(".")
    ? file.name.replace(/\.[^.]+$/, "")
    : file.name || "subtitles";

  return new NextResponse(srt, {
    status: 200,
    headers: {
      "Content-Type": "application/x-subrip; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}.srt"`,
      "X-Upload-Id": upload.id,
    },
  });
}
