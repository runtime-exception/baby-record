import { describe, expect, it } from 'vitest';
import { pwaOptions } from '../../../pwa.config';

describe('PWA configuration', () => {
  it('installs as a standalone app with required icons', () => {
    if (!pwaOptions.manifest) throw new Error('manifest is required');

    expect(pwaOptions.manifest.display).toBe('standalone');
    expect(pwaOptions.manifest.start_url).toBe('/');
    expect(pwaOptions.manifest.icons?.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512', '512x512']),
    );
  });

  it('never serves API requests from the application cache', () => {
    expect(pwaOptions.workbox?.navigateFallbackDenylist).toEqual([
      /^\/api\//,
      /^\/docs/,
    ]);
    expect(JSON.stringify(pwaOptions.workbox?.runtimeCaching)).toContain('NetworkOnly');
  });
});
