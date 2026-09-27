import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import ActivityRecordView from '@/views/record/ActivityRecordView.vue';

const mocks = vi.hoisted(() => ({
  listConfigs: vi.fn(),
  createSupplement: vi.fn(),
  latestGrowth: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/api/supplement-config', () => ({
  supplementConfigApi: { list: mocks.listConfigs },
}));
vi.mock('@/api/supplement', () => ({
  supplementApi: { create: mocks.createSupplement },
}));
vi.mock('@/api/growth', () => ({
  growthApi: { latest: mocks.latestGrowth, create: vi.fn() },
}));
vi.mock('@/api/activity', () => ({ activityApi: { create: vi.fn() } }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/stores/baby', () => ({
  useBabyStore: () => ({ currentBaby: { id: 7 } }),
}));
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ currentUser: { id: 9, name: '妈妈', role: 'MOTHER' } }),
}));
vi.mock('@/stores/dashboard', () => ({
  useDashboardStore: () => ({ fetch: vi.fn() }),
}));

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
];

function mountView() {
  return mount(ActivityRecordView, {
    global: {
      stubs: {
        AppHeader: true,
        AppInput: AppInputStub,
        DateTimePicker: true,
        TypeSegment: true,
        WheelPicker: true,
      },
    },
  });
}

describe('supplement record form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listConfigs.mockResolvedValue(configs);
    mocks.latestGrowth.mockResolvedValue(null);
    mocks.createSupplement.mockResolvedValue({ id: 11 });
  });

  it('fills defaults from the selected preset and submits per-record overrides', async () => {
    const wrapper = mountView();
    await flushPromises();

    await wrapper.get('button[aria-pressed="false"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('input[placeholder="剂量"]').element).toHaveProperty('value', '1');
    expect(wrapper.get('input[placeholder="单位"]').element).toHaveProperty('value', '滴');

    await wrapper.get('input[placeholder="剂量"]').setValue('2');
    await wrapper.get('input[placeholder="单位"]').setValue('粒');
    await wrapper.get('button[data-testid="save-record"]').trigger('click');

    expect(mocks.createSupplement).toHaveBeenCalledWith(expect.objectContaining({
      babyId: 7,
      creatorId: 9,
      name: '维生素D',
      amount: '2',
      unit: '粒',
    }));
  });

  it('shows the management hint and does not create without active presets', async () => {
    mocks.listConfigs.mockResolvedValue([]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('请先到「我的 - 补剂管理」添加');
    await wrapper.get('button[data-testid="save-record"]').trigger('click');
    expect(mocks.createSupplement).not.toHaveBeenCalled();
  });
});
