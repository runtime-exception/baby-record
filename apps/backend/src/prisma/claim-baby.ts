import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { secretHash } from '../modules/auth/auth.service';
import configuration from '../config/configuration';

configuration();
const prisma = new PrismaClient();

async function main() {
  const babyId = Number(process.argv[2]);
  const hours = Number(process.argv[3] ?? 24);
  if (!Number.isInteger(babyId) || babyId < 1 || babyId > 2147483647 || !Number.isInteger(hours) || hours < 1 || hours > 168) {
    throw new Error('用法：claim-baby <宝宝ID> [有效小时数，1–168]');
  }
  const code = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + hours * 3600_000);
  await prisma.$transaction(async (db) => {
    const rows = await db.$queryRaw`SELECT id FROM baby WHERE id = ${babyId} FOR UPDATE` as object[];
    if (!rows.length || await db.babyMember.count({ where: { babyId, isAdmin: true } })) {
      throw new Error('宝宝不存在或已有管理员');
    }
    const data = { codeHash: secretHash(code), expiresAt };
    await db.babyClaim.upsert({ where: { babyId }, create: { babyId, ...data }, update: data });
  });
  console.log(JSON.stringify({ babyId, code, expiresAt }));
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
