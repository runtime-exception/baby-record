import { applyAppearance } from '../../lib/appearance';
import {
  ALLERGY_CONCLUSION_LABELS, ALLERGY_SYMPTOMS, DIAPER_TYPE_LABELS, FEEDING_TYPE_LABELS, OBSERVATION_STATE_LABELS,
  SLEEP_TYPE_LABELS, componentsForFeeding, exerciseDefaults, feedingTypeForComponents, scoreAllergyObservations,
  type FoodAllergyObservations, type FoodAllergySymptom, type ObservationState, type AllergyConclusion, type FeedingComponent,
  type FoodVo, type ExerciseConfigVo, type SupplementConfigVo, type SleepVo, type PaginatedResult, type GrowthRecordVo,
} from '@baby-record/shared';
import { api, babyContext, currentBabyId, explain, report } from '../../lib/api';
import { confirm, dateString, dateTime, timeString } from '../../lib/format';
import { recordKinds } from '../../lib/timeline';

const other = [
  { kind: 'supplement', label: '💊 补剂' }, { kind: 'foodAllergy', label: '🔎 辅食排敏' },
  { kind: 'activity', event: '运动', label: '🤸 运动' }, { kind: 'activity', event: '洗澡', label: '🛁 洗澡' },
  { kind: 'activity', event: '其他', label: '✨ 其他' }, { kind: 'growth', metric: 'height', label: '📏 身高' },
  { kind: 'growth', metric: 'weight', label: '⚖️ 体重' },
];
const timestamps: Record<string, string> = {
  feeding: 'feedingTime', temperature: 'measureTime', diaper: 'changeTime', sleep: 'startTime', supplement: 'takeTime',
  activity: 'eventTime', foodAllergy: 'exposureTime', growth: 'measureTime',
};
const blankObservations = () => Object.fromEntries(ALLERGY_SYMPTOMS.map((item) => [item.key, 'UNOBSERVED'])) as FoodAllergyObservations;
const labelOptions = (options: Record<string, string>) => Object.entries(options).map(([value, label]) => ({ value, label }));
function sleepTypeFor(value: Date) {
  const minutes = value.getHours() * 60 + value.getMinutes();
  return minutes >= 360 && minutes <= 1080 ? 'DAYTIME' : 'NIGHT';
}

type RecordValue = {
  babyId: number; endTime?: string; feedingType?: FeedingComponent | 'MIXED'; components?: FeedingComponent[];
  foods?: FoodVo[]; food?: FoodVo; foodId?: number; name?: string; exerciseTypes?: string[];
  observations?: FoodAllergyObservations; [key: string]: unknown;
};
type Option<T> = T & { selected: boolean };
const selectedOptions = <T, K>(items: T[], selected: K[], key: (item: T) => K): Option<T>[] =>
  items.map((item) => ({ ...item, selected: selected.includes(key(item)) }));

