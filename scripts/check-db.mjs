import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const rows = await prisma.$queryRaw`SELECT 1 AS ok`;

console.log("db-ok", rows);

await prisma.$disconnect();

await pool.end();
