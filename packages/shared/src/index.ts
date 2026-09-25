/**
 * 前后端共享类型定义
 * 与后端 Prisma schema / DTO / VO 保持一致
 */

// ============ 枚举 ============
export type Gender = 'MALE' | 'FEMALE';
export type UserRole = 'DAD' | 'MOM' | 'GRANDPA_P' | 'GRANDMA_P' | 'GRANDMA_M' | 'GRANDPA_M';
export type FeedingType = 'BREAST_MILK' | 'FORMULA' | 'COMPLEMENTARY_FOOD' | 'MIXED';
export type DiaperType = 'PEE' | 'POOP' | 'BOTH';
export type SleepType = 'DAYTIME' | 'NIGHT';
export type AllergyConclusion = 'NOT_ALLERGIC' | 'POSSIBLE' | 'ALLERGIC';
export type ObservationState = 'YES' | 'NO' | 'UNOBSERVED';
export type FoodAllergySymptom =
  | 'hives'
  | 'facialSwelling'
  | 'immediateVomiting'
  | 'persistentCough'
  | 'breathingAbnormal'
  | 'repetitiveVomiting'
  | 'pallor'
  | 'lethargy'
  | 'eczemaWorsened'
  | 'delayedVomiting'
  | 'diarrhea';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  DAD: '爸爸',
  MOM: '妈妈',
  GRANDPA_P: '爷爷',
  GRANDMA_P: '奶奶',
  GRANDMA_M: '姥姥',
  GRANDPA_M: '姥爷',
};

export const FEEDING_TYPE_LABELS: Record<FeedingType, string> = {
  BREAST_MILK: '母乳',
  FORMULA: '奶粉',
  COMPLEMENTARY_FOOD: '辅食',
  MIXED: '混合',
};

export const ALLERGY_CONCLUSION_LABELS: Record<AllergyConclusion, string> = {
  NOT_ALLERGIC: '不过敏',
  POSSIBLE: '可能过敏',
  ALLERGIC: '过敏',
};

export const OBSERVATION_STATE_LABELS: Record<ObservationState, string> = {
  YES: '是',
  NO: '否',
  UNOBSERVED: '未观察',
};

export const ALLERGY_SYMPTOMS: {
  key: FoodAllergySymptom;
  label: string;
  window: '几分钟～2 小时' | '约 1～4 小时' | '数小时～3 天';
  score: number;
}[] = [
  { key: 'hives', label: '荨麻疹', window: '几分钟～2 小时', score: 4 },
  { key: 'facialSwelling', label: '嘴唇、眼睑或面部肿胀', window: '几分钟～2 小时', score: 8 },
  { key: 'immediateVomiting', label: '呕吐', window: '几分钟～2 小时', score: 4 },
  { key: 'persistentCough', label: '突然持续咳嗽', window: '几分钟～2 小时', score: 8 },
  { key: 'breathingAbnormal', label: '喘鸣或呼吸异常', window: '几分钟～2 小时', score: 10 },
  { key: 'repetitiveVomiting', label: '反复、大量呕吐', window: '约 1～4 小时', score: 6 },
  { key: 'pallor', label: '脸色苍白', window: '约 1～4 小时', score: 3 },
  { key: 'lethargy', label: '异常嗜睡或精神明显变差', window: '约 1～4 小时', score: 3 },
  { key: 'eczemaWorsened', label: '湿疹明显加重', window: '数小时～3 天', score: 1 },
  { key: 'delayedVomiting', label: '反复呕吐', window: '数小时～3 天', score: 2 },
  { key: 'diarrhea', label: '腹泻', window: '数小时～3 天', score: 1 },
];

export type FoodAllergyObservations = Record<FoodAllergySymptom, ObservationState>;

export interface AllergyScoreResult {
  score: number;
  conclusion: AllergyConclusion;
  urgent: boolean;
}

/** 产品风险提示规则，不是临床诊断量表。 */
export function scoreAllergyObservations(observations: FoodAllergyObservations): AllergyScoreResult {
  const score = ALLERGY_SYMPTOMS.reduce(
    (total, symptom) => total + (observations[symptom.key] === 'YES' ? symptom.score : 0),
    0,
  );
  const hasYes = ALLERGY_SYMPTOMS.some((symptom) => observations[symptom.key] === 'YES');
  const hasUnobserved = ALLERGY_SYMPTOMS.some((symptom) => observations[symptom.key] === 'UNOBSERVED');
  const fpiesRedFlag =
    observations.repetitiveVomiting === 'YES' &&
    (observations.pallor === 'YES' || observations.lethargy === 'YES');
  const urgent =
    observations.facialSwelling === 'YES' ||
    observations.persistentCough === 'YES' ||
    observations.breathingAbnormal === 'YES' ||
    fpiesRedFlag;
  const conclusion: AllergyConclusion =
    score >= 8 ? 'ALLERGIC' : hasYes || hasUnobserved ? 'POSSIBLE' : 'NOT_ALLERGIC';
  return { score, conclusion, urgent };
}

