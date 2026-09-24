import { afterEach } from 'vitest';

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-density');
});
