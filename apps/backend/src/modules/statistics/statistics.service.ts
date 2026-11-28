import { Injectable } from '@nestjs/common';
import { Feeding, Diaper, Sleep, Supplement, Activity } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DateRangeUtil, RangeType } from '../../common/utils/date-range.util';
import { TimeUtil } from '../../common/utils/time.util';
import { StatsQueryDto } from '../../common/dto/stats-query.dto';
import { sleepMinutesInRange, sleepOverlappingRange } from '../sleep/sleep-rules';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 综合统计 */
  async overview(query: StatsQueryDto) {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const [feedings, diapers, sleeps, supplements, activities] = await Promise.all([
      this.prisma.feeding.findMany({ where: { babyId: query.babyId, feedingTime: { gte: start, lte: end } } }),
      this.prisma.diaper.findMany({ where: { babyId: query.babyId, changeTime: { gte: start, lte: end } } }),
      this.prisma.sleep.findMany({ where: sleepOverlappingRange(query.babyId, start, end) }),
      this.prisma.supplement.findMany({ where: { babyId: query.babyId, takeTime: { gte: start, lte: end } } }),
      this.prisma.activity.findMany({ where: { babyId: query.babyId, eventTime: { gte: start, lte: end } } }),
    ]);
    return {
      feeding: this.feedingStats(feedings),
      diaper: this.diaperStats(diapers),
      sleep: this.sleepStats(sleeps, start, end),
      supplement: this.supplementStats(supplements),
      activity: this.activityStats(activities),
    };
  }

  async feeding(query: StatsQueryDto) {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const list = await this.prisma.feeding.findMany({ where: { babyId: query.babyId, feedingTime: { gte: start, lte: end } } });
    return this.feedingStats(list);
  }

  async diaper(query: StatsQueryDto) {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const list = await this.prisma.diaper.findMany({ where: { babyId: query.babyId, changeTime: { gte: start, lte: end } } });
    return this.diaperStats(list);
  }

  async sleep(query: StatsQueryDto) {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const list = await this.prisma.sleep.findMany({ where: sleepOverlappingRange(query.babyId, start, end) });
    return this.sleepStats(list, start, end);
  }

  async supplement(query: StatsQueryDto) {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const list = await this.prisma.supplement.findMany({ where: { babyId: query.babyId, takeTime: { gte: start, lte: end } } });
    return this.supplementStats(list);
  }

  async activity(query: StatsQueryDto) {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const list = await this.prisma.activity.findMany({ where: { babyId: query.babyId, eventTime: { gte: start, lte: end } } });
    return this.activityStats(list);
  }

  // ============ 统计计算 ============

  feedingStats(list: Feeding[]) {
    const count = list.length;
    const totalAmount = list.reduce((s, f) => s + (f.amountMl || 0), 0);
    const avgAmount = count ? Math.round(totalAmount / count) : 0;
    let avgInterval = 0;
    if (count >= 2) {
      const sorted = [...list].sort((a, b) => a.feedingTime.getTime() - b.feedingTime.getTime());
      const spanMs = sorted[count - 1].feedingTime.getTime() - sorted[0].feedingTime.getTime();
      avgInterval = Math.round(spanMs / 60000 / (count - 1));
    }
    return {
      count,
      totalAmount,
      avgAmount,
      avgInterval,
      avgIntervalText: TimeUtil.minutesToText(avgInterval),
    };
  }

  diaperStats(list: Diaper[]) {
    let pee = 0;
    let poop = 0;
    for (const d of list) {
      if (d.type === 'PEE' || d.type === 'BOTH') pee++;
      if (d.type === 'POOP' || d.type === 'BOTH') poop++;
    }
    return { total: list.length, pee, poop };
  }

  sleepStats(list: Sleep[], start: Date, end: Date) {
    let total = 0;
    let daytime = 0;
    let night = 0;
    for (const s of list) {
      const dur = sleepMinutesInRange(s, start, end);
      total += dur;
      if (s.sleepType === 'DAYTIME') daytime += dur;
      else if (s.sleepType === 'NIGHT') night += dur;
    }
    const endedCount = list.filter((s) => s.endTime !== null).length;
    const avg = endedCount ? Math.round(total / endedCount) : 0;
    return {
      count: list.length,
      totalMinutes: total,
      totalText: TimeUtil.minutesToText(total),
      daytimeMinutes: daytime,
      daytimeText: TimeUtil.minutesToText(daytime),
      nightMinutes: night,
      nightText: TimeUtil.minutesToText(night),
      avgMinutes: avg,
      avgText: TimeUtil.minutesToText(avg),
    };
  }

  supplementStats(list: Supplement[]) {
    const map: Record<string, number> = {};
    for (const s of list) map[s.name] = (map[s.name] || 0) + 1;
    return {
      count: list.length,
      typeStats: Object.entries(map).map(([name, count]) => ({ name, count })),
    };
  }

  activityStats(list: Activity[]) {
    const map: Record<string, number> = {};
    for (const a of list) map[a.eventType] = (map[a.eventType] || 0) + 1;
    return {
      total: list.length,
      typeStats: Object.entries(map).map(([eventType, count]) => ({ eventType, count })),
    };
  }
}
