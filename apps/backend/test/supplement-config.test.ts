import assert from 'node:assert/strict';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupplementConfigService } from '../src/modules/supplement-config/supplement-config.service';
import { BusinessException } from '../src/common/exceptions/business.exception';

type ConfigRow = {
  id: number;
  babyId: string;
  name: string;
  emoji: string | null;
  defaultAmount: string | null;
  defaultUnit: string | null;
  isActive: boolean;
  createdTime: Date;
  updatedTime: Date;
};

const now = new Date('2026-09-27T08:00:00.000Z');
const rows: ConfigRow[] = [
  {
    id: 1,
    babyId: 'a1b2c3d4e5f60718',
    name: '维生素D',
    emoji: '☀️',
    defaultAmount: '1',
    defaultUnit: '滴',
    isActive: true,
    createdTime: now,
    updatedTime: now,
  },
  {
    id: 2,
    babyId: 'a1b2c3d4e5f60718',
    name: '已停用补剂',
    emoji: null,
    defaultAmount: null,
    defaultUnit: null,
    isActive: false,
    createdTime: now,
    updatedTime: now,
  },
];

const prisma = {
  supplementConfig: {
    findMany: async ({ where }: { where: { babyId: string; isActive?: boolean } }) =>
      rows.filter((row) => row.babyId === where.babyId && (!where.isActive || row.isActive)),
    findUnique: async ({ where }: { where: { id?: number; babyId?: string; babyId_name?: { babyId: string; name: string } } }) =>
      rows.find((row) => where.id !== undefined
        ? row.id === where.id && row.babyId === where.babyId
        : row.name === where.babyId_name?.name && row.babyId === where.babyId_name?.babyId) ?? null,
    create: async ({ data }: { data: Omit<ConfigRow, 'id' | 'isActive' | 'createdTime' | 'updatedTime'> }) => {
      const row: ConfigRow = {
        id: rows.length + 1,
        ...data,
        isActive: true,
        createdTime: now,
        updatedTime: now,
      };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: number }; data: Partial<ConfigRow> }) => {
      const row = rows.find((item) => item.id === where.id);
      if (!row) throw new Error('missing test row');
      Object.assign(row, data, { updatedTime: now });
      return row;
    },
  },
} as unknown as PrismaService;

async function main() {
  const service = new SupplementConfigService(prisma);

  const active = await service.findAll('a1b2c3d4e5f60718');
  assert.deepEqual(active.map((item) => item.name), ['维生素D']);

  const created = await service.create('a1b2c3d4e5f60718', {
    name: '  维生素C  ',
    emoji: '  🍊  ',
    defaultAmount: ' 2 ',
    defaultUnit: ' 粒 ',
  });
  assert.deepEqual(
    {
      name: created.name,
      emoji: created.emoji,
      defaultAmount: created.defaultAmount,
      defaultUnit: created.defaultUnit,
    },
    { name: '维生素C', emoji: '🍊', defaultAmount: '2', defaultUnit: '粒' },
  );

  await assert.rejects(
    () => service.create('a1b2c3d4e5f60718', { name: '维生素C' }),
    (error: unknown) => error instanceof BusinessException && error.getResponse()['message'] === '该补剂已存在',
  );

  assert.deepEqual(await service.findAll('b1b2c3d4e5f60718'), []);
  await assert.rejects(() => service.remove('b1b2c3d4e5f60718', created.id));
  await service.remove('a1b2c3d4e5f60718', created.id);
  assert.equal(rows.find((item) => item.id === created.id)?.isActive, false);

  console.log('supplement config tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
