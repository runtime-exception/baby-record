import { describe, expect, it } from 'vitest';
import { emojiForFoodName, resolveFoodEmoji, splitFoodEmoji } from '../food-emoji';

describe('food emoji mapping', () => {
  it('prefers an explicitly saved emoji over everything else', () => {
    expect(resolveFoodEmoji('高铁米粉', '🫐')).toBe('🫐');
    expect(splitFoodEmoji('高铁米粉', '🫐')).toEqual({
      emoji: '🫐',
      label: '高铁米粉',
    });
  });

  it('falls back to keyword inference when no emoji is saved', () => {
    expect(resolveFoodEmoji('高铁米粉', null)).toBe('🍚');
    expect(resolveFoodEmoji('高铁米粉', '   ')).toBe('🍚');
  });

  it('prefers the keyword icon over a non-food character in the stored name', () => {
    expect(splitFoodEmoji('🉑高铁米粉')).toEqual({
      emoji: '🍚',
      label: '高铁米粉',
    });
  });

  it('keeps an emoji already present when no keyword matches', () => {
    expect(splitFoodEmoji('🍮自制布丁')).toEqual({
      emoji: '🍮',
      label: '自制布丁',
    });
  });

  it('maps a plain name by keyword', () => {
    expect(splitFoodEmoji('土豆')).toEqual({ emoji: '🥔', label: '土豆' });
    expect(splitFoodEmoji('苹果')).toEqual({ emoji: '🍎', label: '苹果' });
  });

  it('falls back to a neutral icon for unknown names', () => {
    expect(splitFoodEmoji('自制神秘辅食')).toEqual({
      emoji: '🥣',
      label: '自制神秘辅食',
    });
    expect(emojiForFoodName('自制神秘辅食')).toBe('🥣');
  });

  it('matches the most specific keyword first', () => {
    expect(emojiForFoodName('花生酱（稀释）')).toBe('🥜');
    expect(emojiForFoodName('全熟鸡蛋')).toBe('🥚');
  });
});
