import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../enums/error-code.enum';

/**
 * 日期范围工具：解析 today / 7d / 30d / custom 与单日
 */
export type RangeType = 'today' | '7d' | '30d' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export class DateRangeUtil {
  private static parse(value: string): Date {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!parts) return new Date(value);
    const local = new Date(0);
    local.setFullYear(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    local.setHours(0, 0, 0, 0);
    return local;
  }
  /** 根据 range 类型解析范围 */
  static resolve(range: RangeType, startDate?: string, endDate?: string): DateRange {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    let start: Date;

    switch (range) {
      case 'today':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        break;
      case '7d':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6, 0, 0, 0, 0);
        break;
      case '30d':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29, 0, 0, 0, 0);
        break;
      case 'custom':
        if (!startDate || !endDate) {
          throw new BusinessException(ErrorCode.PARAM_MISSING, 'custom 范围需提供 startDate 与 endDate');
        }
        start = this.parse(startDate);
        start.setHours(0, 0, 0, 0);
        const customEnd = this.parse(endDate);
        customEnd.setHours(23, 59, 59, 999);
        return { start, end: customEnd };
      default:
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    }
    return { start, end };
  }

  /** 某一整天的范围（date: YYYY-MM-DD） */
  static day(date: string): DateRange {
    const d = this.parse(date);
    return {
      start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
      end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
    };
  }

  /** 范围内逐日日期数组（YYYY-MM-DD） */
  static eachDay(start: Date, end: Date): string[] {
    const days: string[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cur.getTime() <= last.getTime()) {
      days.push(this.toDateString(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }

  static toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
