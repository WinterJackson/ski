/**
 * Content script entry point.
 * Wires together the detector, hotkey, observer, and toast modules.
 *
 * Runs on YouTube pages (desktop and mobile web).
 * Attaches one capture-phase keydown listener.
 * Reads settings from storage and updates them live when they change.
 *
 * MOBILE SUPPORT:
 * On touch devices (tablets, phones), auto-skip defaults to ON on first run.
 * The hotkey listener is always active — if a keyboard is attached, it works
 * alongside auto-skip. No explicit mode switching needed.
 */

import { findSkipButton, clickSkipButton, isAdShowing, loadLearnedSelectors } from '../src/content/detector';
import { shouldTriggerSkip } from '../src/content/hotkey';
import { onYouTubeNavigate, startAutoSkip, stopAutoSkip } from '../src/content/observer';
import { showToast } from '../src/content/toast';
import {
  loadSettings,
  saveSettings,
  recordSkip,
  type SkiSettings,
  DEFAULT_SETTINGS,
} from '../src/shared/settings';

export default defineContentScript({
  matches: [
    '*://www.youtube.com/*',
    '*://m.youtube.com/*',
    '*://www.youtube-nocookie.com/*',
  ],
  allFrames: true,
  runAt: 'document_idle',

  async main() {
    console.debug('[Ski] Content script loaded on:', location.href);

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

    // ── Touch device auto-detection (first run only) ──
    // On touch devices (phones, tablets), auto-skip is the primary mode
    // since there's no keyboard. We enable it automatically on first run.
    // The user can always toggle it off in the options page.
    await autoDetectTouchDevice(settings);
    // Reload settings in case we just changed them
    if (!settings.autoSkipConfigured) {
      settings = await loadSettings();
    }

    // ── Video title capture (for opt-in history tracking) ──
    function getVideoTitle(): string | undefined {
      if (!settings.trackHistory) return undefined;

      // Method 1: document.title is the most reliable across all YouTube layouts
      const pageTitle = document.title;
      if (pageTitle && pageTitle !== 'YouTube') {
        return pageTitle.replace(/ - YouTube$/, '').trim() || undefined;
      }

      // Method 2: DOM element fallback for edge cases (mobile YouTube uses different selectors)
      const titleEl = document.querySelector(
        'h1.ytd-watch-metadata yt-formatted-string, #info h1 yt-formatted-string, h1.ytd-video-primary-info-renderer, .slim-video-metadata-header-modern h2'
      );
      if (titleEl?.textContent) return titleEl.textContent.trim();

      return 'Unknown video';
    }

    // ── Consecutive-ad watcher ──
    // After every successful skip, monitors for a follow-up ad (Ad 2 of 2)
    // and auto-clicks it. This ensures a single keypress handles double ads.
    let consecutiveAdTimer: ReturnType<typeof setInterval> | null = null;

    function watchForConsecutiveAd(method: 'manual' | 'auto'): void {
      if (!settings.enabled) return;
      if (consecutiveAdTimer) clearInterval(consecutiveAdTimer);
      let attempts = 0;
      consecutiveAdTimer = setInterval(() => {
        attempts++;
        // Stop after 10 seconds or when the ad phase is truly over
        if (attempts > 20) {
          clearInterval(consecutiveAdTimer!);
          consecutiveAdTimer = null;
          return;
        }
        // During the brief gap between ads, isAdShowing() may be false — keep watching
        if (!isAdShowing()) return;
        // Ad is showing again — look for the skip button
        const button = findSkipButton();
        if (button) {
          clearInterval(consecutiveAdTimer!);
          consecutiveAdTimer = null;
          // Small delay to let YouTube fully initialize the new skip button
          setTimeout(() => {
            clickSkipButton(button);
            onSkipSuccess(method);
          }, 150);
        }
      }, 500);
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
            const msg = method === 'auto' ? 'Ad auto-skipped ⚡' : 'Ad skipped ⏭';
            try { showToast(msg); } catch { /* non-critical */ }
          } else if (checks > 20) {
            clearInterval(checkInterval);
            try { showToast('Attempting to skip...'); } catch { /* non-critical */ }
          }
        }, 200);
      }
      recordSkip(method, getVideoTitle());
      console.debug(`[Ski] Ad skipped (${method})`);
      // Watch for a consecutive ad (Ad 2 of 2) after this skip.
      // ONLY for manual skips — the auto-skip observer's polling loop
      // already handles consecutive ads via its built-in cooldown + grace
      // period mechanism. Running both would double-count Ad 2.
      if (method === 'manual') {
        watchForConsecutiveAd(method);
      }
    }

    // --- Keydown handler (capture phase) ---
    // Always active — works on desktop AND when a keyboard is attached to a mobile device
    function onKeyDown(event: KeyboardEvent): void {
      if (!settings.enabled) return;
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

    // --- Auto-skip ---
    if (settings.enabled && settings.autoSkip) {
      startAutoSkip(() => onSkipSuccess('auto'));
    }

    // --- SPA navigation: re-initialize when YouTube navigates ---
    onYouTubeNavigate(() => {
      // Auto-skip needs to re-attach to the new player
      if (settings.enabled && settings.autoSkip) {
        stopAutoSkip();
        // The new startAutoSkip retries internally if player isn't ready yet
        startAutoSkip(() => onSkipSuccess('auto'));
      } else {
        stopAutoSkip();
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

      // Handle enabled and auto-skip toggle
      if ('enabled' in updated || 'autoSkip' in updated) {
        if (settings.enabled && settings.autoSkip) {
          startAutoSkip(() => onSkipSuccess('auto'));
        } else {
          stopAutoSkip();
        }
      }
    });
  },
});

/**
 * Detect if the device is touch-capable and auto-enable auto-skip on first run.
 *
 * Uses navigator.maxTouchPoints (reliable on modern browsers) rather than
 * User-Agent sniffing (which is increasingly unreliable due to Chrome's
 * User-Agent Reduction initiative and iPads reporting as Macs).
 *
 * This runs ONCE — after the first detection, it sets autoSkipConfigured=true
 * and never overrides the user's choice again.
 */
async function autoDetectTouchDevice(settings: SkiSettings): Promise<void> {
  // Skip if already configured (user has seen the options page or we already ran)
  if (settings.autoSkipConfigured) return;

  const isTouchDevice = navigator.maxTouchPoints > 0;

  try {
    if (isTouchDevice) {
      // Touch device detected — enable auto-skip as default
      await saveSettings({ autoSkip: true, autoSkipConfigured: true });
      console.debug('[Ski] Touch device detected — auto-skip enabled by default');
    } else {
      // Desktop — just mark as configured, keep default (auto-skip off)
      await saveSettings({ autoSkipConfigured: true });
      console.debug('[Ski] Desktop device detected — hotkey mode (auto-skip off)');
    }
  } catch {
    // Non-critical — settings remain at defaults
  }
}
