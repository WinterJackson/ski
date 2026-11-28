/**
 * Observer module — SPA navigation hooks and unified auto-skip state machine.
 *
 * YouTube does not reload between videos, so we listen for yt-navigate-finish
 * to reset state. Auto-skip uses a two-tier MutationObserver:
 * 1. Outer observer on the player element watching `class` changes.
 * 2. Scoped inner observer on `.ytp-ad-module, .video-ads` (falling back to
 *    player) watching attribute/subtree changes, debounced via requestAnimationFrame
 *    for <16ms reaction time with zero idle polling.
 */

import { AD_SHOWING_CLASS } from './selectors';
import {
  findSkipButton,
  clickSkipButton,
  isAdShowing,
  isVisible,
  getPlayerElement,
  seekAdVideoIfStillShowing,
} from './detector';

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

// ----- Auto-skip state machine (opt-in) -----

type SkipState = 'idle' | 'watching_ad' | 'cooldown' | 'watching_consecutive';

const SAFETY_POLL_MS = 500;
const COOLDOWN_MS = 1500;
const CONSECUTIVE_GRACE_MS = 2500;
const MAX_AD_WAIT_MS = 30_000;

let playerObserver: MutationObserver | null = null;
let adModuleObserver: MutationObserver | null = null;
let adModuleTarget: Element | null = null;
let safetyPollTimer: ReturnType<typeof setInterval> | null = null;
let attachRetryTimer: ReturnType<typeof setTimeout> | null = null;
let escalationTimer: ReturnType<typeof setTimeout> | null = null;
let rafId: number | null = null;

let skipState: SkipState = 'idle';
let cooldownUntil = 0;
let adGoneSince = 0;
let adActiveSince = 0;
let countedCurrentAd = false;
let lastSkippedButton: HTMLElement | null = null;
let sawGapAfterSkip = false;

function resetAdTracking(): void {
  countedCurrentAd = false;
  lastSkippedButton = null;
  sawGapAfterSkip = false;
}

function scheduleFrameCheck(player: Element, onSkip?: AutoSkipCallback): void {
  if (rafId !== null) return;
  const run = () => {
    rafId = null;
    attemptSkip(player, onSkip);
  };
  if (typeof requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(run);
  } else {
    rafId = setTimeout(run, 16) as unknown as number;
  }
}

function detachAdWatchers(): void {
  if (adModuleObserver) {
    adModuleObserver.disconnect();
    adModuleObserver = null;
  }
  adModuleTarget = null;
  if (safetyPollTimer) {
    clearInterval(safetyPollTimer);
    safetyPollTimer = null;
  }
  if (escalationTimer) {
    clearTimeout(escalationTimer);
    escalationTimer = null;
  }
  if (rafId !== null) {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
    } else {
      clearTimeout(rafId);
    }
    rafId = null;
  }
  skipState = 'idle';
  cooldownUntil = 0;
  adGoneSince = 0;
  adActiveSince = 0;
  resetAdTracking();
}

function ensureAdModuleObserver(player: Element, onSkip?: AutoSkipCallback): void {
  const target = player.querySelector('.ytp-ad-module, .video-ads') ?? player;
  if (adModuleObserver && adModuleTarget === target) return;

  if (adModuleObserver) {
    adModuleObserver.disconnect();
  }
  adModuleTarget = target;
  adModuleObserver = new MutationObserver(() => {
    scheduleFrameCheck(player, onSkip);
  });
  adModuleObserver.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'disabled', 'aria-disabled', 'hidden'],
  });
}

/**
 * Start the auto-skip observer. It watches the player for ad state
 * and clicks the skip button as soon as it becomes visible/clickable.
 */
export function startAutoSkip(onSkip?: AutoSkipCallback): void {
  stopAutoSkip();

  // Retry up to 10 times over 5 seconds if player DOM hasn't rendered yet
  let retries = 0;
  const tryAttach = () => {
    attachRetryTimer = null;
    const player = getPlayerElement();
    if (player) {
      attachAutoSkip(player, onSkip);
    } else if (retries < 10) {
      retries++;
      attachRetryTimer = setTimeout(tryAttach, 500);
    }
  };
  tryAttach();
}

/** Stop the auto-skip observer, inner watchers, and any pending timers */
export function stopAutoSkip(): void {
  if (attachRetryTimer) {
    clearTimeout(attachRetryTimer);
    attachRetryTimer = null;
  }
  if (playerObserver) {
    playerObserver.disconnect();
    playerObserver = null;
  }
  detachAdWatchers();
}

