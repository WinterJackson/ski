/**
 * Content script entry point.
 * Wires together the detector, hotkey, observer, and toast modules.
 *
 * Runs on YouTube pages. Attaches one capture-phase keydown listener.
 * Reads settings from storage and updates them live when they change.
 */

import { findSkipButton, clickSkipButton, isAdShowing, loadLearnedSelectors } from '../src/content/detector';
import { shouldTriggerSkip } from '../src/content/hotkey';
import { onYouTubeNavigate, startAutoSkip, stopAutoSkip } from '../src/content/observer';
import { showToast } from '../src/content/toast';
import {
  loadSettings,
  recordSkip,
  type SkiSettings,
  DEFAULT_SETTINGS,
} from '../src/shared/settings';

export default defineContentScript({
  matches: [
    '*://www.youtube.com/*',
    '*://www.youtube-nocookie.com/*',
  ],
  allFrames: true,
  runAt: 'document_idle',

  async main() {
    console.debug('[Ski] Content script loaded');

    // ── Inject main-world helper script ──
    // Runs in YouTube's JavaScript context to access internal APIs.
    // The content script communicates with it via CustomEvent.
    try {
      const script = document.createElement('script');
      script.src = browser.runtime.getURL('/ski-main.js' as '/options.html');
      (document.head ?? document.documentElement).appendChild(script);
      script.remove();
    } catch {
      // Non-critical — other skip strategies still work
    }

    // Load initial settings and learned selectors in parallel
    const [settings_loaded] = await Promise.all([
      loadSettings(),
      loadLearnedSelectors(),
    ]);
    let settings: SkiSettings = settings_loaded;

    // ── Video title capture (for opt-in history tracking) ──
    function getVideoTitle(): string | undefined {
      if (!settings.trackHistory) return undefined;

      // Method 1: document.title is the most reliable across all YouTube layouts
      const pageTitle = document.title;
      if (pageTitle && pageTitle !== 'YouTube') {
        return pageTitle.replace(/ - YouTube$/, '').trim() || undefined;
      }

      // Method 2: DOM element fallback for edge cases
      const titleEl = document.querySelector(
        'h1.ytd-watch-metadata yt-formatted-string, #info h1 yt-formatted-string, h1.ytd-video-primary-info-renderer'
      );
      if (titleEl?.textContent) return titleEl.textContent.trim();

      return 'Unknown video';
    }

    // ── Shared skip feedback handler ──
    function onSkipSuccess(method: 'manual' | 'auto'): void {
      if (settings.showToast) {
        // Wait until ad is actually gone before showing toast
        let checks = 0;
        const checkInterval = setInterval(() => {
          checks++;
          if (!isAdShowing()) {
            clearInterval(checkInterval);
            try { showToast(); } catch { /* non-critical */ }
          } else if (checks > 20) {
            clearInterval(checkInterval);
            try { showToast('Attempting to skip...'); } catch { /* non-critical */ }
          }
        }, 200);
      }
      recordSkip(method, getVideoTitle());
      console.debug(`[Ski] Ad skipped (${method})`);
    }

    // --- Keydown handler (capture phase) ---
    function onKeyDown(event: KeyboardEvent): void {
      if (!shouldTriggerSkip(event, settings)) return;

      const button = findSkipButton();
      if (!button) return;

      // Skip the ad
      event.preventDefault();
      event.stopPropagation();
      clickSkipButton(button);
      onSkipSuccess('manual');
    }

    document.addEventListener('keydown', onKeyDown, { capture: true });

    // --- Auto-skip (opt-in) ---
    if (settings.autoSkip) {
      startAutoSkip(() => onSkipSuccess('auto'));
    }

    // --- SPA navigation: re-initialize when YouTube navigates ---
    onYouTubeNavigate(() => {
      // Auto-skip needs to re-attach to the new player
      if (settings.autoSkip) {
        stopAutoSkip();
        // The new startAutoSkip retries internally if player isn't ready yet
        startAutoSkip(() => onSkipSuccess('auto'));
      }
    });

    // --- Live settings sync ---
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;

      const updated: Partial<SkiSettings> = {};
      for (const [key, change] of Object.entries(changes)) {
        if (key in DEFAULT_SETTINGS) {
          (updated as Record<string, unknown>)[key] = change.newValue;
        }
      }

      // Merge changes into current settings
      settings = { ...settings, ...updated };

      // Handle auto-skip toggle
      if ('autoSkip' in updated) {
        if (settings.autoSkip) {
          startAutoSkip(() => onSkipSuccess('auto'));
        } else {
          stopAutoSkip();
        }
      }
    });
  },
});
