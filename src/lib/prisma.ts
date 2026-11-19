import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

type PrismaGlobals = {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

// SAFETY: Next.js hot reload reuses process globalThis; we only read/write our optional keys.
const globalForPrisma = globalThis as typeof globalThis & PrismaGlobals;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres", "db"]);

/**
 * Hosted Postgres (Supabase, Aiven) needs TLS. Their certificates are signed by the
 * provider's own CA, so verify with DATABASE_CA_CERT when given, otherwise encrypt
 * without verifying. Keep `sslmode` out of DATABASE_URL: it would override this.
 */
function sslFor(connectionString: string): PoolConfig["ssl"] {
  const host = new URL(connectionString).hostname;

  if (LOCAL_HOSTS.has(host)) return undefined;

  const ca = process.env.DATABASE_CA_CERT?.replace(/\n/g, "\n");

  return ca ? { ca } : { rejectUnauthorized: false };
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const production = process.env.NODE_ENV === "production";

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      ssl: sslFor(connectionString),
      connectionTimeoutMillis: 10_000,
      // Serverless: each instance keeps only a few connections; the pooler (6543) multiplexes.
      max: production ? 3 : 10,
      idleTimeoutMillis: production ? 10_000 : 30_000,
    });

  if (!production) {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
