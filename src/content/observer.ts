/**
 * Observer module — SPA navigation hooks and optional auto-skip observer.
 *
 * YouTube does not reload between videos, so we listen for yt-navigate-finish
 * to reset state. The optional auto-skip uses a polling approach scoped to
 * the player element: when the ad-showing class appears, it polls for the
 * skip button every 300ms until it finds and clicks it.
 */

import { PLAYER_SELECTOR, AD_SHOWING_CLASS } from './selectors';
import { findSkipButton, clickSkipButton, isAdShowing } from './detector';

/** Callback for when navigation occurs */
export type NavigationCallback = () => void;

/** Callback for when auto-skip fires */
export type AutoSkipCallback = () => void;

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
let autoSkipPollTimer: ReturnType<typeof setInterval> | null = null;

/** Interval between auto-skip poll attempts (ms) */
const AUTO_SKIP_POLL_MS = 300;

/**
 * Start the auto-skip observer. It watches the player for the ad-showing
 * class and clicks the skip button when it appears.
 * Off by default — only called when the user enables auto-skip.
 *
 * @param onSkip — optional callback fired after a successful auto-skip
 *                 (used by content.ts to show toast + increment counter)
 */
export function startAutoSkip(onSkip?: AutoSkipCallback): void {
  stopAutoSkip();

  // Find the player — retry up to 5 times over 2.5 seconds if not available yet
  // (YouTube SPA navigation may not have rendered the player DOM yet)
  let retries = 0;
  const tryAttach = () => {
    const player = document.querySelector(PLAYER_SELECTOR);
    if (player) {
      attachAutoSkip(player, onSkip);
    } else if (retries < 5) {
      retries++;
      setTimeout(tryAttach, 500);
    }
  };
  tryAttach();
}

/** Stop the auto-skip observer and poll timer */
export function stopAutoSkip(): void {
  if (autoSkipObserver) {
    autoSkipObserver.disconnect();
    autoSkipObserver = null;
  }
  if (autoSkipPollTimer) {
    clearInterval(autoSkipPollTimer);
    autoSkipPollTimer = null;
  }
}

/**
 * Attach the auto-skip MutationObserver to the player.
 *
 * Architecture:
 * - MutationObserver watches for class changes on the player element ONLY
 *   (efficient — doesn't fire on every subtree DOM change)
 * - When ad-showing class is detected, starts a 300ms poll loop that checks
 *   for the skip button (the button appears after a countdown delay)
 * - When the button is found, clicks it and stops polling
 * - When the ad ends (class removed), stops polling
 */
function attachAutoSkip(player: Element, onSkip?: AutoSkipCallback): void {
  autoSkipObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        handleAdStateChange(player, onSkip);
        return;
      }
    }
  });

  // Watch class changes on the player itself — NOT subtree
  // This is much more efficient than watching the entire subtree
  autoSkipObserver.observe(player, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Check immediately in case an ad is already showing
  if (isAdShowing()) {
    startSkipPolling(player, onSkip);
  }
}

/**
 * Handle a change in the player's ad state.
 * Starts or stops the skip button polling loop.
 */
function handleAdStateChange(player: Element, onSkip?: AutoSkipCallback): void {
  if (player.classList.contains(AD_SHOWING_CLASS)) {
    // Ad started — begin polling for the skip button
    startSkipPolling(player, onSkip);
  } else {
    // Ad ended — stop polling
    if (autoSkipPollTimer) {
      clearInterval(autoSkipPollTimer);
      autoSkipPollTimer = null;
    }
  }
}

/**
 * Poll for the skip button every 300ms until found or ad ends.
 * Uses the full clickSkipButton engine (which includes retry + seek fallback).
 */
function startSkipPolling(player: Element, onSkip?: AutoSkipCallback): void {
  // Don't start duplicate polling
  if (autoSkipPollTimer) return;

  let attempts = 0;
  const MAX_ATTEMPTS = 100; // 30 seconds max (300ms × 100)

  autoSkipPollTimer = setInterval(() => {
    attempts++;

    // Stop conditions
    if (!player.classList.contains(AD_SHOWING_CLASS) || !isAdShowing()) {
      clearInterval(autoSkipPollTimer!);
      autoSkipPollTimer = null;
      return;
    }
    if (attempts > MAX_ATTEMPTS) {
      // Ad has been showing for 30+ seconds with no skip button — it's unskippable
      clearInterval(autoSkipPollTimer!);
      autoSkipPollTimer = null;
      return;
    }

    // Try to find and click the skip button
    const button = findSkipButton();
    if (button) {
      clickSkipButton(button);
      onSkip?.();
      // Stop polling — clickSkipButton has its own retry loop
      clearInterval(autoSkipPollTimer!);
      autoSkipPollTimer = null;
    }
  }, AUTO_SKIP_POLL_MS);
}
