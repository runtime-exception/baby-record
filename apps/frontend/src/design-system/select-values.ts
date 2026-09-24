export type SelectValue = string | number;

export function toggleSelection<T extends SelectValue>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
