import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useThemeStore } from '../theme';

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('defaults to the iOS UI theme and persists manual changes', () => {
    const store = useThemeStore();

    expect(store.uiTheme).toBe('ios');

    store.setUiTheme('material');

    expect(store.uiTheme).toBe('material');
    expect(localStorage.getItem('baby-record:ui-theme')).toBe('material');
  });

  it('applies UI theme, dark mode, and senior density to the document root', () => {
    const store = useThemeStore();

    store.setUiTheme('material');
    store.setMode('dark');
    store.setSeniorMode(true);

    expect(document.documentElement.classList.contains('k-material')).toBe(true);
    expect(document.documentElement.classList.contains('k-ios')).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.density).toBe('senior');
  });
});
