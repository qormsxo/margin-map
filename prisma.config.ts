import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations need a direct (session) connection; the app uses DATABASE_URL (pooled on Supabase).
// Locally there is only DATABASE_URL, so fall back to it.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("DATABASE_URL (or DIRECT_URL) is not set");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
