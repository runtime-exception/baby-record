import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import configuration from '../config/configuration';

configuration();
const prisma = new PrismaClient();

async function copyConfig(db: Prisma.TransactionClient, kind: string, id: number, babyId: number, replace: boolean) {
  const where = { id, babyId: null };
  if (kind === 'food') {
    const { name, emoji, isActive } = await db.food.findFirstOrThrow({ where });
    const data = { name, emoji, isActive };
    return db.food.upsert({ where: { babyId_name: { babyId, name } }, create: { babyId, ...data }, update: replace ? data : {} });
  }
  if (kind === 'supplement') {
    const { name, emoji, isActive, defaultAmount, defaultUnit } = await db.supplementConfig.findFirstOrThrow({ where });
    const data = { name, emoji, isActive, defaultAmount, defaultUnit };
    return db.supplementConfig.upsert({ where: { babyId_name: { babyId, name } }, create: { babyId, ...data }, update: replace ? data : {} });
  }
  const { name, emoji, isActive, defaultAmount, defaultUnit } = await db.exerciseConfig.findFirstOrThrow({ where });
  const data = { name, emoji, isActive, defaultAmount, defaultUnit };
  return db.exerciseConfig.upsert({ where: { babyId_name: { babyId, name } }, create: { babyId, ...data }, update: replace ? data : {} });
}

async function main() {
  const [kind, from, to, flag] = process.argv.slice(2);
  if (kind === 'list') {
    const query = { where: { babyId: null }, select: { id: true, name: true }, orderBy: { id: 'asc' as const } };
    console.log(JSON.stringify({
      food: await prisma.food.findMany(query),
      supplement: await prisma.supplementConfig.findMany(query),
      exercise: await prisma.exerciseConfig.findMany(query),
    }, null, 2));
    return;
  }
  const id = Number(from), babyId = Number(to);
  const validId = (value: number) => Number.isInteger(value) && value > 0 && value <= 2147483647;
  if (!['food', 'supplement', 'exercise'].includes(kind) || !validId(id) || !validId(babyId) || (flag && flag !== '--replace')) {
    throw new Error('用法：assign-legacy-config list | <food|supplement|exercise> <旧配置ID> <宝宝ID> [--replace]');
  }
  const config = await prisma.$transaction((db) => copyConfig(db, kind, id, babyId, flag === '--replace'));
  console.log(JSON.stringify({ id: config.id, babyId, name: config.name }));
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
