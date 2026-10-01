import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import ExerciseManagementView from '@/views/ExerciseManagementView.vue';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/api/exercise-config', () => ({ exerciseConfigApi: api }));

const AppInputStub = defineComponent({
  props: { value: { type: String, default: '' }, placeholder: { type: String, default: '' } },
  emits: ['update:value'],
  setup(_props, { emit }) {
    return {
      onInput: (event: Event) => emit('update:value', (event.target as HTMLInputElement).value),
    };
  },
  template: '<input :value="value" :placeholder="placeholder" @input="onInput" />',
});

const configs = [
  {
    id: 1,
    name: '抬头',
    emoji: '☀️',
    defaultAmount: '1',
    defaultUnit: '分钟',
    isActive: true,
    createdTime: '2026-09-27T08:00:00.000Z',
    updatedTime: '2026-09-27T08:00:00.000Z',
  },
  {
    id: 2,
    name: '翻身',
    emoji: '🐟',
    defaultAmount: '1',
    defaultUnit: '次',
    isActive: false,
    createdTime: '2026-09-27T08:00:00.000Z',
    updatedTime: '2026-09-27T08:00:00.000Z',
  },
];

function buttonByText(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((item) => item.text() === text);
  if (!button) throw new Error(`button not found: ${text}`);
  return button;
}

describe('exercise management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue(configs);
    api.create.mockResolvedValue(configs[0]);
    api.update.mockResolvedValue(configs[0]);
    api.remove.mockResolvedValue(undefined);
  });

  it('creates a configuration with name, emoji, amount and unit', async () => {
    const wrapper = mount(ExerciseManagementView, {
      global: {
        stubs: {
          AppHeader: true,
          AppInput: AppInputStub,
          AppPullToRefresh: { template: '<div><slot /></div>' },
          AppSheet: { template: '<div><slot /></div>' },
        },
      },
    });
    await flushPromises();

    await wrapper.get('input[placeholder="如：抬头"]').setValue('踢腿');
    await wrapper.get('input[placeholder="默认数量"]').setValue('2');
    await wrapper.findAll('select')[0].setValue('秒');
    await wrapper.get('input[placeholder="运动图标（选填，如：🧸）"]').setValue('🐟');
    await buttonByText(wrapper, '添加').trigger('click');

    expect(api.create).toHaveBeenCalledWith({
      name: '踢腿',
      emoji: '🐟',
      defaultAmount: '2',
      defaultUnit: '秒',
    });
  });

  it('edits, disables and restores configurations', async () => {
    const wrapper = mount(ExerciseManagementView, {
      global: {
        stubs: {
          AppHeader: true,
          AppInput: AppInputStub,
          AppPullToRefresh: { template: '<div><slot /></div>' },
          AppSheet: { template: '<div><slot /></div>' },
        },
      },
    });
    await flushPromises();

    await buttonByText(wrapper, '编辑').trigger('click');
    await wrapper.get('input[placeholder="运动名称"]').setValue('抬头3');
    await wrapper.get('input[placeholder="本配置默认数量"]').setValue('2');
    await wrapper.findAll('select')[1].setValue('分钟');
    await wrapper.get('input[placeholder="运动图标（选填）"]').setValue('💊');
    await buttonByText(wrapper, '保存').trigger('click');
    await flushPromises();

    expect(api.update).toHaveBeenCalledWith(1, {
      name: '抬头3',
      emoji: '💊',
      defaultAmount: '2',
      defaultUnit: '分钟',
    });

    await buttonByText(wrapper, '停用').trigger('click');
    await flushPromises();
    expect(api.remove).toHaveBeenCalledWith(1);

    await buttonByText(wrapper, '恢复').trigger('click');
    await flushPromises();
    expect(api.update).toHaveBeenCalledWith(2, { isActive: true });
  });
});