export const DIAPER_TYPE_LABELS: Record<DiaperType, string> = {
  PEE: '尿',
  POOP: '便便',
  BOTH: '尿+便',
};

export const SLEEP_TYPE_LABELS: Record<SleepType, string> = {
  DAYTIME: '白天',
  NIGHT: '夜间',
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: '男',
  FEMALE: '女',
};

export const ALL_USER_ROLES: UserRole[] = ['DAD', 'MOM', 'GRANDPA_P', 'GRANDMA_P', 'GRANDMA_M', 'GRANDPA_M'];
export const ALL_FEEDING_TYPES: FeedingType[] = ['BREAST_MILK', 'FORMULA', 'COMPLEMENTARY_FOOD', 'MIXED'];
export const ALL_DIAPER_TYPES: DiaperType[] = ['PEE', 'POOP', 'BOTH'];

// ============ 年龄 ============
export interface AgeInfo {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
  ageText: string;
  monthAgeText: string;
}

// ============ 实体 VO ============
export interface BabyVo {
  id: number;
  name: string;
  nickname: string | null;
  gender: Gender;
  birthday: string;
  birthWeight: number | null;
  birthHeight: number | null;
  headCircumference: number | null;
  birthHospital: string | null;
  remark: string | null;
  avatar: string | null;
  createdTime: string;
  updatedTime: string;
  age: AgeInfo;
}

export interface UserVo {
  id: number;
  name: string;
  role: UserRole;
  createdTime: string;
}

/** 聚合记录中携带的创建用户概要。 */
export interface RecordCreator {
  id: number;
  name: string;
  role: UserRole;
}

export interface FeedingVo {
  id: number;
  babyId: number;
  feedingTime: string;
  feedingType: FeedingType;
  amountMl: number | null;
  durationMinutes: number | null;
  remark: string | null;
  creatorId: number;
  creator?: RecordCreator;
  createdTime: string;
  updatedTime?: string;
  foods: FoodVo[];
}

export interface FoodVo {
  id: number;
  name: string;
  emoji: string | null;
  isActive: boolean;
  createdTime: string;
  updatedTime: string;
}

export interface FoodAllergyRecordVo {
  id: number;
  babyId: number;
  foodId: number;
  food: FoodVo;
  exposureTime: string;
  observations: FoodAllergyObservations;
  systemScore: number;
  systemConclusion: AllergyConclusion;
  finalConclusion: AllergyConclusion;
  urgent: boolean;
  positiveSymptoms: string[];
  remark: string | null;
  creatorId: number;
  creator?: RecordCreator;
  createdTime: string;
  updatedTime?: string;
}

export interface DiaperVo {
  id: number;
  babyId: number;
  changeTime: string;
  type: DiaperType;
  remark: string | null;
  creatorId: number;
  creator?: RecordCreator;
  createdTime: string;
  updatedTime?: string;
}

export interface SleepVo {
  id: number;
  babyId: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  sleepType: SleepType;
  ongoing: boolean;
  remark: string | null;
  creatorId: number;
  creator?: RecordCreator;
  createdTime: string;
  updatedTime?: string;
}

export interface SupplementVo {
  id: number;
  babyId: number;
  name: string;
  amount: string | null;
  unit: string | null;
  takeTime: string;
  remark: string | null;
  creatorId: number;
  creator?: RecordCreator;
  createdTime: string;
  updatedTime?: string;
}

export interface ActivityVo {
  id: number;
  babyId: number;
  eventType: string;
  eventTime: string;
  description: string | null;
  remark: string | null;
  creatorId: number;
  creator?: RecordCreator;
  createdTime: string;
  updatedTime?: string;
}

// ============ API 通用 ============
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  details?: unknown;
  timestamp?: string;
  path?: string;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============ Dashboard ============
export interface StatusCard {
  lastTime: string | null;
  minutesSince: number | null;
  text: string | null;
}

export interface DashboardData {
  feeding: StatusCard;
  diaper: StatusCard;
  sleep: StatusCard;
  wakePrediction: WakePrediction;
  feedingSuggestion: FeedingSuggestion | null;
  latestTemperature: Pick<TemperatureVo, 'temperature' | 'measureTime'> | null;
  /** 最新一次身高/体重测量（首页月龄旁展示） */
  latestGrowth: LatestGrowth | null;
  foodAllergySummary: FoodAllergySummary;
}

export interface FoodAllergySummaryItem {
  foodId: number;
  foodName: string;
  conclusion: AllergyConclusion;
  symptoms: string[];
  exposureTime: string;
}

export interface FoodAllergySummary {
  allergic: FoodAllergySummaryItem[];
  possible: FoodAllergySummaryItem[];
  notAllergic: FoodAllergySummaryItem[];
}

export interface WakePrediction {
  isSleeping: boolean;
  lastWakeTime: string | null;
  sleepWindowStart: string | null;
  recommendedSleepTime: string | null;
  maxAwakeUntil: string | null;
  recommendedWakeMinutes: number;
  maxWakeMinutes: number;
  ageMonths: number;
  sourceUrl: string;
}

