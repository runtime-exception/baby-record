export function validateCompletedSleepRange(
  startMs: number,
  endMs: number,
  nowMs: number,
): string | null {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return '结束时间必须晚于开始时间';
  }
  if (endMs > nowMs) return '结束时间不能晚于当前时间';
  return null;
}
