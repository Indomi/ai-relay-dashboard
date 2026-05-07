// Prisma 7 config - connection URL is configured here instead of schema.prisma
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["POSTGRES_PRISMA_URL"] || process.env["DATABASE_URL"] || "",
  },
});