/** 首页喂养建议：基于最近一次喂养时间与宝宝月龄推算 */
export interface FeedingSuggestion {
  lastFeedTime: string;
  recommendedNextFeedTime: string;
  recommendedIntervalMinutes: number;
  intervalRangeText: string;
  perFeedMinMl: number | null;
  perFeedMaxMl: number | null;
  dailyAmountMl: number | null;
  feedingCount: number;
  lastFeedingType: FeedingType;
  lastAmountMl: number | null;
  ageMonths: number;
  sourceUrl: string;
}

// ============ 时间间隔分析 ============
export interface IntervalResult {
  latest: { id: number; time: string } | null;
  previous: { id: number; time: string } | null;
  intervalMinutes: number | null;
  intervalText: string | null;
}

// ============ 统计 ============
export type RangeType = 'today' | '7d' | '30d' | 'custom';

export interface FeedingStats {
  count: number;
  totalAmount: number;
  avgAmount: number;
  avgInterval: number;
  avgIntervalText: string;
}

export interface DiaperStats {
  total: number;
  pee: number;
  poop: number;
}

export interface SleepStats {
  count: number;
  totalMinutes: number;
  totalText: string;
  daytimeMinutes: number;
  daytimeText: string;
  nightMinutes: number;
  nightText: string;
  avgMinutes: number;
  avgText: string;
}

export interface SupplementStats {
  count: number;
  typeStats: { name: string; count: number }[];
}

export interface ActivityStats {
  total: number;
  typeStats: { eventType: string; count: number }[];
}

export interface StatisticsOverview {
  feeding: FeedingStats;
  diaper: DiaperStats;
  sleep: SleepStats;
  supplement: SupplementStats;
  activity: ActivityStats;
}

// ============ 图表 ============
export interface ChartResult {
  xAxis: string[];
  series: { name: string; data: number[] }[];
}

// ============ 体温 ============
export interface TemperatureVo {
  id: number;
  babyId: number;
  temperature: number;
  measureTime: string;
  remark: string | null;
  creatorId: number;
  creator?: RecordCreator;
  createdTime: string;
  updatedTime?: string;
}

export type TempStatus = 'normal' | 'watch' | 'fever' | 'high';

/** 体温状态：正常<=37.0 / 关注37.0-37.3 / 发热37.3-37.9 / 高温>37.9 */
export function getTempStatus(t: number): TempStatus {
  if (t <= 37.0) return 'normal';
  if (t <= 37.3) return 'watch';
  if (t <= 37.9) return 'fever';
  return 'high';
}

export const TEMP_STATUS_LABEL: Record<TempStatus, string> = {
  normal: '正常',
  watch: '关注',
  fever: '发热',
  high: '高温',
};

// ============ 身高体重成长记录 ============
export interface GrowthRecordVo {
  id: number;
  babyId: number;
  /** 身高(cm)，可空（当次可只记体重） */
  height: number | null;
  /** 体重(kg)，可空（当次可只记身高） */
  weight: number | null;
  /** 头围(cm)，预留 */
  headCircumference: number | null;
  measureTime: string;
  remark: string | null;
  creatorId: number;
  creator?: RecordCreator;
  createdTime: string;
  updatedTime?: string;
}

/** 首页展示的最新一次成长测量摘要 */
export interface LatestGrowth {
  height: number | null;
  weight: number | null;
  measureTime: string | null;
}

export type GrowthMetric = 'height' | 'weight';

/** 趋势上的单个测量点（含该月龄参考区间与所处百分比） */
export interface GrowthTrendPoint {
  /** 测量日期 YYYY-MM-DD */
  date: string;
  /** 实测值（身高 cm / 体重 kg） */
  value: number;
  /** 测量时的精确月龄（含小数） */
  monthAge: number;
  /** 同龄参考低位 P3，超出标准覆盖范围时为 null */
  low: number | null;
  /** 同龄参考高位 P97，超出标准覆盖范围时为 null */
  high: number | null;
  /** 处于低位~高位区间的百分比 0–100；无参考区间时为 null；低于低位记 0、高于高位记 100 */
  percent: number | null;
}

/** 身高/体重趋势：三条线（实测 + 参考高位 P97 + 参考低位 P3） */
export interface GrowthTrendVo {
  metric: GrowthMetric;
  unit: 'cm' | 'kg';
  /** X 轴：测量日期（MM-DD，跨年含年份） */
  xAxis: string[];
  actual: (number | null)[];
  low: (number | null)[];
  high: (number | null)[];
  points: GrowthTrendPoint[];
  /** 最新一次测量；无记录时为 null */
  latest: GrowthTrendPoint | null;
  /** 参考标准来源（WHO） */
  sourceUrl: string;
}

// ============ 聚合记录 ============
export interface DailyRecords {
  feeding: FeedingVo[];
  diaper: DiaperVo[];
  sleep: SleepVo[];
  supplement: SupplementVo[];
  activity: ActivityVo[];
  temperature: TemperatureVo[];
  foodAllergy: FoodAllergyRecordVo[];
}

// ============ 记录人本地缓存 ============
export interface CurrentUser {
  id: number;
  name: string;
  role: UserRole;
}
