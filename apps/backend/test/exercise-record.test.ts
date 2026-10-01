import assert from 'node:assert/strict';
import { ActivityService } from '../src/modules/activity/activity.service';
import { ExerciseConfigService } from '../src/modules/exercise-config/exercise-config.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { validateExerciseAmount } from '../src/modules/activity/exercise-rules';
const now = new Date('2026-10-01T08:00:00Z');
const configs = [
  { id: 1, name: '翻身', defaultAmount: '1', defaultUnit: '次', emoji: null, isActive: true, createdTime: now, updatedTime: now },
  { id: 2, name: '抬头', defaultAmount: '1', defaultUnit: '分钟', emoji: null, isActive: true, createdTime: now, updatedTime: now },
  { id: 3, name: '俯卧', defaultAmount: '10', defaultUnit: '秒', emoji: null, isActive: true, createdTime: now, updatedTime: now },
];
const records: any[] = [];
const prisma = {
  baby: { findUnique: async () => ({ id: 7 }) }, user: { findUnique: async () => ({ id: 9 }) },
  exerciseConfig: {
    findMany: async ({ where }: any) => where?.name ? configs.filter(c => where.name.in.includes(c.name)) : where?.isActive ? configs.filter(c => c.isActive) : configs,
    findUnique: async ({ where }: any) => configs.find(c => where.id ? c.id === where.id : c.name === where.name) ?? null,
    create: async ({ data }: any) => { const c = { ...data, id: configs.length + 1, isActive: true, createdTime: now, updatedTime: now }; configs.push(c); return c; },
    update: async ({ where, data }: any) => { const c = configs.find(c => c.id === where.id)!; Object.assign(c, data); return c; },
  },
  activity: {
    create: async ({ data }: any) => { const r = { id: records.length + 1, ...data, description: data.description ?? null, remark: data.remark ?? null, createdTime: now }; records.push(r); return r; },
    findUnique: async ({ where }: any) => records.find(r => r.id === where.id) ?? null,
    update: async ({ where, data }: any) => { const r = records.find(r => r.id === where.id); Object.assign(r, data); return r; },
  },
} as unknown as PrismaService;
const base = { babyId: 7, creatorId: 9, eventTime: now.toISOString(), eventType: '运动' };
async function main() {
  const service = new ActivityService(prisma), management = new ExerciseConfigService(prisma);
  const a = await service.create({ ...base, exerciseTypes: ['翻身', '抬头', '俯卧'], amount: '2.5', unit: '分钟' });
  assert.equal(a.unit, '分钟'); assert.equal(a.amount, '2.5');
  const b = await service.create({ ...base, exerciseTypes: ['翻身', '俯卧', '抬头'], amount: '20', unit: '秒' });
  assert.equal(b.unit, '秒'); assert.equal(records.length, 2);
  for (const names of [[], ['不存在'], ['翻身', '翻身']]) await assert.rejects(() => service.create({ ...base, exerciseTypes: names, amount: '1', unit: '分钟' }));
  await assert.rejects(() => service.create({ ...base, exerciseTypes: ['翻身', '抬头'], amount: '1', unit: '次' }));
  for (const value of ['0', '-1', 'abc', '', 'Infinity']) assert.throws(() => validateExerciseAmount(value, '分钟'));
  assert.throws(() => validateExerciseAmount('1.5', '次')); assert.throws(() => validateExerciseAmount('1', '小时'));
  assert.equal((await service.update(a.id, { amount: '5' })).amount, '5');
  await management.update(2, { name: '抬头练习', defaultUnit: '秒', defaultAmount: '30' });
  await management.remove(1);
  assert.deepEqual((await service.update(a.id, { description: '保留快照' })).exerciseTypes, ['翻身', '抬头', '俯卧']);
  assert.equal(records[0].unit, '分钟');
  await assert.rejects(() => service.create({ ...base, exerciseTypes: ['翻身'], amount: '1', unit: '次' }));
  const c = await management.create({ name: '踢腿', defaultAmount: '1', defaultUnit: '分钟' });
  await management.remove(c.id); assert.equal((await management.findAll()).some(r => r.id === c.id), false);
  await management.update(c.id, { isActive: true }); assert.equal((await management.findAll()).some(r => r.id === c.id), true);
  await assert.rejects(() => management.create({ name: '错误', defaultAmount: '0', defaultUnit: '次' }));
  await assert.rejects(() => management.update(c.id, { defaultAmount: '' }));
  records.push({ ...records[0], id: 10, exerciseTypes: ['抬头'], amount: null, unit: null });
  const legacy = await service.update(10, { description: '旧描述' }); assert.equal(legacy.amount, null); assert.equal(legacy.unit, null);
  assert.deepEqual((await service.create({ ...base, eventType: '洗澡' })).exerciseTypes, []);
  console.log('exercise config and record tests passed');
}
main().catch(error => { console.error(error); process.exit(1); });
