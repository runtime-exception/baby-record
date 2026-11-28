import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DateRangeUtil, RangeType } from '../../common/utils/date-range.util';
import { StatsQueryDto } from '../../common/dto/stats-query.dto';
import { sleepMinutesInRange, sleepOverlappingRange } from '../sleep/sleep-rules';

export interface ChartResult {
  xAxis: string[];
  series: { name: string; data: number[] }[];
}

/**
 * 数据可视化：返回 ECharts 直消费据
 */
@Injectable()
export class ChartService {
  constructor(private readonly prisma: PrismaService) {}

  /** 喂养趋势：每日 喂养次数 + 总奶量 */
  async feeding(query: StatsQueryDto): Promise<ChartResult> {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const list = await this.prisma.feeding.findMany({ where: { babyId: query.babyId, feedingTime: { gte: start, lte: end } } });
    const days = DateRangeUtil.eachDay(start, end);
    const countMap: Record<string, number> = {};
    const amountMap: Record<string, number> = {};
    for (const f of list) {
      const day = DateRangeUtil.toDateString(f.feedingTime);
      countMap[day] = (countMap[day] || 0) + 1;
      amountMap[day] = (amountMap[day] || 0) + (f.amountMl || 0);
    }
    return {
      xAxis: days,
      series: [
        { name: '喂养次数', data: days.map((d) => countMap[d] || 0) },
        { name: '总奶量(ml)', data: days.map((d) => amountMap[d] || 0) },
      ],
    };
  }

  /** 睡眠趋势：每日 总睡眠分钟 */
  async sleep(query: StatsQueryDto): Promise<ChartResult> {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const list = await this.prisma.sleep.findMany({ where: sleepOverlappingRange(query.babyId, start, end) });
    const days = DateRangeUtil.eachDay(start, end);
    const map: Record<string, number> = {};
    for (const s of list) {
      if (!s.endTime) continue;
      const first = new Date(Math.max(start.getTime(), s.startTime.getTime()));
      const last = new Date(Math.min(end.getTime(), s.endTime.getTime()));
      for (const day of DateRangeUtil.eachDay(first, last)) {
        const bounds = DateRangeUtil.day(day);
        map[day] = (map[day] || 0) + sleepMinutesInRange(s, bounds.start, bounds.end);
      }
    }
    return {
      xAxis: days,
      series: [{ name: '总睡眠(分钟)', data: days.map((d) => map[d] || 0) }],
    };
  }

  /** 纸尿裤趋势：每日 次数 */
  async diaper(query: StatsQueryDto): Promise<ChartResult> {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const list = await this.prisma.diaper.findMany({ where: { babyId: query.babyId, changeTime: { gte: start, lte: end } } });
    const days = DateRangeUtil.eachDay(start, end);
    const map: Record<string, number> = {};
    for (const d of list) {
      const day = DateRangeUtil.toDateString(d.changeTime);
      map[day] = (map[day] || 0) + 1;
    }
    return {
      xAxis: days,
      series: [{ name: '更换次数', data: days.map((day) => map[day] || 0) }],
    };
  }

  /** 补剂趋势：每日 次数 */
  async supplement(query: StatsQueryDto): Promise<ChartResult> {
    const { start, end } = DateRangeUtil.resolve(query.range as RangeType, query.startDate, query.endDate);
    const list = await this.prisma.supplement.findMany({ where: { babyId: query.babyId, takeTime: { gte: start, lte: end } } });
    const days = DateRangeUtil.eachDay(start, end);
    const map: Record<string, number> = {};
    for (const s of list) {
      const day = DateRangeUtil.toDateString(s.takeTime);
      map[day] = (map[day] || 0) + 1;
    }
    return {
      xAxis: days,
      series: [{ name: '补剂次数', data: days.map((day) => map[day] || 0) }],
    };
  }
}
