#!/usr/bin/env node
/**
 * 운영자용: 비밀번호를 잊은 사장님 계정에 새 비밀번호를 정해 준다. 매장 데이터는 건드리지 않는다.
 * 운영 DB에 쓰려면 DATABASE_URL을 운영 주소로 두고 실행한다.
 *
 *   node scripts/reset-password.mjs --email owner@example.com --password 새비밀번호8자이상
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);

  return i === -1 ? undefined : process.argv[i + 1];
}

const email = arg("email")?.trim().toLowerCase();
const password = arg("password");

if (!email || !password || password.length < 8) {
  console.log("사용법: node scripts/reset-password.mjs --email <이메일> --password <8자 이상>");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log(`계정이 없습니다: ${email}`);
    process.exitCode = 1;
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`비밀번호를 바꿨습니다: ${email}`);
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
