import "dotenv/config";
import { defineConfig } from "prisma/config";

// Use a fallback dummy URL so `prisma generate` succeeds at build time
// even when DATABASE_URL is not yet available (e.g. on Vercel build workers).
// The real URL is still required at runtime via the schema.prisma env() call.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
