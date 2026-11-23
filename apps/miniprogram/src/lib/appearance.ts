export type ThemeMode = 'light' | 'dark' | 'auto';
export type UiTheme = 'ios' | 'material';
export interface Appearance { mode: ThemeMode; theme: UiTheme; senior: boolean }
const appearanceKey = 'baby-record:appearance';

export function getAppearance(): Appearance {
  const saved = wx.getStorageSync(appearanceKey) as Partial<Appearance> | undefined;
  return {
    mode: saved?.mode === 'light' || saved?.mode === 'dark' ? saved.mode : 'auto',
    theme: saved?.theme === 'material' ? 'material' : 'ios',
    senior: saved?.senior === true,
  };
}

export function setAppearance(changes: Partial<Appearance>) {
  wx.setStorageSync(appearanceKey, { ...getAppearance(), ...changes });
}

export function isDarkAppearance(appearance = getAppearance()) {
  return appearance.mode === 'dark' || (appearance.mode === 'auto' && wx.getAppBaseInfo?.().theme === 'dark');
}

export function applyAppearance(page: { setData(data: Record<string, unknown>): void }, surface: 'native' | 'tab' | 'detail' = 'native') {
  const appearance = getAppearance();
  const dark = isDarkAppearance(appearance);
  const colors = dark ? {
    bg: '#000000', card: '#1c1c1e', text: '#f2f2f7', muted: '#a1a1aa', input: '#252527', line: '#303033', accent: '#4086f4',
  } : {
    bg: appearance.theme === 'material' ? '#f4f7fc' : '#f2f2f7',
    card: '#ffffff', text: '#18181b', muted: '#66666f', input: '#f2f2f7', line: '#e5e5ea', accent: '#007aff',
  };
  const styles = Object.entries(colors).map(([name, value]) => '--' + name + ':' + value);
  styles.push('--font:' + (appearance.senior ? '36rpx' : '30rpx'));
  styles.push('--radius:' + (appearance.theme === 'material' ? '34rpx' : '46rpx'));
  styles.push('background:' + colors.bg);
  if (surface !== 'native') styles.push('--status-inset:' + (wx.getWindowInfo().statusBarHeight ?? 20) + 'px');
  page.setData({ appearanceStyle: styles.join(';'), appearance });
  if (surface === 'native') wx.setNavigationBarColor({ backgroundColor: colors.bg, frontColor: dark ? '#ffffff' : '#000000' });
  if (surface === 'tab') wx.setTabBarStyle({ backgroundColor: dark ? '#171717' : colors.card, color: colors.muted, selectedColor: colors.accent, borderStyle: dark ? 'black' : 'white' });
}
