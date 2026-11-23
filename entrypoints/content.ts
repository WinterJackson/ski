/**
 * Content script entry point.
 * Wires together the detector, hotkey, observer, and toast modules.
 *
 * Runs on YouTube pages. Attaches one capture-phase keydown listener.
 * Reads settings from storage and updates them live when they change.
 */

import { findSkipButton, clickSkipButton, loadLearnedSelectors } from '../src/content/detector';
import { shouldTriggerSkip } from '../src/content/hotkey';
import { onYouTubeNavigate, startAutoSkip, stopAutoSkip } from '../src/content/observer';
import { showToast } from '../src/content/toast';
import {
  loadSettings,
  incrementSkipCount,
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

    // Load initial settings and learned selectors in parallel
    const [settings_loaded] = await Promise.all([
      loadSettings(),
      loadLearnedSelectors(),
    ]);
    let settings: SkiSettings = settings_loaded;

    // --- Keydown handler (capture phase) ---
    function onKeyDown(event: KeyboardEvent): void {
      if (!shouldTriggerSkip(event, settings)) return;

      const button = findSkipButton();
      if (!button) return;

      // Skip the ad
      event.preventDefault();
      event.stopPropagation();
      clickSkipButton(button);

      // Optional toast feedback
      if (settings.showToast) {
        try {
          showToast();
        } catch {
          // Toast is non-critical UI feedback — don't let it break skip
        }
      }

      // Track skip count (fire and forget)
      incrementSkipCount();
      console.debug('[Ski] Ad skipped');
    }

    document.addEventListener('keydown', onKeyDown, { capture: true });

    // --- Auto-skip (opt-in) ---
    if (settings.autoSkip) {
      startAutoSkip();
    }

    // --- SPA navigation: re-initialize when YouTube navigates ---
    onYouTubeNavigate(() => {
      // Auto-skip needs to re-attach to the new player
      if (settings.autoSkip) {
        stopAutoSkip();
        // Delay slightly to let the player DOM render
        setTimeout(() => {
          if (settings.autoSkip) startAutoSkip();
        }, 500);
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
          startAutoSkip();
        } else {
          stopAutoSkip();
        }
      }
    });
  },
});
