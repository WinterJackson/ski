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
    console.log('[Ski] Content script loaded on:', window.location.href);

    // Load initial settings and learned selectors in parallel
    const [settings_loaded] = await Promise.all([
      loadSettings(),
      loadLearnedSelectors(),
    ]);
    let settings: SkiSettings = settings_loaded;
    console.log('[Ski] Settings loaded. Hotkey:', settings.keyCode, '| Auto-skip:', settings.autoSkip);

    // --- Keydown handler (capture phase) ---
    function onKeyDown(event: KeyboardEvent): void {
      // Log every keypress for debugging (remove after confirmed working)
      if (event.code === settings.keyCode) {
        console.log('[Ski] Hotkey detected:', event.code, '| Ad showing:', isAdShowing());

        // Dump the player state for debugging
        const player = document.querySelector('.html5-video-player');
        if (player) {
          console.log('[Ski] Player classes:', player.className);
          const allButtons = player.querySelectorAll('button');
          console.log('[Ski] Buttons in player:', allButtons.length);
          allButtons.forEach((btn, i) => {
            if (btn.offsetParent !== null || btn.style.display !== 'none') {
              console.log(`[Ski]   Button[${i}]: class="${btn.className}" text="${(btn.textContent ?? '').trim().slice(0, 50)}" visible=${btn.offsetWidth > 0}`);
            }
          });
        } else {
          console.log('[Ski] No .html5-video-player found!');
          // Try to find any player-like element
          const possiblePlayers = document.querySelectorAll('[class*="player"]');
          console.log('[Ski] Elements with "player" in class:', possiblePlayers.length);
          possiblePlayers.forEach((el, i) => {
            console.log(`[Ski]   Player-like[${i}]: tag=${el.tagName} class="${el.className.toString().slice(0, 100)}"`);
          });
        }
      }

      if (!shouldTriggerSkip(event, settings)) return;

      const button = findSkipButton();
      if (!button) {
        console.log('[Ski] Hotkey matched but no skip button found');
        return;
      }

      // Skip the ad
      event.preventDefault();
      event.stopPropagation();
      clickSkipButton(button);

      // Optional toast feedback
      if (settings.showToast) {
        showToast();
      }

      // Track skip count (fire and forget)
      incrementSkipCount();

      // Throttled diagnostic: log if the skip worked
      console.debug('[Ski] Ad skipped');
    }

    document.addEventListener('keydown', onKeyDown, { capture: true });
    console.log('[Ski] Keydown listener attached (capture phase)');

    // --- Auto-skip (opt-in) ---
    if (settings.autoSkip) {
      startAutoSkip();
    }

    // --- SPA navigation: re-initialize when YouTube navigates ---
    onYouTubeNavigate(() => {
      console.log('[Ski] SPA navigation detected');
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
      console.log('[Ski] Settings updated:', JSON.stringify(updated));

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
