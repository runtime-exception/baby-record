import { Prisma } from '@prisma/client';

const foods = [
  '强化铁米粉', '燕麦', '小米粥', '小麦面条', '土豆', '红薯', '山药', '全熟鸡蛋', '猪肉',
  '牛肉', '鸡肉', '鱼', '虾', '豆腐', '原味全脂酸奶', '花生酱（稀释）', '坚果酱（无整粒）',
  '芝麻酱', '南瓜', '胡萝卜', '西兰花', '菠菜', '苹果', '香蕉', '梨', '牛油果',
];
const supplements = [['维生素D', '☀️', '滴'], ['DHA', '🐟', '粒'], ['钙', '🦴', '粒']];
const exercises = [
  ['玩耍', '🧸', '分钟'], ['抬头', '👶', '分钟'], ['翻身', '🔄', '次'], ['俯卧', '🐣', '分钟'],
  ['踢腿', '🦵', '分钟'], ['抓握', '✋', '次'], ['爬行', '🐾', '分钟'], ['练习坐', '🪑', '分钟'],
];

export async function initializeBabyConfigs(db: Prisma.TransactionClient, babyId: string) {
  await db.food.createMany({ data: foods.map((name) => ({ babyId, name })), skipDuplicates: true });
  await db.supplementConfig.createMany({
    data: supplements.map(([name, emoji, defaultUnit]) => ({ babyId, name, emoji, defaultUnit, defaultAmount: '1' })),
    skipDuplicates: true,
  });
  await db.exerciseConfig.createMany({
    data: exercises.map(([name, emoji, defaultUnit]) => ({ babyId, name, emoji, defaultUnit, defaultAmount: '1' })),
    skipDuplicates: true,
  });
}
