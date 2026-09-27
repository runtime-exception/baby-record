import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import SupplementManagementView from '@/views/SupplementManagementView.vue';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/api/supplement-config', () => ({ supplementConfigApi: api }));

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
    name: '维生素D',
    emoji: '☀️',
    defaultAmount: '1',
    defaultUnit: '滴',
    isActive: true,
    createdTime: '2026-09-27T08:00:00.000Z',
    updatedTime: '2026-09-27T08:00:00.000Z',
  },
  {
    id: 2,
    name: 'DHA',
    emoji: '🐟',
    defaultAmount: '1',
    defaultUnit: '粒',
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

describe('supplement management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue(configs);
    api.create.mockResolvedValue(configs[0]);
    api.update.mockResolvedValue(configs[0]);
    api.remove.mockResolvedValue(undefined);
  });

  it('creates a configuration with name, emoji, amount and unit', async () => {
    const wrapper = mount(SupplementManagementView, {
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

    await wrapper.get('input[placeholder="如：维生素D"]').setValue('乳铁蛋白');
    await wrapper.get('input[placeholder="默认剂量"]').setValue('2');
    await wrapper.get('input[placeholder="默认单位"]').setValue('袋');
    await wrapper.get('button[aria-label="图标 🐟"]').trigger('click');
    await buttonByText(wrapper, '添加').trigger('click');

    expect(api.create).toHaveBeenCalledWith({
      name: '乳铁蛋白',
      emoji: '🐟',
      defaultAmount: '2',
      defaultUnit: '袋',
    });
  });

  it('edits, disables and restores configurations', async () => {
    const wrapper = mount(SupplementManagementView, {
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
    await wrapper.get('input[placeholder="补剂名称"]').setValue('维生素D3');
    await wrapper.get('input[placeholder="本配置默认剂量"]').setValue('2');
    await wrapper.get('input[placeholder="本配置默认单位"]').setValue('滴');
    const emojiButtons = wrapper.findAll('button[aria-label="图标 💊"]');
    await emojiButtons[emojiButtons.length - 1].trigger('click');
    await buttonByText(wrapper, '保存').trigger('click');
    await flushPromises();

    expect(api.update).toHaveBeenCalledWith(1, {
      name: '维生素D3',
      emoji: '💊',
      defaultAmount: '2',
      defaultUnit: '滴',
    });

    await buttonByText(wrapper, '停用').trigger('click');
    await flushPromises();
    expect(api.remove).toHaveBeenCalledWith(1);

    await buttonByText(wrapper, '恢复').trigger('click');
    await flushPromises();
    expect(api.update).toHaveBeenCalledWith(2, { isActive: true });
  });
});