Page({
  onShow() { applyAppearance(this); },
  data: {
    kind: '', recordId: 0, babyId: 0, parent: '', ready: false, busy: false, error: '',
    date: dateString(), time: timeString(), today: dateString(), endDate: dateString(), endTime: timeString(),
    ongoing: null as SleepVo | null, sleepMode: 'quick', presets: [30, 60, 90, 120],
    typeOptions: [] as { value: string; label: string }[], type: '', isMilk: true, hasFood: false,
    feedingComponents: ['BREAST_MILK'] as FeedingComponent[], componentLabels: labelOptions(FEEDING_TYPE_LABELS).filter((item) => item.value !== 'MIXED'),
    amountMl: '120', durationMinutes: '', temperature: '36.5', remark: '', height: '', weight: '', headCircumference: '',
    originalFoodId: 0,
    foodIds: [] as number[], foods: [] as FoodVo[], foodOptions: [] as string[], foodId: 0, foodName: '',
    includeSupplements: false, supplementIds: [] as number[], supplements: [] as SupplementConfigVo[], name: '',
    supplementNames: [] as string[], amount: '', unit: '', eventType: '运动', metric: '',
    description: '', exercises: [] as ExerciseConfigVo[], exerciseTypes: [] as string[],
    observations: blankObservations(), symptoms: ALLERGY_SYMPTOMS,
    observationStates: labelOptions(OBSERVATION_STATE_LABELS), conclusionLabels: labelOptions(ALLERGY_CONCLUSION_LABELS),
    suggested: '', urgent: false, finalConclusion: '', other,
  },
  async onLoad(query: { kind?: string; id?: string }) {
    this.setData({ parent: query.kind === 'other' ? 'other' : '', recordId: Number(query.id) || 0 });
    await this.loadKind(query.kind === 'other' ? 'supplement' : query.kind || 'feeding');
  },
  async chooseOther(event: WxEvent) {
    if (this.data.busy || !this.data.ready) return;
    const option = other[Number(event.currentTarget.dataset.index)];
    this.setData({ eventType: option.event ?? '运动', metric: option.metric ?? '', remark: '', name: '', amount: '', unit: '',
      description: '', supplementIds: [], exerciseTypes: [], height: '', weight: '', headCircumference: '' });
    await this.loadKind(option.kind);
  },
  async loadKind(kind: string) {
    const definition = recordKinds.find((item) => item.kind === kind);
    if (!definition) return report(new Error('记录类型无效'));
    const id = this.data.recordId;
    const now = new Date();
    const start = new Date(now.getTime() - 3600_000);
    this.setData({
      kind, ready: false, error: '', date: dateString(now), time: timeString(now),
      typeOptions: kind === 'sleep' ? labelOptions(SLEEP_TYPE_LABELS) : kind === 'diaper' ? labelOptions(DIAPER_TYPE_LABELS) : [],
      type: kind === 'sleep' ? sleepTypeFor(now) : kind === 'diaper' ? 'BOTH' : '',
    });
    if (!this.data.parent) wx.setNavigationBarTitle({ title: (id ? '编辑' : '记录') + definition.label });
    try {
      const baby = (await babyContext())?.baby;
      if (!baby) return;
      const [record, foods, supplements, exercises, sleeps, latestGrowth] = await Promise.all([
        id ? api<RecordValue>(definition.path + '/' + id) : Promise.resolve(null),
        kind === 'feeding' || kind === 'foodAllergy' ? api<FoodVo[]>('/foods') : Promise.resolve([]),
        kind === 'feeding' || kind === 'supplement' ? api<SupplementConfigVo[]>('/supplement-configs') : Promise.resolve([]),
        kind === 'activity' ? api<ExerciseConfigVo[]>('/exercise-configs') : Promise.resolve([]),
        kind === 'sleep' && !id ? api<PaginatedResult<SleepVo>>('/sleeps', 'GET', { babyId: baby.id, ongoing: true, pageSize: 1 }) : Promise.resolve(null),
        kind === 'growth' && !id ? api<GrowthRecordVo | null>('/growths/latest', 'GET', { babyId: baby.id }) : Promise.resolve(null),
      ]);
      if (record && record.babyId !== baby.id) throw new Error('请切换到该记录所属的宝宝');
      for (const food of record?.foods ?? (record?.food ? [record.food] : [])) {
        if (!foods.some((item) => item.id === food.id)) foods.push(food);
      }
      const existingExerciseTypes = record?.exerciseTypes ?? [];
      this.setData({
        babyId: baby.id, foods, foodOptions: foods.map((item) => (item.emoji ? item.emoji + ' ' : '') + item.name),
        supplements, supplementNames: supplements.map((item) => item.name),
        exercises: [...exercises, ...existingExerciseTypes.filter((name) => !exercises.some((item) => item.name === name))
          .map((name, index) => ({ id: -index - 1, name, emoji: null, isActive: false, updatedTime: '', createdTime: '',
            defaultAmount: String(record?.amount ?? ''), defaultUnit: (record?.unit ?? '分钟') as ExerciseConfigVo['defaultUnit'] }))],
        ongoing: sleeps?.list?.[0] ?? null,
        height: this.data.metric !== 'weight' ? String(latestGrowth?.height ?? '') : '',
        weight: this.data.metric !== 'height' ? String(latestGrowth?.weight ?? '') : '',
        endDate: dateString(now), endTime: timeString(now),
      });
      if (kind === 'sleep' && !id) this.setData({ date: dateString(start), time: timeString(start) });
      if (record) this.fill(record);
      this.updateOptions();
      this.score();
      this.setData({ ready: true });
    } catch (error) { this.setData({ error: explain(error) }); }
  },
  retry() { void this.loadKind(this.data.kind); },
  fill(record: RecordValue) {
    const { kind } = this.data;
    const date = new Date(String(record[timestamps[kind]]));
    const editable = ['remark', 'amountMl', 'durationMinutes', 'temperature', 'height', 'weight', 'headCircumference', 'name',
      'amount', 'unit', 'eventType', 'description', 'finalConclusion'];
    const values = Object.fromEntries(editable.filter((key) => key in record).map((key) => [key, String(record[key] ?? '')]));
    // 喂养时长是喂养字段，睡眠时长由开始与结束时间计算。
    if (kind !== 'feeding') delete values.durationMinutes;
    const feedingComponents = componentsForFeeding({
      feedingType: record.feedingType ?? 'BREAST_MILK',
      components: record.components,
      foods: record.foods ?? [],
    });
    const end = record.endTime ? new Date(record.endTime) : null;
    this.setData({
      ...values, date: dateString(date), time: timeString(date),
      ...(kind === 'feeding' && { feedingComponents, foodIds: (record.foods ?? []).map((food) => food.id) }),
      ...(kind === 'diaper' && { type: String(record.type) }),
      ...(kind === 'sleep' && { type: String(record.sleepType), sleepMode: end ? 'custom' : 'ongoing',
        endDate: end ? dateString(end) : dateString(), endTime: end ? timeString(end) : timeString() }),
      ...(kind === 'activity' && { exerciseTypes: record.exerciseTypes ?? [] }),
      ...(kind === 'foodAllergy' && {
        foodId: record.foodId ?? 0, originalFoodId: record.foodId ?? 0, foodName: record.food?.name ?? '',
        observations: record.observations ?? blankObservations(),
      }),
    });
  },
  updateOptions() {
    const { feedingComponents, componentLabels, foods, foodIds, supplements, supplementIds, exercises, exerciseTypes } = this.data;
    this.setData({
      isMilk: feedingComponents.some((component) => component !== 'COMPLEMENTARY_FOOD'),
      hasFood: feedingComponents.includes('COMPLEMENTARY_FOOD'),
      componentChoices: selectedOptions(componentLabels, feedingComponents, (item) => item.value),
      foodChoices: selectedOptions(foods, foodIds, (item) => item.id),
      supplementChoices: selectedOptions(supplements, supplementIds, (item) => item.id),
      exerciseChoices: selectedOptions(exercises, exerciseTypes, (item) => item.name),
    });
  },
  field(event: WxInput) {
    const key = String(event.currentTarget.dataset.key);
    this.setData({ [key]: event.detail.value });
  },
  pickValue(event: WxEvent) {
    const { key, value } = event.currentTarget.dataset;
    this.setData({ [String(key)]: value });
  },
  toggleComponent(event: WxEvent) {
    const choice = event.currentTarget.dataset.value as FeedingComponent;
    const current = this.data.feedingComponents;
    const next = current.includes(choice) ? current.filter((item) => item !== choice) : [...current, choice];
    if (!next.length) return;
    this.setData({ feedingComponents: next });
    this.updateOptions();
  },
  toggleItem(event: WxEvent) {
    const { key, value } = event.currentTarget.dataset;
    if (key === 'exerciseTypes') {
      const choice = String(value);
      const current = this.data.exerciseTypes;
      const next = current.includes(choice) ? current.filter((item) => item !== choice) : [...current, choice];
      const items = next.map((name) => this.data.exercises.find((item) => item.name === name)).filter((item): item is ExerciseConfigVo => !!item);
      const preferred = exerciseDefaults(items);
      this.setData({ exerciseTypes: next, amount: preferred?.defaultAmount ?? '', unit: preferred?.defaultUnit ?? '' });
    } else if (key === 'foodIds' || key === 'supplementIds') {
      const id = Number(value);
      const current = this.data[key];
      this.setData({ [key]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id] });
    }
    this.updateOptions();
  },
  chooseFood(event: WxInput) {
    const food = this.data.foods[Number(event.detail.value)];
    if (food) this.setData({ foodId: food.id, foodName: food.name });
  },
  chooseSupplement(event: WxInput) {
    const supplement = this.data.supplements[Number(event.detail.value)];
    if (supplement) this.setData({ name: supplement.name, amount: supplement.defaultAmount ?? '', unit: supplement.defaultUnit ?? '' });
  },
  toggleSupplements() { this.setData({ includeSupplements: !this.data.includeSupplements }); },
  observe(event: WxEvent) {
    const { key, value } = event.currentTarget.dataset;
    this.setData({ observations: { ...this.data.observations, [key as FoodAllergySymptom]: value as ObservationState } });
    this.score();
  },
  score() {
    const score = scoreAllergyObservations(this.data.observations);
    this.setData({ suggested: ALLERGY_CONCLUSION_LABELS[score.conclusion], urgent: score.urgent });
  },
  async sleepAction(event: WxEvent) {
    const { babyId, type, ongoing, busy, ready } = this.data;
    if (busy || !ready || currentBabyId() !== babyId) return;
    const action = event.currentTarget.dataset.action;
    this.setData({ busy: true });
    try {
      if (action === 'start') await api('/sleeps/start', 'POST', { babyId, sleepType: type });
      else if (action === 'end' && ongoing) await api('/sleeps/' + ongoing.id + '/end', 'PATCH', {});
      else if (action === 'preset') {
        const minutes = Number(event.currentTarget.dataset.minutes);
        if (!await confirm('记录小睡', '保存刚结束的 ' + minutes + ' 分钟睡眠？')) return;
        const end = new Date();
        const start = new Date(end.getTime() - minutes * 60000);
        await api('/sleeps', 'POST', { babyId, startTime: start.toISOString(), endTime: end.toISOString() });
      }
      this.finish('睡眠记录已保存');
    } catch (error) { report(error); }
    finally { this.setData({ busy: false }); }
  },
  async submit() {
    const d = this.data;
    if (d.busy || !d.ready || currentBabyId() !== d.babyId) return;
    const definition = recordKinds.find((item) => item.kind === d.kind);
    if (!definition) return;
    this.setData({ busy: true });
    try {
      const time = dateTime(d.date, d.time);
      const payload: Record<string, unknown> = { [timestamps[d.kind]]: time, remark: d.remark.trim(), ...(!d.recordId && { babyId: d.babyId }) };
      if (d.kind === 'feeding') {
        if (d.hasFood && !d.foodIds.length) throw new Error('请选择至少一种辅食');
        Object.assign(payload, {
          feedingType: feedingTypeForComponents(d.feedingComponents), components: d.feedingComponents,
          amountMl: d.isMilk && d.amountMl ? Number(d.amountMl) : null, foodIds: d.hasFood ? d.foodIds : [],
          ...(d.recordId && { durationMinutes: d.durationMinutes ? Number(d.durationMinutes) : null }),
        });
      } else if (d.kind === 'diaper') payload.type = d.type;
      else if (d.kind === 'temperature') payload.temperature = Number(d.temperature);
      else if (d.kind === 'sleep') {
        payload.sleepType = d.type;
        if (d.sleepMode === 'custom') payload.endTime = dateTime(d.endDate, d.endTime);
      } else if (d.kind === 'supplement') {
        if (!d.name) throw new Error('请先选择补剂');
        Object.assign(payload, { name: d.name, amount: d.amount.trim(), unit: d.unit.trim() });
      } else if (d.kind === 'activity') {
        Object.assign(payload, { eventType: d.eventType, description: d.description.trim() });
        if (d.eventType === '运动') {
          if (!d.exerciseTypes.length || !d.amount || !d.unit) throw new Error('请选择运动并填写有效数量');
          Object.assign(payload, { exerciseTypes: d.exerciseTypes, amount: d.amount, unit: d.unit });
        }
      } else if (d.kind === 'growth') {
        if (!d.height && !d.weight && !d.headCircumference) throw new Error('请填写至少一项成长数据');
        Object.assign(payload, Object.fromEntries((['height', 'weight', 'headCircumference'] as const).flatMap<[string, number | null]>((key) => {
          const value = d[key];
          return value ? [[key, Number(value)]] : d.recordId ? [[key, null]] : [];
        })));
      } else if (d.kind === 'foodAllergy') {
        if (!d.foodId || !d.finalConclusion) throw new Error('请选择辅食和最终结论');
        if (scoreAllergyObservations(d.observations).conclusion !== d.finalConclusion as AllergyConclusion &&
          !await confirm('结论与系统建议不同', '系统建议为“' + d.suggested + '”，仍按你的结论保存吗？')) return;
        Object.assign(payload, {
          observations: d.observations, finalConclusion: d.finalConclusion,
          ...((!d.recordId || d.foodId !== d.originalFoodId) && { foodId: d.foodId }),
        });
      }
      const path = definition.path + (d.recordId ? '/' + d.recordId : '');
      await api(path, d.recordId ? 'PATCH' : 'POST', payload);
      let message = '记录已保存';
      if (d.kind === 'feeding' && !d.recordId && d.includeSupplements) {
        const results = await Promise.allSettled(d.supplements.filter((item) => d.supplementIds.includes(item.id)).map((item) =>
          api('/supplements', 'POST', { babyId: d.babyId, takeTime: time, name: item.name, amount: item.defaultAmount, unit: item.defaultUnit })));
        const failed = results.filter((item) => item.status === 'rejected').length;
        if (failed) await confirm('喂养已保存', failed + ' 条补剂记录未保存，可在「其他」中补录。');
        else if (results.length) message = '喂养和补剂已保存';
      }
      this.finish(message);
    } catch (error) { report(error); }
    finally { this.setData({ busy: false }); }
  },
  finish(message: string) {
    wx.showToast({ title: message, icon: 'success' });
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/history/index' }) });
  },
});
