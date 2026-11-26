/** 宝宝展示名：有昵称时「昵称（姓名）」，否则只展示姓名 */
export function formatBabyDisplayName(name: string, nickname?: string | null): string {
  const trimmedNickname = nickname?.trim();
  const trimmedName = name.trim();
  if (!trimmedNickname) return trimmedName;
  if (!trimmedName || trimmedNickname === trimmedName) return trimmedNickname;
  return `${trimmedNickname}（${trimmedName}）`;
}
