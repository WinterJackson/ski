import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  manifest: {
    name: 'Ski Extension: Skip YouTube Ads with a Key',
    description:
      "Press one key to click YouTube's Skip button. No mouse needed. Auto-skip on mobile. Free, open source, no tracking.",
    version: '1.0.0',
    permissions: ['storage'],
    host_permissions: [
      '*://www.youtube.com/*',
      '*://m.youtube.com/*',
      '*://www.youtube-nocookie.com/*',
    ],
    web_accessible_resources: [
      {
        resources: ['ski-main.js'],
        matches: [
          '*://www.youtube.com/*',
          '*://m.youtube.com/*',
          '*://www.youtube-nocookie.com/*',
        ],
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: 'ski-extension@winterjackson.dev',
        strict_min_version: '142.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
});
