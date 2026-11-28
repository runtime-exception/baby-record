/**
 * 年龄计算工具：根据生日计算 年龄/月龄/天数
 * 算法：满月（completed months）+ 余天（remaining days）
 */

export interface AgeInfo {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
  ageText: string; // 例: "0岁4个月2天"
  monthAgeText: string; // 例: "4个月2天"
}

export class AgeUtil {
  static calc(birthday: Date | string, now: Date = new Date()): AgeInfo {
    const birth = birthday instanceof Date ? birthday : new Date(birthday);
    // 仅比较日期（忽略时分秒）
    const birthDay = birth.getUTCDate();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const birthdayAt = (offset: number) => {
      const month = birth.getUTCMonth() + offset;
      const lastDay = new Date(Date.UTC(birth.getUTCFullYear(), month + 1, 0)).getUTCDate();
      return Date.UTC(birth.getUTCFullYear(), month, Math.min(birthDay, lastDay));
    };
    let totalMonths = (now.getFullYear() - birth.getUTCFullYear()) * 12 + now.getMonth() - birth.getUTCMonth();
    if (today < birthdayAt(totalMonths)) totalMonths--;
    totalMonths = Math.max(0, totalMonths);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const days = Math.max(0, (today - birthdayAt(totalMonths)) / 86400000);
    const totalDays = Math.max(0, (today - birthdayAt(0)) / 86400000);

    return {
      years,
      months,
      days,
      totalDays,
      totalMonths,
      ageText: `${years}岁${months}个月${days}天`,
      monthAgeText: `${totalMonths}个月${days}天`,
    };
  }
}
