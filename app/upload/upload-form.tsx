"use client";

import { useId, useRef, useState } from "react";
import { UpgradeModal } from "@/components/upgrade-modal";
import { track } from "@/lib/analytics";

type Status =
  | { kind: "idle" }
  | { kind: "info"; message: string }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function isAcceptedFile(file: File): boolean {
  return file.type.startsWith("audio/") || file.type.startsWith("video/");
}

export function UploadForm() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    reason: string | null;
  }>({ open: false, reason: null });

  function selectFile(next: File) {
    if (!isAcceptedFile(next)) {
      setStatus({ kind: "error", message: "Please choose an audio or video file." });
      return;
    }
    setFile(next);
    setStatus({ kind: "idle" });
  }

  async function onSubmit() {
    if (!file) {
      setStatus({ kind: "error", message: "Select a file first." });
      return;
    }

    setSubmitting(true);
    setStatus({
      kind: "info",
      message: "Generating subtitles. This may take a minute…",
    });

    track("upload_started", {
      file_type: file.type,
      file_size_bytes: file.size,
    });

    const formData = new FormData();
    formData.append("file", file);

    let response: Response;
    try {
      response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Please try again.",
      });
      setSubmitting(false);
      return;
    }

    if (response.status === 403) {
      const body = await response.json().catch(() => ({}));
      const data = body as { error?: string; upgradeRequired?: boolean };
      if (data.upgradeRequired) {
        setUpgradeModal({ open: true, reason: data.error ?? null });
        track("upgrade_modal_shown", { reason: data.error ?? null });
        setStatus({ kind: "idle" });
      } else {
        setStatus({
          kind: "error",
          message: data.error ?? "Upload not allowed.",
        });
      }
      setSubmitting(false);
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        (body as { error?: string }).error ??
        `Upload failed (${response.status}).`;
      setStatus({ kind: "error", message });
      setSubmitting(false);
      return;
    }

    // Force a browser download of the SRT.
    const blob = await response.blob();
    const cdHeader = response.headers.get("Content-Disposition") ?? "";
    const filenameMatch = cdHeader.match(/filename="?([^"]+)"?/);
    const downloadName = filenameMatch?.[1] ?? `${file.name}.srt`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    track("transcription_completed", {
      file_name: file.name,
      duration_minutes: 0,
    });
    track("export_downloaded", {
      format: "srt",
      file_name: downloadName,
    });

    setStatus({
      kind: "success",
      message: "Success. Your SRT file has been downloaded.",
    });
    setSubmitting(false);
  }

  const dropClasses = [
    "rounded-[var(--radius-md)] border-2 border-dashed px-6 py-12 text-center transition-colors",
    "outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--color-proofmark-red)_25%,transparent)]",
    file
      ? "border-[var(--color-proofmark-red)] bg-[var(--color-proofmark-red-wash)]"
      : "border-[var(--color-proofmark-red-soft)] bg-[var(--color-proofmark-red-wash)]",
    dragOver ? "border-[var(--color-proofmark-red-deep)] scale-[1.01]" : "",
  ].join(" ");

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose audio or video file"
        className={dropClasses}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) selectFile(dropped);
        }}
      >
        <UploadIcon />
        <p className="mt-3 text-base font-semibold text-[var(--color-proofmark-red)]">
          {file?.name ?? "Drag & drop a file, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {file ? formatFileSize(file.size) : "MP3, MP4, WAV, MOV, M4A"}
        </p>
        <label htmlFor={inputId} className="sr-only">
          Choose an audio or video file
        </label>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={(e) => {
            const next = e.target.files?.[0];
            if (next) selectFile(next);
          }}
        />
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !file}
        aria-busy={submitting}
        className="mt-5 w-full rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-proofmark-red-deep)] disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-bg)] disabled:text-[var(--color-disabled-text)]"
      >
        {submitting ? "Generating subtitles…" : "Generate subtitles"}
      </button>

      <div
        role="status"
        aria-live="polite"
        className={`mt-4 min-h-[1.4em] text-center text-sm ${
          status.kind === "success"
            ? "text-[var(--color-success-green)]"
            : status.kind === "error"
              ? "text-[var(--color-proofmark-red)]"
              : "text-[var(--color-text-muted)]"
        }`}
      >
        {status.kind === "idle" ? "" : status.message}
      </div>

      <UpgradeModal
        open={upgradeModal.open}
        reason={upgradeModal.reason}
        onClose={() => setUpgradeModal({ open: false, reason: null })}
      />
    </>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto text-[var(--color-proofmark-red)] opacity-80"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
