import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Tailwind and Konsta style pipeline', () => {
  it('loads the frontend style entry with Tailwind 4 imports', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');

    expect(css).toContain('@import "tailwindcss"');
    expect(css).toContain('konsta/vue/theme.css');
  });
});
