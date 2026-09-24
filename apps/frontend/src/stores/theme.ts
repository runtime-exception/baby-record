import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type UiTheme = 'ios' | 'material';

const THEME_KEY = 'baby-record:theme';
const UI_THEME_KEY = 'baby-record:ui-theme';
const SENIOR_MODE_KEY = 'baby-record:senior-mode';

export const useThemeStore = defineStore('theme', () => {
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(THEME_KEY)) as ThemeMode | null;
  const mode = ref<ThemeMode>(saved || 'auto');
  const savedUiTheme =
    typeof localStorage !== 'undefined' ? localStorage.getItem(UI_THEME_KEY) : null;
  const uiTheme = ref<UiTheme>(savedUiTheme === 'material' ? 'material' : 'ios');
  const seniorMode = ref(
    typeof localStorage !== 'undefined' && localStorage.getItem(SENIOR_MODE_KEY) === 'true',
  );
  const systemDark = ref(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  );

  const isDark = computed(
    () => mode.value === 'dark' || (mode.value === 'auto' && systemDark.value),
  );

  function apply() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('k-ios', uiTheme.value === 'ios');
    root.classList.toggle('k-material', uiTheme.value === 'material');
    root.classList.toggle('dark', isDark.value);
    root.classList.toggle('senior-mode', seniorMode.value);
    if (seniorMode.value) {
      root.dataset.density = 'senior';
    } else {
      delete root.dataset.density;
    }
  }

  function setMode(m: ThemeMode) {
    mode.value = m;
    localStorage.setItem(THEME_KEY, m);
    apply();
  }

  function setUiTheme(theme: UiTheme) {
    uiTheme.value = theme;
    localStorage.setItem(UI_THEME_KEY, theme);
    apply();
  }

  function setSeniorMode(enabled: boolean) {
    seniorMode.value = enabled;
    localStorage.setItem(SENIOR_MODE_KEY, String(enabled));
    apply();
  }

  // 监听系统主题变化（auto 模式下跟随）
  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      systemDark.value = e.matches;
      if (mode.value === 'auto') apply();
    });
  }

  watch(isDark, apply);
  watch(uiTheme, apply);

  return {
    mode,
    uiTheme,
    isDark,
    seniorMode,
    setMode,
    setUiTheme,
    setSeniorMode,
    apply,
  };
});
