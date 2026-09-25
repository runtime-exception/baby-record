/**
 * 辅食图标的单一来源：优先按关键词匹配真正的食物图标，
 * 关键词匹配不到时才沿用名称里已有的 emoji，最后回退到通用餐具。
 * （历史数据里存在「🉑高铁米粉」这类非食物字符，不应直接当作图标。）
 */
const KEYWORD_EMOJI: Array<[RegExp, string]> = [
  [/高铁|米粉|米糊/, '🍚'],
  [/燕麦|麦片/, '🌾'],
  [/小米粥|粥/, '🥣'],
  [/面条|面/, '🍜'],
  [/土豆|马铃薯/, '🥔'],
  [/红薯|地瓜|紫薯/, '🍠'],
  [/山药/, '🫚'],
  [/鸡蛋|蛋黄|蛋/, '🥚'],
  [/猪肉/, '🥓'],
  [/牛肉/, '🥩'],
  [/鸡肉|鸡/, '🍗'],
  [/鱼/, '🐟'],
  [/虾/, '🦐'],
  [/豆腐|豆/, '🍢'],
  [/酸奶|奶/, '🥛'],
  [/花生/, '🥜'],
  [/坚果|核桃|杏仁|腰果/, '🌰'],
  [/芝麻/, '🫘'],
  [/南瓜/, '🎃'],
  [/胡萝卜|萝卜/, '🥕'],
  [/西兰花/, '🥦'],
  [/菠菜|青菜|蔬菜|油菜/, '🥬'],
  [/苹果/, '🍎'],
  [/香蕉/, '🍌'],
  [/梨/, '🍐'],
  [/牛油果|鳄梨/, '🥑'],
  [/玉米/, '🌽'],
  [/番茄|西红柿/, '🍅'],
  [/猕猴桃|奇异果/, '🥝'],
  [/葡萄/, '🍇'],
  [/西瓜/, '🍉'],
  [/橙|橘子|柑橘/, '🍊'],
];

const FALLBACK_EMOJI = '🥣';

/** 新增/编辑辅食时可选的图标；顺序按常见程度排列。 */
export const FOOD_EMOJI_CHOICES = [
  '🍚', '🌾', '🥣', '🍜', '🥔', '🍠', '🫚', '🥚',
  '🥓', '🥩', '🍗', '🐟', '🦐', '🍢', '🥛', '🥜',
  '🌰', '🫘', '🎃', '🥕', '🥦', '🥬', '🌽', '🍅',
  '🍎', '🍌', '🍐', '🥑', '🥝', '🍇', '🍉', '🍊',
  '🫐', '🍓', '🥭', '🍑',
];

const LEADING_EMOJI =
  /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u;

export function emojiForFoodName(name: string) {
  const trimmed = name.trim();
  const matched = KEYWORD_EMOJI.find(([pattern]) => pattern.test(trimmed));
  return matched ? matched[1] : FALLBACK_EMOJI;
}

/**
 * 解析一个辅食应展示的图标：用户显式保存的 emoji 优先，
 * 其次是名称里自带的 emoji，最后按关键词推断并回退到通用餐具。
 */
export function resolveFoodEmoji(name: string, emoji?: string | null) {
  const stored = emoji?.trim();
  if (stored) return stored;

  const trimmed = name.trim();
  const leading = trimmed.match(LEADING_EMOJI);
  const label = leading
    ? trimmed.slice(leading[0].length).trim() || trimmed
    : trimmed;

  const keywordEmoji = KEYWORD_EMOJI.find(([pattern]) => pattern.test(label));
  if (keywordEmoji) return keywordEmoji[1];
  if (leading) return leading[1];
  return FALLBACK_EMOJI;
}

/**
 * 把名称拆成 emoji 与纯文本两部分，保证列表和卡片里 emoji 与文字对齐。
 * 名称里原本带的 emoji 一律从文字部分剥离，避免重复展示。
 */
export function splitFoodEmoji(name: string, emoji?: string | null) {
  const trimmed = name.trim();
  const leading = trimmed.match(LEADING_EMOJI);
  const label = leading
    ? trimmed.slice(leading[0].length).trim() || trimmed
    : trimmed;
  return { emoji: resolveFoodEmoji(trimmed, emoji), label };
}
