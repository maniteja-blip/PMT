
// Prisma configuration file.
// The datasource URL is defined in prisma/schema.prisma via env("DATABASE_URL").
// We intentionally omit the datasource block here so that `prisma generate`
// (which runs at build time) does not require DATABASE_URL to be set.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
});
