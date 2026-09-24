import type { VitePWAOptions } from 'vite-plugin-pwa';

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  includeAssets: [
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/maskable-512.png',
  ],
  manifest: {
    name: '宝宝成长记录',
    short_name: '宝宝记录',
    description: '家庭内部使用的宝宝成长记录 App',
    lang: 'zh-CN',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f2f2f7',
    theme_color: '#f2f2f7',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/^\/api\//, /^\/docs/],
    runtimeCaching: [
      {
        urlPattern: /^\/api\//,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^\/docs/,
        handler: 'NetworkOnly',
      },
    ],
  },
};
