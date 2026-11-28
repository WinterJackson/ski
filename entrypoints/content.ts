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

import {
  findSkipButton,
  clickSkipButton,
  isAdShowing,
  loadLearnedSelectors,
  seekAdVideoIfStillShowing,
} from '../src/content/detector';
import { shouldTriggerSkip } from '../src/content/hotkey';
import { onYouTubeNavigate, startAutoSkip, stopAutoSkip } from '../src/content/observer';
import { showToast, hideToast } from '../src/content/toast';
import {
  loadSettings,
  saveSettings,
  recordSkip,
  validateSettings,
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
    // Skip non-player iframes (comments, tracking, cards) while allowing embeds
    const isTopFrame = window === window.top;
    const isEmbedFrame = location.pathname.startsWith('/embed/');
    const hasPlayer =
      isTopFrame ||
      isEmbedFrame ||
      Boolean(document.querySelector('video, #movie_player, .html5-video-player, ytm-player'));
    if (!hasPlayer) return;

    console.debug('[Ski] Content script loaded on:', location.href);

    // ── Inject main-world helper script ──
    // Runs in YouTube's JavaScript context to access internal APIs.
    // The content script communicates with it via CustomEvent.
    try {
      const script = document.createElement('script');
      script.src = (browser.runtime.getURL as (path: string) => string)('/ski-main.js');
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

    // ── Single Toast Lifecycle Controller ──
    // Ensures toast appears ONCE as "Skipping", stays steady without blinking
    // through consecutive ads, and only disappears after ALL ads are skipped.
    let toastActive = false;
    let toastWatchTimer: ReturnType<typeof setInterval> | null = null;

    function handleToast(method: 'manual' | 'auto'): void {
      if (!settings.showToast) return;

      // 1. Immediately show "Skipping" once without blinking or restarting
      if (!toastActive) {
        toastActive = true;
        const skippingMsg = method === 'auto' ? 'Skipping ⚡' : 'Skipping ⏭';
        try {
          showToast(skippingMsg, false); // autoDismiss: false, stays solid without blinking
        } catch { /* non-critical */ }
      }

      // 2. If a watch loop is already running, keep it running
      if (toastWatchTimer) return;

      let consecutiveCleanChecks = 0;
      let totalChecks = 0;
      const MAX_CHECKS = 60; // 60 * 250ms = 15 seconds max safety timeout

      toastWatchTimer = setInterval(() => {
        totalChecks++;

        if (isAdShowing()) {
          // Ad is still showing (or Ad 2 of 2 has appeared) — reset clean count
          consecutiveCleanChecks = 0;
        } else {
          // Ad is not currently showing
          consecutiveCleanChecks++;
          // Wait for 3 consecutive clean checks (750ms) to ensure double ads didn't just have a brief transition gap
          if (consecutiveCleanChecks >= 3) {
            clearInterval(toastWatchTimer!);
            toastWatchTimer = null;
            toastActive = false;

            // All ads are completely gone! Show the completion toast once.
            const doneMsg = method === 'auto' ? 'Ad auto-skipped ⚡' : 'Ad skipped ⏭';
            try {
              showToast(doneMsg, true); // autoDismiss: true (auto-hides after 2000ms)
            } catch { /* non-critical */ }
            return;
          }
        }

        // Safety timeout: dismiss smoothly if ad is stubborn/unskippable
        if (totalChecks >= MAX_CHECKS) {
          clearInterval(toastWatchTimer!);
          toastWatchTimer = null;
          toastActive = false;
          try {
            hideToast();
          } catch { /* non-critical */ }
        }
      }, 250);
    }

    // ── Shared skip feedback handler ──
    let lastRecordedSkipAt = 0;
    const MIN_SKIP_DEDUP_MS = 150;
    let manualEscalationTimer: ReturnType<typeof setTimeout> | null = null;

    function onSkipSuccess(method: 'manual' | 'auto'): void {
      if (!settings.enabled) return;
      const now = Date.now();
      if (now - lastRecordedSkipAt < MIN_SKIP_DEDUP_MS) {
        return;
      }
      lastRecordedSkipAt = now;

      handleToast(method);
      recordSkip(method, getVideoTitle());
      console.debug(`[Ski] Ad skipped (${method})`);
    }

    // --- Keydown handler (capture phase) ---
    // Strict human mouse parity: 1 keypress = 1 click on the currently ready Skip button.
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
      if (manualEscalationTimer) clearTimeout(manualEscalationTimer);
      manualEscalationTimer = setTimeout(() => {
        manualEscalationTimer = null;
        if (settings.enabled && findSkipButton() === button) {
          seekAdVideoIfStillShowing();
        }
      }, 350);
    }

    document.addEventListener('keydown', onKeyDown, { capture: true });

    // --- Auto-skip ---
    let autoSkipActive = Boolean(settings.enabled && settings.autoSkip);
    if (autoSkipActive) {
      startAutoSkip(() => onSkipSuccess('auto'));
    }

    // --- SPA navigation: re-initialize when YouTube navigates ---
    onYouTubeNavigate(() => {
      // Clean up any ongoing toast or escalation timer
      if (manualEscalationTimer) {
        clearTimeout(manualEscalationTimer);
        manualEscalationTimer = null;
      }
      if (toastWatchTimer) {
        clearInterval(toastWatchTimer);
        toastWatchTimer = null;
      }
      toastActive = false;
      try { hideToast(); } catch { /* non-critical */ }

      // Auto-skip needs to re-attach to the new player
      autoSkipActive = Boolean(settings.enabled && settings.autoSkip);
      if (autoSkipActive) {
        stopAutoSkip();
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

      // Merge & validate so cleared keys fall back to DEFAULT_SETTINGS
      settings = validateSettings({ ...settings, ...updated });

      if (!settings.enabled) {
        if (manualEscalationTimer) {
          clearTimeout(manualEscalationTimer);
          manualEscalationTimer = null;
        }
        if (toastWatchTimer) {
          clearInterval(toastWatchTimer);
          toastWatchTimer = null;
        }
        toastActive = false;
        try { hideToast(); } catch { /* non-critical */ }
      }

      // Only toggle auto-skip when the effective active state actually changes
      const shouldRunAutoSkip = Boolean(settings.enabled && settings.autoSkip);
      if (shouldRunAutoSkip !== autoSkipActive) {
        autoSkipActive = shouldRunAutoSkip;
        if (autoSkipActive) {
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
