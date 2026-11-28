import type {
  FeedingVo,
  DiaperVo,
  SleepVo,
  SupplementVo,
  ActivityVo,
  TemperatureVo,
  FoodAllergyRecordVo,
  GrowthRecordVo,
} from '@baby-record/shared';

/** 历史时间轴条目（含原始记录，供编辑/删除使用） */
export type RecordEntryType = 'feeding' | 'diaper' | 'sleep' | 'supplement' | 'activity' | 'temperature' | 'foodAllergy' | 'growth';

export interface TimelineEntry {
  type: RecordEntryType;
  raw: FeedingVo | DiaperVo | SleepVo | SupplementVo | ActivityVo | TemperatureVo | FoodAllergyRecordVo | GrowthRecordVo;
  time: string;
  icon: string;
  title: string;
  detail: string;
  colorClass: string;
}
