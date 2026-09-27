import type { SupplementConfigVo } from '@baby-record/shared';

export const SUPPLEMENT_EMOJI_CHOICES = [
  '☀️', '🐟', '🦴', '🍊', '🫐', '🌿', '🧴', '🧪',
  '🍼', '🧠', '🦷', '🫀', '🩸', '🛡️', '💊',
] as const;

export function resolveSupplementEmoji(_name: string, emoji?: string | null): string {
  return emoji?.trim() || '💊';
}

export function applySupplementDefaults(config: SupplementConfigVo) {
  return {
    name: config.name,
    amount: config.defaultAmount,
    unit: config.defaultUnit,
  };
}
