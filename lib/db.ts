// Prisma client singleton. Reuses one instance across hot reloads in dev so
// we don't exhaust the Postgres connection pool on every file change.
// Standard pattern from the Prisma docs.
import { PrismaClient } from "@prisma/client";

declare global {
  var __prismaClient: PrismaClient | undefined;
}

export const db =
  globalThis.__prismaClient ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = db;
}
