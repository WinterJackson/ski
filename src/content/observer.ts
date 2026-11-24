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
 *
 * CONSECUTIVE AD HANDLING:
 * After clicking the skip button for Ad 1, we don't stop polling immediately.
 * Instead, we enter a "cooldown" period (1 second) to avoid re-clicking the
 * same button, then continue polling to catch Ad 2. Polling only stops when
 * isAdShowing() is false AND we've waited through a grace period (to handle
 * the brief gap between consecutive ads where ad-showing flickers off).
 */
function startSkipPolling(player: Element, onSkip?: AutoSkipCallback): void {
  // Don't start duplicate polling
  if (autoSkipPollTimer) return;

  let attempts = 0;
  let cooldownRemaining = 0;  // polls to skip after a successful click
  let gracePeriod = 0;        // how many polls since ad-showing went false
  const MAX_ATTEMPTS = 100;   // 30 seconds max (300ms × 100)
  const COOLDOWN_POLLS = 4;   // ~1.2 seconds after clicking before retrying
  const MAX_GRACE = 7;        // ~2.1 seconds to detect a consecutive ad

  autoSkipPollTimer = setInterval(() => {
    attempts++;

    // Hard timeout — give up after 30 seconds
    if (attempts > MAX_ATTEMPTS) {
      clearInterval(autoSkipPollTimer!);
      autoSkipPollTimer = null;
      return;
    }

    const adActive = player.classList.contains(AD_SHOWING_CLASS) || isAdShowing();

    if (!adActive) {
      // Ad NOT showing — could be a brief gap between consecutive ads
      gracePeriod++;
      if (gracePeriod >= MAX_GRACE) {
        // No follow-up ad appeared — truly done
        clearInterval(autoSkipPollTimer!);
        autoSkipPollTimer = null;
      }
      return;
    }

    // Ad IS showing — reset grace period
    gracePeriod = 0;

    // During cooldown, skip click attempts (button for Ad 1 may still be in DOM)
    if (cooldownRemaining > 0) {
      cooldownRemaining--;
      return;
    }

    // Try to find and click the skip button
    const button = findSkipButton();
    if (button) {
      clickSkipButton(button);
      onSkip?.();
      // Enter cooldown — don't immediately re-click the same button
      cooldownRemaining = COOLDOWN_POLLS;
      // Reset attempts so we have a full timeout window for the next ad
      attempts = 0;
    }
  }, AUTO_SKIP_POLL_MS);
}
