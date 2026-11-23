/**
 * Observer module — SPA navigation hooks and optional auto-skip observer.
 *
 * YouTube does not reload between videos, so we listen for yt-navigate-finish
 * to reset state. The optional auto-skip uses a throttled MutationObserver
 * scoped to the player element.
 */

import { PLAYER_SELECTOR, AD_SHOWING_CLASS } from './selectors';
import { findSkipButton, clickSkipButton } from './detector';

/** Callback for when navigation occurs */
export type NavigationCallback = () => void;

/**
 * Listen for YouTube SPA navigation events.
 * Returns an unsubscribe function.
 */
export function onYouTubeNavigate(callback: NavigationCallback): () => void {
  const handler = () => callback();
  document.addEventListener('yt-navigate-finish', handler);
  return () => document.removeEventListener('yt-navigate-finish', handler);
}

// ----- Auto-skip (opt-in) -----

let autoSkipObserver: MutationObserver | null = null;
let autoSkipThrottleTimer: ReturnType<typeof setTimeout> | null = null;

/** Minimum interval between auto-skip attempts (ms) */
const AUTO_SKIP_THROTTLE_MS = 500;

/**
 * Start the auto-skip observer. It watches the player for the ad-showing
 * class and clicks the skip button when it appears.
 * Off by default — only called when the user enables auto-skip.
 */
export function startAutoSkip(): void {
  stopAutoSkip();

  const player = document.querySelector(PLAYER_SELECTOR);
  if (!player) return;

  autoSkipObserver = new MutationObserver(() => {
    if (autoSkipThrottleTimer) return;

    autoSkipThrottleTimer = setTimeout(() => {
      autoSkipThrottleTimer = null;
    }, AUTO_SKIP_THROTTLE_MS);

    if (player.classList.contains(AD_SHOWING_CLASS)) {
      const button = findSkipButton();
      if (button) {
        clickSkipButton(button);
      }
    }
  });

  // Observe class changes on the player and subtree modifications
  autoSkipObserver.observe(player, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
    childList: true,
  });
}

/** Stop the auto-skip observer */
export function stopAutoSkip(): void {
  if (autoSkipObserver) {
    autoSkipObserver.disconnect();
    autoSkipObserver = null;
  }
  if (autoSkipThrottleTimer) {
    clearTimeout(autoSkipThrottleTimer);
    autoSkipThrottleTimer = null;
  }
}

