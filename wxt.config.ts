import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  manifest: {
    name: 'Ski Extension: Skip YouTube Ads with a Key',
    description:
      "Press one key to click YouTube's Skip button. No mouse needed. Free, open source, no tracking.",
    version: '0.1.0',
    permissions: ['storage'],
    host_permissions: [
      '*://www.youtube.com/*',
      '*://www.youtube-nocookie.com/*',
    ],
    browser_specific_settings: {
      gecko: {
        id: 'ski-extension@winterjackson.dev',
        strict_min_version: '109.0',
      },
    },
  },
  suppressWarnings: {
    firefoxDataCollection: true,
  },
});
