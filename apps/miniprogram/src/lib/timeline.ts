import { ALLERGY_CONCLUSION_LABELS, DIAPER_TYPE_LABELS, FEEDING_TYPE_LABELS, SLEEP_TYPE_LABELS, USER_ROLE_LABELS, componentsForFeeding, type DailyRecords, type GrowthRecordVo } from '@baby-record/shared';
import { dateString, timeString } from './format';

export const recordKinds = [
  { kind: 'feeding', label: '喂养', icon: '🍼', path: '/feedings' },
  { kind: 'temperature', label: '体温', icon: '🌡️', path: '/temperatures' },
  { kind: 'diaper', label: '纸尿裤', icon: '🧷', path: '/diapers' },
  { kind: 'sleep', label: '睡眠', icon: '🌙', path: '/sleeps' },
  { kind: 'supplement', label: '补剂', icon: '💊', path: '/supplements' },
  { kind: 'activity', label: '活动', icon: '🤸', path: '/activities' },
  { kind: 'foodAllergy', label: '辅食排敏', icon: '🔎', path: '/food-allergies' },
  { kind: 'growth', label: '成长', icon: '📏', path: '/growths' },
] as const;
export type RecordKind = typeof recordKinds[number]['kind'];

export function timeline(records: DailyRecords, growth: GrowthRecordVo[] = []) {
  const rows = [
    ...records.feeding.map((r) => ({ r, kind: 'feeding', time: r.feedingTime, label: '喂养', detail: [componentsForFeeding(r).map((item) => FEEDING_TYPE_LABELS[item]).join('＋'), r.amountMl && r.amountMl + ' ml', r.foods.map((food) => food.name).join('、')].filter(Boolean).join(' · ') })),
    ...records.temperature.map((r) => ({ r, kind: 'temperature', time: r.measureTime, label: '体温', detail: r.temperature + ' ℃' })),
    ...records.diaper.map((r) => ({ r, kind: 'diaper', time: r.changeTime, label: DIAPER_TYPE_LABELS[r.type], detail: '' })),
    ...records.sleep.map((r) => ({ r, kind: 'sleep', time: r.startTime, label: SLEEP_TYPE_LABELS[r.sleepType], detail: r.ongoing ? '进行中' : (r.durationMinutes ?? 0) + ' 分钟' })),
    ...records.supplement.map((r) => ({ r, kind: 'supplement', time: r.takeTime, label: r.name, detail: (r.amount ?? '') + (r.unit ?? '') })),
    ...records.activity.map((r) => ({ r, kind: 'activity', time: r.eventTime, label: r.eventType, detail: [r.exerciseTypes.join('、'), (r.amount ?? '') + (r.unit ?? ''), r.description].filter(Boolean).join(' · ') })),
    ...records.foodAllergy.map((r) => ({ r, kind: 'foodAllergy', time: r.exposureTime, label: r.food.name, detail: ALLERGY_CONCLUSION_LABELS[r.finalConclusion] })),
    ...growth.map((r) => ({ r, kind: 'growth', time: r.measureTime, label: '成长测量', detail: [r.height && r.height + ' cm', r.weight && r.weight + ' kg', r.headCircumference && r.headCircumference + ' cm 头围'].filter(Boolean).join(' · ') })),
  ];
  return rows.sort((a, b) => Number(new Date(b.time)) - Number(new Date(a.time))).map(({ r, kind, time, label, detail }) => ({
    key: kind + '-' + r.id, id: r.id, kind, date: dateString(new Date(time)), time: timeString(time), label, detail,
    icon: recordKinds.find((item) => item.kind === kind)?.icon ?? '',
    creator: r.creator ? r.creator.name + ' · ' + USER_ROLE_LABELS[r.creator.role] : '',
    remark: r.remark ?? '',
  }));
}
export type TimelineItem = ReturnType<typeof timeline>[number];

export function openRecord(kind: string, id?: number) {
  wx.navigateTo({ url: '/pages/record/index?kind=' + encodeURIComponent(kind) + (id ? '&id=' + id : '') });
}
