import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, ref } from 'vue';
import ExerciseRecordFields from '@/components/form/ExerciseRecordFields.vue';
import EditRecordModal from '@/components/EditRecordModal.vue';
import type { TimelineEntry } from '@/types/timeline';
import ActivityRecordView from '@/views/record/ActivityRecordView.vue';
import { type ExerciseUnit } from '@baby-record/shared';
const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), push: vi.fn() }));
vi.mock('@/api/exercise-config', () => ({ exerciseConfigApi: { list: mocks.list } }));
vi.mock('@/api/supplement-config', () => ({ supplementConfigApi: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock('@/api/activity', () => ({ activityApi: { create: mocks.create, update: mocks.update } }));
vi.mock('@/api/growth', () => ({ growthApi: { latest: vi.fn().mockResolvedValue(null) } }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/stores/baby', () => ({ useBabyStore: () => ({ currentBaby: { id: 7 } }) }));
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ currentUser: { id: 9 } }) }));
vi.mock('@/stores/theme', () => ({ useThemeStore: () => ({ seniorMode: false }) }));
vi.mock('@/stores/dashboard', () => ({ useDashboardStore: () => ({ fetch: vi.fn() }) }));
const input = defineComponent({ props: ['value', 'placeholder'], emits: ['update:value'], template: '<input :value="value" :placeholder="placeholder" @input="$emit(\'update:value\', $event.target.value)" />' });
const configs = [
  { name: '翻身', defaultAmount: '1', defaultUnit: '次' },
  { name: '抬头', defaultAmount: '1', defaultUnit: '分钟' },
  { name: '俯卧', defaultAmount: '10', defaultUnit: '秒' },
].map((c, i) => ({ ...c, id: i + 1, emoji: null, isActive: true, createdTime: '', updatedTime: '' }));
const stubs = { AppInput: input, AppHeader: true, DateTimePicker: true, WheelPicker: true };
function fields(initial = { names: [] as string[], amount: null as string | null, unit: null as ExerciseUnit | null }) {
  return mount(defineComponent({ components: { ExerciseRecordFields }, setup() { return { names: ref(initial.names), amount: ref(initial.amount), unit: ref(initial.unit) }; }, template: '<ExerciseRecordFields v-model:exercise-types="names" v-model:amount="amount" v-model:unit="unit" />' }), { global: { stubs } });
}
beforeEach(() => { vi.clearAllMocks(); mocks.list.mockResolvedValue(configs); mocks.create.mockResolvedValue({}); });
describe('exercise recording', () => {
  it('prefers first selected time unit and accepts a changed quantity', async () => {
    const w = fields(); await flushPromises();
    await w.get('[data-exercise="翻身"]').trigger('click'); expect(w.get('[data-testid="exercise-unit"]').text()).toBe('次');
    await w.get('[data-exercise="俯卧"]').trigger('click'); await w.get('[data-exercise="抬头"]').trigger('click');
    expect(w.get('[data-testid="exercise-unit"]').text()).toBe('秒');
    await w.get('input').setValue('20'); expect(w.vm.amount).toBe('20');
    await w.get('[data-exercise="俯卧"]').trigger('click'); expect(w.get('[data-testid="exercise-unit"]').text()).toBe('分钟');
    await w.get('[data-exercise="抬头"]').trigger('click'); expect(w.get('[data-testid="exercise-unit"]').text()).toBe('次');
  });
  it('preserves historical snapshots after configuration changes', async () => {
    const w = fields({ names: ['旧运动'], amount: '5', unit: '分钟' }); await flushPromises();
    expect(w.text()).toContain('旧运动'); expect(w.text()).toContain('历史项目');
    expect((w.get('input').element as HTMLInputElement).value).toBe('5');
  });
  it('saves multiple exercises in one record with manually entered quantity', async () => {
    const w = mount(ActivityRecordView, { global: { stubs } }); await flushPromises();
    await w.findAll('button').find(b => b.text().includes('运动'))!.trigger('click'); await flushPromises();
    await w.get('[data-exercise="翻身"]').trigger('click'); await w.get('[data-exercise="抬头"]').trigger('click');
    await w.get('input[placeholder="数量"]').setValue('3');
    await w.get('[data-testid="save-record"]').trigger('click'); await flushPromises();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ eventType: '运动', exerciseTypes: ['翻身', '抬头'], amount: '3', unit: '分钟', babyId: 7, creatorId: 9 }));
  });
});

it('edits an existing exercise record without resetting its quantity', async () => {
  const entry = { type: 'activity', time: '2026-10-01T08:00:00Z', icon: '🤸', title: '运动', detail: '', colorClass: '', raw: { id: 4, babyId: 7, eventType: '运动', exerciseTypes: ['翻身', '抬头'], amount: '7', unit: '分钟', eventTime: '2026-10-01T08:00:00Z', creatorId: 9, createdTime: '2026-10-01T08:00:00Z', description: null, remark: null } } as TimelineEntry;
  const w = mount(EditRecordModal, { props: { entry }, global: { stubs: { ...stubs, AppSheet: { template: '<div><slot /></div>' } } } });
  await flushPromises();
  expect((w.get('input[placeholder="数量"]').element as HTMLInputElement).value).toBe('7');
  await w.get('input[placeholder="数量"]').setValue('8');
  await w.findAll('button').find(b => b.text() === '保存修改')!.trigger('click'); await flushPromises();
  expect(mocks.update).toHaveBeenCalledWith(4, expect.objectContaining({ exerciseTypes: ['翻身', '抬头'], amount: '8', unit: '分钟' }));
});
