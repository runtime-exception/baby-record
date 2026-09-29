import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import FeedingRecordView from '@/views/record/FeedingRecordView.vue';

const mocks = vi.hoisted(() => ({
  listFoods: vi.fn(),
  listSupplements: vi.fn(),
  createFeeding: vi.fn(),
  createSupplement: vi.fn(),
  fetchDashboard: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/api/food', () => ({ foodApi: { list: mocks.listFoods } }));
vi.mock('@/api/supplement-config', () => ({
  supplementConfigApi: { list: mocks.listSupplements },
}));
vi.mock('@/api/feeding', () => ({ feedingApi: { create: mocks.createFeeding } }));
vi.mock('@/api/supplement', () => ({ supplementApi: { create: mocks.createSupplement } }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/stores/baby', () => ({
  useBabyStore: () => ({ currentBaby: { id: 7 } }),
}));
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ currentUser: { id: 9, name: '妈妈', role: 'MOTHER' } }),
}));
vi.mock('@/stores/dashboard', () => ({
  useDashboardStore: () => ({ fetch: mocks.fetchDashboard }),
}));

const ToggleStub = defineComponent({
  props: { value: Boolean },
  emits: ['update:value'],
  template: '<button aria-label="补剂添加" @click="$emit(\'update:value\', !value)">toggle</button>',
});

function mountView() {
  return mount(FeedingRecordView, {
    global: {
      stubs: {
        AppHeader: true,
        AppInput: true,
        AppToggle: ToggleStub,
        DateTimePicker: true,
        WheelPicker: true,
      },
    },
  });
}

const supplement = {
  id: 1,
  name: '维生素D',
  emoji: '☀️',
  defaultAmount: '1',
  defaultUnit: '滴',
  isActive: true,
  createdTime: '2026-09-27T08:00:00.000Z',
  updatedTime: '2026-09-27T08:00:00.000Z',
};

describe('feeding record orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listFoods.mockResolvedValue([{ id: 3, name: '米糊' }]);
    mocks.listSupplements.mockResolvedValue([supplement]);
    mocks.createFeeding.mockResolvedValue({ id: 11 });
    mocks.createSupplement.mockResolvedValue({ id: 12 });
    mocks.fetchDashboard.mockResolvedValue(undefined);
    mocks.push.mockResolvedValue(undefined);
  });

  it('does not allow recreating a saved feeding when dashboard refresh fails', async () => {
    mocks.fetchDashboard.mockRejectedValue(new Error('dashboard unavailable'));
    const wrapper = mountView();
    await flushPromises();

    await wrapper.get('button[aria-label="补剂添加"]').trigger('click');
    await wrapper.getComponent({ name: 'SupplementPickerGrid' }).get('button[aria-pressed="false"]').trigger('click');
    const save = wrapper.findAll('button').find((button) => button.text() === '保存记录');
    if (!save) throw new Error('save button missing');
    await save.trigger('click');
    await flushPromises();

    expect(mocks.createFeeding).toHaveBeenCalledTimes(1);
    expect(mocks.createSupplement).toHaveBeenCalledTimes(1);
    expect(mocks.push).toHaveBeenCalledWith('/');
    expect(save.attributes('disabled')).toBeDefined();
    await save.trigger('click');
    expect(mocks.createFeeding).toHaveBeenCalledTimes(1);
  });

  it('keeps food presets when the optional supplement config request fails', async () => {
    mocks.listSupplements.mockRejectedValue(new Error('supplements unavailable'));
    const wrapper = mountView();
    await flushPromises();

    await wrapper.get('[data-feeding-component="COMPLEMENTARY_FOOD"]').trigger('click');
    await flushPromises();
    const picker = wrapper.getComponent({ name: 'FoodPickerGrid' });
    expect(picker.props('foods')).toEqual([{ id: 3, name: '米糊' }]);
  });

  it('saves breast milk with food as a mixed record with both components', async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('[data-feeding-component="COMPLEMENTARY_FOOD"]').trigger('click');
    wrapper.getComponent({ name: 'FoodPickerGrid' }).vm.$emit('update:modelValue', [3]);
    await wrapper.findAll('button').find((button) => button.text() === '保存记录')!.trigger('click');
    await flushPromises();

    expect(mocks.createFeeding).toHaveBeenCalledWith(expect.objectContaining({
      feedingType: 'MIXED',
      components: ['BREAST_MILK', 'COMPLEMENTARY_FOOD'],
      foodIds: [3],
    }));
  });
});
