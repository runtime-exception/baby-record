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

export function applyAppearance(page: { setData(data: Record<string, unknown>): void }, tab = false) {
  const appearance = getAppearance();
  const dark = appearance.mode === 'dark' || (appearance.mode === 'auto' && wx.getAppBaseInfo?.().theme === 'dark');
  const colors = dark ? {
    bg: '#101925', card: '#1b2737', text: '#edf3fc', muted: '#a7b5c9', input: '#253446', line: '#34455b', accent: '#69aaff',
  } : {
    bg: appearance.theme === 'material' ? '#f4f7fc' : '#f2f2f7',
    card: '#ffffff', text: '#182439', muted: '#64748b', input: '#f2f2f7', line: '#e6ebf2', accent: '#007aff',
  };
  const styles = Object.entries(colors).map(([name, value]) => '--' + name + ':' + value);
  styles.push('--font:' + (appearance.senior ? '36rpx' : '30rpx'));
  styles.push('--radius:' + (appearance.theme === 'material' ? '34rpx' : '46rpx'));
  styles.push('background:' + colors.bg);
  page.setData({ appearanceStyle: styles.join(';'), appearance });
  wx.setNavigationBarColor({ backgroundColor: colors.bg, frontColor: dark ? '#ffffff' : '#000000' });
  if (tab) wx.setTabBarStyle({ backgroundColor: colors.card, color: colors.muted, selectedColor: colors.accent, borderStyle: dark ? 'black' : 'white' });
}