function attachAutoSkip(player: Element, onSkip?: AutoSkipCallback): void {
  playerObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        evaluateAdState(player, onSkip);
        return;
      }
    }
  });

  playerObserver.observe(player, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Evaluate immediately in case an ad is already showing
  evaluateAdState(player, onSkip);
}

function evaluateAdState(player: Element, onSkip?: AutoSkipCallback): void {
  const adActive = player.classList.contains(AD_SHOWING_CLASS) || isAdShowing();
  const now = Date.now();

  if (adActive) {
    adGoneSince = 0;
    if (skipState === 'idle') {
      skipState = 'watching_ad';
      adActiveSince = now;
      ensureAdModuleObserver(player, onSkip);
      if (!safetyPollTimer) {
        safetyPollTimer = setInterval(() => attemptSkip(player, onSkip), SAFETY_POLL_MS);
      }
    } else if (skipState === 'watching_consecutive') {
      skipState = 'watching_ad';
      adActiveSince = now;
      ensureAdModuleObserver(player, onSkip);
    }
    scheduleFrameCheck(player, onSkip);
  } else {
    resetAdTracking();
    if (skipState === 'watching_ad' || skipState === 'cooldown') {
      skipState = 'watching_consecutive';
      adGoneSince = now;
    } else if (
      skipState === 'watching_consecutive' &&
      now - adGoneSince >= CONSECUTIVE_GRACE_MS
    ) {
      detachAdWatchers();
    }
  }
}

function checkForNewAdWhileShowing(): void {
  if (!countedCurrentAd) return;

  if (lastSkippedButton && (!lastSkippedButton.isConnected || !isVisible(lastSkippedButton))) {
    sawGapAfterSkip = true;
  }

  // Only reset after cooldown has elapsed so Ad 1 teardown never triggers a double-count
  if (sawGapAfterSkip && Date.now() >= cooldownUntil) {
    resetAdTracking();
  }
}

function attemptSkip(player: Element, onSkip?: AutoSkipCallback): void {
  if (!player.isConnected) {
    startAutoSkip(onSkip);
    return;
  }

  const adActive = player.classList.contains(AD_SHOWING_CLASS) || isAdShowing();
  const now = Date.now();

  if (!adActive) {
    resetAdTracking();
    if (skipState === 'watching_ad' || skipState === 'cooldown') {
      skipState = 'watching_consecutive';
      adGoneSince = now;
    } else if (
      skipState === 'watching_consecutive' &&
      now - adGoneSince >= CONSECUTIVE_GRACE_MS
    ) {
      detachAdWatchers();
    }
    return;
  }

  adGoneSince = 0;
  ensureAdModuleObserver(player, onSkip);

  // Hard timeout after 30s of continuous ad playback (e.g. unskippable ad)
  if (adActiveSince > 0 && now - adActiveSince > MAX_AD_WAIT_MS) {
    detachAdWatchers();
    return;
  }

  checkForNewAdWhileShowing();

  const button = findSkipButton();
  if (!button) {
    if (countedCurrentAd) {
      sawGapAfterSkip = true;
    }
    return;
  }

  // Only enforce cooldown on the SAME button element; a brand-new button
  // (e.g. Ad 2 or a companion card's Skip button) is clicked & counted immediately.
  if (skipState === 'cooldown' && now < cooldownUntil && button === lastSkippedButton) {
    return;
  }
  skipState = 'watching_ad';

  if (countedCurrentAd && button !== lastSkippedButton) {
    resetAdTracking();
  }

  clickSkipButton(button);
  if (!countedCurrentAd) {
    countedCurrentAd = true;
    lastSkippedButton = button;
    sawGapAfterSkip = false;
    onSkip?.();
  }
  skipState = 'cooldown';
  cooldownUntil = now + COOLDOWN_MS;
  adActiveSince = now;

  // If YouTube ignores untrusted DOM clicks, escalate safely after 350ms
  // only if this exact ad button is still showing.
  if (escalationTimer) clearTimeout(escalationTimer);
  escalationTimer = setTimeout(() => {
    escalationTimer = null;
    if (player.isConnected && player.classList.contains(AD_SHOWING_CLASS) && findSkipButton() === button) {
      seekAdVideoIfStillShowing();
    }
  }, 350);
}
