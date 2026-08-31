import { Injectable, Logger } from '@nestjs/common';
import { Gender } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

/** 单一性别一份标准：数组索引 = 月龄（0–60） */
export interface PercentileSet {
  p3: number[];
  p50: number[];
  p97: number[];
}

interface StandardsData {
  sourceUrl: string;
  heightCm: { boys: PercentileSet; girls: PercentileSet };
  weightKg: { boys: PercentileSet; girls: PercentileSet };
}

export interface GrowthRefs {
  low: number;
  high: number;
}

const MAX_MONTHS = 60;
const MONTH_DAYS_MS = 30.4375 * 24 * 60 * 60 * 1000;

/**
 * WHO 儿童生长标准（0–60 月龄 P3/P50/P97）
 * 数据来源：apps/backend/src/config/growth-standards.json（scripts/build-growth-standards.mjs 生成）
 */
@Injectable()
export class GrowthStandardsService {
  private readonly logger = new Logger(GrowthStandardsService.name);
  private readonly data: StandardsData;

  constructor() {
    const path = join(__dirname, '../../config/growth-standards.json');
    this.data = JSON.parse(readFileSync(path, 'utf8')) as StandardsData;
    this.validate();
    this.logger.log('已加载 WHO 生长标准（身高/体重 × 男/女 × 0-60 月龄）');
  }

  get sourceUrl(): string {
    return this.data.sourceUrl;
  }

  /** 按月龄（可带小数，线性插值）取参考区间 { low: P3, high: P97 }；超出 0–60 月龄返回 null */
  findRefs(gender: Gender, metric: 'height' | 'weight', monthAge: number): GrowthRefs | null {
    const set = this.pick(gender, metric);
    if (!set || monthAge < 0 || monthAge > MAX_MONTHS) return null;
    const lower = Math.floor(monthAge);
    const upper = Math.min(lower + 1, MAX_MONTHS);
    const fraction = monthAge - lower;
    const interp = (arr: number[]) => arr[lower] + (arr[upper] - arr[lower]) * fraction;
    return { low: interp(set.p3), high: interp(set.p97) };
  }

  /** 实测值所处的区间百分比（0–100 截断）；低于低位记 0，高于高位记 100 */
  percentBetween(value: number, low: number, high: number): number {
    if (high <= low) return 50;
    const percent = ((value - low) / (high - low)) * 100;
    return Math.round(Math.min(100, Math.max(0, percent)));
  }

  /** 基于生日的精确月龄（含小数，按平均月长 30.4375 天） */
  monthAgeAt(birthday: Date, at: Date): number {
    return (at.getTime() - birthday.getTime()) / MONTH_DAYS_MS;
  }

  private pick(gender: Gender, metric: 'height' | 'weight'): PercentileSet | null {
    const table = metric === 'height' ? this.data.heightCm : this.data.weightKg;
    return gender === 'FEMALE' ? table.girls : table.boys;
  }

  private validate() {
    for (const gender of ['boys', 'girls'] as const) {
      for (const metric of ['heightCm', 'weightKg'] as const) {
        const set = this.data[metric][gender];
        for (const key of ['p3', 'p50', 'p97'] as const) {
          const arr = set[key];
          if (!Array.isArray(arr) || arr.length !== MAX_MONTHS + 1) {
            throw new Error(`生长标准 ${metric}.${gender}.${key} 长度非法: ${arr?.length}`);
          }
          for (const v of arr) {
            if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
              throw new Error(`生长标准 ${metric}.${gender}.${key} 数值非法: ${v}`);
            }
          }
        }
        for (let m = 0; m <= MAX_MONTHS; m++) {
          const { p3, p50, p97 } = set;
          if (!(p3[m] < p50[m] && p50[m] < p97[m])) {
            throw new Error(`生长标准 ${metric}.${gender} 月龄 ${m} 不单调`);
          }
        }
      }
    }
  }
}