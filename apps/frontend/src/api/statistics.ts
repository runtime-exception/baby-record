import { http } from '@/utils/request';
import type {
  RangeType,
  StatisticsOverview,
  FeedingStats,
  DiaperStats,
  SleepStats,
  SupplementStats,
  ActivityStats,
} from '@baby-record/shared';

export interface StatsParams {
  babyId: string;
  range?: RangeType;
  startDate?: string;
  endDate?: string;
}

export const statisticsApi = {
  overview: (params: StatsParams) => http.get<StatisticsOverview>('/statistics/overview', params),
  feeding: (params: StatsParams) => http.get<FeedingStats>('/statistics/feeding', params),
  diaper: (params: StatsParams) => http.get<DiaperStats>('/statistics/diaper', params),
  sleep: (params: StatsParams) => http.get<SleepStats>('/statistics/sleep', params),
  supplement: (params: StatsParams) => http.get<SupplementStats>('/statistics/supplement', params),
  activity: (params: StatsParams) => http.get<ActivityStats>('/statistics/activity', params),
};
