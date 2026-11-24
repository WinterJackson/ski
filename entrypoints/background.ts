/**
 * Background service worker.
 *
 * Responsibilities:
 * 1. First-run onboarding: open options page on install
 * 2. Badge management: show "ON" badge when auto-skip is enabled
 */

export default defineBackground(() => {
  // ── First-run: open options page on install ──
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      browser.runtime.openOptionsPage();
    }
  });

  // ── Badge: show "ON" when auto-skip is active ──

  /**
   * Get the badge API — browser.action (MV3) or browserAction (MV2).
   * WXT's browser polyfill may not alias these, so we check both.
   */
  function getBadgeApi(): typeof browser.action | null {
    if (typeof browser.action !== 'undefined') return browser.action;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacy = (browser as any).browserAction;
    if (typeof legacy !== 'undefined') return legacy;
    return null;
  }

  async function updateBadge(): Promise<void> {
    const api = getBadgeApi();
    if (!api) return;

    try {
      const result = await browser.storage.sync.get({ enabled: true, autoSkip: false });
      if (!result.enabled) {
        await api.setBadgeText({ text: 'OFF' });
        await api.setBadgeBackgroundColor({ color: '#8e8e93' });
      } else if (result.autoSkip) {
        await api.setBadgeText({ text: 'ON' });
        await api.setBadgeBackgroundColor({ color: '#30d158' });
      } else {
        await api.setBadgeText({ text: '' });
      }
    } catch {
      // Non-critical — extension works without badge
    }
  }

  // Set initial badge state
  updateBadge();

  // Update badge when settings change
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && ('enabled' in changes || 'autoSkip' in changes)) {
      updateBadge();
    }
  });
});

