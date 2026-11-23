export function dateString(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, '0')).join('-');
}

export function timeString(value: string | Date = new Date()) {
  const date = new Date(value);
  return [date.getHours(), date.getMinutes()].map((part) => String(part).padStart(2, '0')).join(':');
}

export function dateTime(date: string, time: string) {
  return new Date(date + 'T' + time + ':00').toISOString();
}

export function confirm(title: string, content: string) {
  return new Promise<boolean>((resolve) => wx.showModal({
    title, content, success: (res) => resolve(res.confirm), fail: () => resolve(false),
  }));
}

export function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return (hours ? hours + '小时' : '') + (remaining || !hours ? remaining + '分钟' : '');
}
