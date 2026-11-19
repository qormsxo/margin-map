#!/usr/bin/env node
/**
 * DB 전체를 JSON 파일 하나로 내려받는다. Supabase 무료 플랜은 백업을 내려받을 수 없어서,
 * 운영 DB를 주기적으로 이 스크립트로 떠 둔다 (pg_dump 설치 없이 동작).
 *
 *   DATABASE_URL=<운영 주소> node scripts/backup.mjs        → backups/marginmap-YYYYMMDD-HHMM.json
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  console.log("DATABASE_URL이 없습니다.");
  process.exit(1);
}

const host = new URL(url).hostname;
const local = ["localhost", "127.0.0.1", "::1", "postgres", "db"].includes(host);
const connectionString = url.replace(/[?&]sslmode=[^&]*/, "");

const pool = new pg.Pool({
  connectionString,
  ssl: local ? undefined : { rejectUnauthorized: false },
});

try {
  const { rows: tables } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
     ORDER BY table_name`,
  );

  const dump = { createdAt: new Date().toISOString(), host, tables: {} };

  for (const { table_name: name } of tables) {
    const { rows } = await pool.query(`SELECT * FROM "${name}"`);

    dump.tables[name] = rows;
    console.log(`${name}: ${rows.length}`);
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13);
  const dir = path.resolve("backups");

  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, `marginmap-${stamp}.json`);

  fs.writeFileSync(file, JSON.stringify(dump));
  console.log(`저장: ${file}`);
} finally {
  await pool.end();
}
