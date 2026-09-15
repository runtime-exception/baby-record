import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeUtil } from '../../common/utils/time.util';
import { AgeUtil } from '../../common/utils/age.util';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { FeedingType } from '@prisma/client';
import { WakeWindowService } from './wake-window.service';
import { FeedingGuideService, FeedingGuideConfig } from './feeding-guide.service';
import { FoodAllergyObservations, positiveSymptomLabels } from '../food-allergy/allergy-score';

export interface StatusCard {
  lastTime: string | null;
  minutesSince: number | null;
  text: string | null;
}

export const WAKE_WINDOW_SOURCE = 'https://health.choc.org/babies-and-sleep-the-ultimate-guide/';
export const FEEDING_GUIDE_SOURCE =
  'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/how-often-and-how-much-should-your-baby-eat.aspx';

/**
 * 首页仪表盘：三张状态卡片（距离上次 喂养/换纸尿裤/睡眠）
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wakeWindows: WakeWindowService,
    private readonly feedingGuides: FeedingGuideService,
  ) {}

  async overview(babyId: number) {
    const now = new Date();
    const [baby, lastFeeding, lastMilkFeeding, lastDiaper, lastSleep, latestTemperature, latestGrowth, allergyRecords] = await Promise.all([
      this.prisma.baby.findUnique({ where: { id: babyId }, select: { birthday: true } }),
      this.prisma.feeding.findFirst({
        where: { babyId, feedingTime: { lte: now } },
        orderBy: { feedingTime: 'desc' },
        select: { feedingTime: true, feedingType: true, amountMl: true },
      }),
      this.prisma.feeding.findFirst({
        where: {
          babyId,
          feedingTime: { lte: now },
          feedingType: { not: FeedingType.COMPLEMENTARY_FOOD },
        },
        orderBy: { feedingTime: 'desc' },
        select: { feedingTime: true, feedingType: true, amountMl: true },
      }),
      this.prisma.diaper.findFirst({ where: { babyId, changeTime: { lte: now } }, orderBy: { changeTime: 'desc' } }),
      this.prisma.sleep.findFirst({ where: { babyId, startTime: { lte: now } }, orderBy: { startTime: 'desc' } }),
      this.prisma.temperature.findFirst({ where: { babyId, measureTime: { lte: now } }, orderBy: { measureTime: 'desc' } }),
      this.prisma.growthRecord.findFirst({ where: { babyId }, orderBy: { measureTime: 'desc' } }),
      this.prisma.foodAllergyRecord.findMany({
        where: { babyId },
        orderBy: [{ exposureTime: 'desc' }, { id: 'desc' }],
        include: { food: true },
      }),
    ]);

    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    const ageMonths = AgeUtil.calc(baby.birthday, now).totalMonths;
    const window = this.wakeWindows.findByAgeMonths(ageMonths);
    const feedingGuide = this.feedingGuides.findByAgeMonths(ageMonths);

    return {
      feeding: this.card(lastFeeding?.feedingTime),
      diaper: this.card(lastDiaper?.changeTime),
      // 睡眠间隔起点：已结束取 endTime，进行中（endTime 为 null）回退取 startTime
      sleep: this.card(lastSleep ? (lastSleep.endTime ?? lastSleep.startTime) : null),
      wakePrediction: this.wakePrediction(lastSleep, ageMonths, window),
      feedingSuggestion: this.feedingSuggestion(lastMilkFeeding, ageMonths, feedingGuide),
      latestTemperature: latestTemperature
        ? { temperature: Number(latestTemperature.temperature), measureTime: latestTemperature.measureTime.toISOString() }
        : null,
      latestGrowth: latestGrowth
        ? {
            height: latestGrowth.height === null ? null : Number(latestGrowth.height),
            weight: latestGrowth.weight === null ? null : Number(latestGrowth.weight),
            measureTime: latestGrowth.measureTime.toISOString(),
          }
        : null,
      foodAllergySummary: this.foodAllergySummary(allergyRecords),
    };
  }

  private foodAllergySummary(
    records: {
      foodId: number;
      exposureTime: Date;
      finalConclusion: 'NOT_ALLERGIC' | 'POSSIBLE' | 'ALLERGIC';
      observations: unknown;
      food: { name: string };
    }[],
  ) {
    const latest = new Map<number, (typeof records)[number]>();
    for (const record of records) {
      if (!latest.has(record.foodId)) latest.set(record.foodId, record);
    }
    const result = { allergic: [], possible: [], notAllergic: [] } as {
      allergic: unknown[];
      possible: unknown[];
      notAllergic: unknown[];
    };
    for (const record of latest.values()) {
      const item = {
        foodId: record.foodId,
        foodName: record.food.name,
        conclusion: record.finalConclusion,
        symptoms: positiveSymptomLabels(record.observations as FoodAllergyObservations),
        exposureTime: record.exposureTime.toISOString(),
      };
      if (record.finalConclusion === 'ALLERGIC') result.allergic.push(item);
      else if (record.finalConclusion === 'POSSIBLE') result.possible.push(item);
      else result.notAllergic.push(item);
    }
    return result;
  }

  private feedingSuggestion(
    lastFeeding: { feedingTime: Date; feedingType: FeedingType; amountMl: number | null } | null,
    ageMonths: number,
    guide: FeedingGuideConfig,
  ) {
    if (!lastFeeding) return null;
    const recommendedNextFeedTime = new Date(
      lastFeeding.feedingTime.getTime() + guide.recommendedIntervalMinutes * 60_000,
    );
    return {
      lastFeedTime: lastFeeding.feedingTime.toISOString(),
      recommendedNextFeedTime: recommendedNextFeedTime.toISOString(),
      recommendedIntervalMinutes: guide.recommendedIntervalMinutes,
      intervalRangeText: `${TimeUtil.minutesToText(guide.minIntervalMinutes)}–${TimeUtil.minutesToText(guide.maxIntervalMinutes)}`,
      perFeedMinMl: guide.perFeedMinMl,
      perFeedMaxMl: guide.perFeedMaxMl,
      dailyAmountMl: guide.dailyAmountMl,
      feedingCount: guide.feedingCount,
      lastFeedingType: lastFeeding.feedingType,
      lastAmountMl: lastFeeding.amountMl,
      ageMonths,
      sourceUrl: FEEDING_GUIDE_SOURCE,
    };
  }

  private wakePrediction(
    lastSleep: { startTime: Date; endTime: Date | null } | null,
    ageMonths: number,
    window: { recommendedWakeMinutes: number; maxWakeMinutes: number },
  ) {
    const lastWakeTime = lastSleep?.endTime ?? null;
    const midpointMinutes = Math.round((window.recommendedWakeMinutes + window.maxWakeMinutes) / 2);
    return {
      isSleeping: Boolean(lastSleep && !lastSleep.endTime),
      lastWakeTime: lastWakeTime?.toISOString() ?? null,
      sleepWindowStart: lastWakeTime
        ? new Date(lastWakeTime.getTime() + window.recommendedWakeMinutes * 60_000).toISOString()
        : null,
      recommendedSleepTime: lastWakeTime
        ? new Date(lastWakeTime.getTime() + midpointMinutes * 60_000).toISOString()
        : null,
      maxAwakeUntil: lastWakeTime
        ? new Date(lastWakeTime.getTime() + window.maxWakeMinutes * 60_000).toISOString()
        : null,
      recommendedWakeMinutes: window.recommendedWakeMinutes,
      maxWakeMinutes: window.maxWakeMinutes,
      ageMonths,
      sourceUrl: WAKE_WINDOW_SOURCE,
    };
  }

  private card(time: Date | undefined | null): StatusCard {
    if (!time) {
      return { lastTime: null, minutesSince: null, text: null };
    }
    const minutes = TimeUtil.minutesBetween(time);
    return {
      lastTime: time.toISOString(),
      minutesSince: minutes,
      text: TimeUtil.minutesToText(minutes),
    };
  }
}
