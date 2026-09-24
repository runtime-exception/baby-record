export type DateInputType = 'date' | 'datetime';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function dateInputToTimestamp(value: string, type: DateInputType) {
  if (!value) return null;

  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function timestampToDateInput(timestamp: number | null, type: DateInputType) {
  if (timestamp === null) return '';
  const date = new Date(timestamp);
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (type === 'date') return datePart;
  return `${datePart}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
