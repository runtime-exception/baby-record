import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeUtil } from '../../common/utils/time.util';

export interface IntervalResult {
  latest: { id: number; time: string } | null;
  previous: { id: number; time: string } | null;
  intervalMinutes: number | null;
  intervalText: string | null;
}

/**
 * 时间间隔分析：最近两次记录及间隔
 */
@Injectable()
export class IntervalService {
  constructor(private readonly prisma: PrismaService) {}

  /** 喂养间隔 */
  async feeding(babyId: string): Promise<IntervalResult> {
    const records = await this.prisma.feeding.findMany({
      where: { babyId },
      orderBy: { feedingTime: 'desc' },
      take: 2,
    });
    return this.build(records, (r) => r.feedingTime);
  }

  /** 纸尿裤更换间隔 */
  async diaper(babyId: string): Promise<IntervalResult> {
    const records = await this.prisma.diaper.findMany({
      where: { babyId },
      orderBy: { changeTime: 'desc' },
      take: 2,
    });
    return this.build(records, (r) => r.changeTime);
  }

  /** 睡眠间隔（按开始时间） */
  async sleep(babyId: string): Promise<IntervalResult> {
    const records = await this.prisma.sleep.findMany({
      where: { babyId },
      orderBy: { startTime: 'desc' },
      take: 2,
    });
    return this.build(records, (r) => r.startTime);
  }

  private build<T extends { id: number }>(records: T[], timeOf: (r: T) => Date): IntervalResult {
    const latest = records[0];
    const previous = records[1];
    const intervalMinutes = latest && previous ? TimeUtil.minutesDiff(timeOf(latest), timeOf(previous)) : null;
    return {
      latest: latest ? { id: latest.id, time: timeOf(latest).toISOString() } : null,
      previous: previous ? { id: previous.id, time: timeOf(previous).toISOString() } : null,
      intervalMinutes,
      intervalText: intervalMinutes !== null ? TimeUtil.minutesToText(intervalMinutes) : null,
    };
  }
}
