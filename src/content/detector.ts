/**
 * Detector module — finds and validates the Skip button.
 *
 * LAYERED DETECTION (most specific → least specific):
 * 1. Learned selectors — discovered at runtime when YouTube changes
 * 2. Known class selectors from selectors.ts (fastest, most specific)
 * 3. Structural fallback: buttons inside the player matching Skip text/aria
 * 4. Heuristic discovery: score ALL buttons in the player by position, size,
 *    text, and proximity to ad elements — the self-healing layer
 *
 * The heuristic layer is what makes the extension survive YouTube changes
 * automatically. When it discovers a button the known selectors missed,
 * it learns the selector and uses it first next time.
 */

import {
  SKIP_BUTTON_SELECTORS,
  PLAYER_SELECTOR,
  AD_SHOWING_CLASS,
  SKIP_STRINGS,
  SKIP_ARIA_PATTERNS,
} from './selectors';

// ── Learned selectors cache ─────────────────────────────────────────────

/** Selectors discovered at runtime (tried before hardcoded ones) */
let learnedSelectors: string[] = [];

/** Storage key for persisted learned selectors */
const LEARNED_SELECTORS_KEY = 'ski_learned_selectors';
const LEARNED_SELECTORS_MAX = 10;

/** Load learned selectors from storage on init */
export async function loadLearnedSelectors(): Promise<void> {
  try {
    const result = await browser.storage.local.get({ [LEARNED_SELECTORS_KEY]: [] });
    const stored = result[LEARNED_SELECTORS_KEY];
    if (Array.isArray(stored)) {
      learnedSelectors = stored.filter((s): s is string => typeof s === 'string');
    }
  } catch {
    learnedSelectors = [];
  }
}

/** Persist a newly discovered selector */
async function saveLearnedSelector(selector: string): Promise<void> {
  if (learnedSelectors.includes(selector)) return;

  // Prepend (newest first), cap size
  learnedSelectors.unshift(selector);
  if (learnedSelectors.length > LEARNED_SELECTORS_MAX) {
    learnedSelectors = learnedSelectors.slice(0, LEARNED_SELECTORS_MAX);
  }

  try {
    await browser.storage.local.set({ [LEARNED_SELECTORS_KEY]: learnedSelectors });
    console.debug('[Ski] Learned new selector:', selector);
  } catch {
    // Non-critical — works this session even if storage fails
  }
}

// ── Core detection ──────────────────────────────────────────────────────

/** Check if the player is currently showing an ad */
export function isAdShowing(): boolean {
  const player = document.querySelector(PLAYER_SELECTOR);
  if (!player) return false;

  // Check the player itself or any ancestor/descendant
  if (player.classList.contains(AD_SHOWING_CLASS)) return true;

  // Some YouTube layouts nest the ad-showing class differently
  const adPlayer = document.querySelector('.html5-video-player.ad-showing, #movie_player.ad-showing');
  return adPlayer !== null;
}

/**
 * Find the visible, clickable Skip button.
 * Returns the button element or null if not found/not ready.
 *
 * Detection order:
 * 1. Learned selectors (fastest — already discovered this session)
 * 2. Known CSS selectors from selectors.ts
 * 3. Text/aria structural match
 * 4. Heuristic discovery (self-healing — scores all candidate buttons)
 */
export function findSkipButton(): HTMLElement | null {
  // Gate: only search during ads
  if (!isAdShowing()) {
    return null;
  }

  // Layer 1: Learned selectors (from previous discovery)
  for (const selector of learnedSelectors) {
    try {
      const button = document.querySelector<HTMLElement>(selector);
      if (button && isVisible(button) && isClickable(button)) {
        return button;
      }
    } catch {
      // Invalid selector — skip
    }
  }

  // Layer 2: Known CSS selectors
  for (const selector of SKIP_BUTTON_SELECTORS) {
    const els = document.querySelectorAll<HTMLElement>(selector);
    for (const button of els) {
      if (isVisible(button) && isClickable(button)) {
        return button;
      }
    }
  }

  // Layer 3: Structural fallback — buttons with skip text inside the player
  const player = document.querySelector(PLAYER_SELECTOR);
  if (player) {
    const buttons = player.querySelectorAll<HTMLElement>('button');
    for (const button of buttons) {
      if (isVisible(button) && isClickable(button) && matchesSkipText(button)) {
        // This button matched by text — learn its selector for next time
        learnSelector(button);
        return button;
      }
    }
  }

  // Layer 4: Heuristic discovery (self-healing)
  const discovered = discoverSkipButton();
  if (discovered) {
    learnSelector(discovered);
    return discovered;
  }

  return null;
}

// ── Visibility and clickability ─────────────────────────────────────────

/**
 * Check if an element is visually visible.
 * The Skip button exists in the DOM before it becomes clickable (during the
 * countdown), so we must verify actual visibility.
 */
export function isVisible(el: HTMLElement): boolean {
  // Check inline style first (fastest check for display:none)
  const inlineDisplay = el.style.display;
  if (inlineDisplay === 'none') return false;
  const inlineVisibility = el.style.visibility;
  if (inlineVisibility === 'hidden') return false;

  // Check computed styles
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  // Check bounding box — zero-size elements are effectively invisible
  const rect = el.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return true;
  }

  // If inline display is explicitly set to something visible, trust it
  if (inlineDisplay && inlineDisplay !== 'none') return true;

  // offsetParent check
  if (el.offsetParent !== null) return true;

  // Default: element passed style checks, assume visible
  return true;
}

/** Check if an element is likely clickable (not disabled) */
export function isClickable(el: HTMLElement): boolean {
  if (el instanceof HTMLButtonElement && el.disabled) return false;
  if (el.getAttribute('aria-disabled') === 'true') return false;
  return true;
}

/** Check if an element's text or aria-label matches a known "Skip" string */
export function matchesSkipText(el: HTMLElement): boolean {
  // Check aria-label
  const ariaLabel = el.getAttribute('aria-label') ?? '';
  for (const pattern of SKIP_ARIA_PATTERNS) {
    if (pattern.test(ariaLabel)) return true;
  }

  // Check visible text content
  const text = (el.textContent ?? '').trim();
  for (const skipStr of SKIP_STRINGS) {
    if (text.startsWith(skipStr)) return true;
  }

  return false;
}

// ── Self-healing heuristic discovery ────────────────────────────────────

/**
 * Heuristic signals for scoring a candidate skip button.
 * Each signal returns 0-1; the final score is a weighted sum.
 */
interface HeuristicSignal {
  name: string;
  weight: number;
  score: (el: HTMLElement, player: Element) => number;
}

const HEURISTIC_SIGNALS: HeuristicSignal[] = [
  {
    // Skip buttons contain short, action-like text
    name: 'text-length',
    weight: 0.15,
    score: (el) => {
      const text = (el.textContent ?? '').trim();
      if (text.length === 0) return 0;
      if (text.length <= 20) return 1;
      if (text.length <= 40) return 0.5;
      return 0;
    },
  },
  {
    // Skip buttons are near the bottom-right of the player
    name: 'position',
    weight: 0.20,
    score: (el, player) => {
      const pRect = player.getBoundingClientRect();
      const bRect = el.getBoundingClientRect();
      if (pRect.width === 0 || pRect.height === 0) return 0.5; // Can't tell
      // Relative position within the player
      const relX = (bRect.left - pRect.left) / pRect.width;
      const relY = (bRect.top - pRect.top) / pRect.height;
      // Skip buttons usually in the bottom half, right side
      let score = 0;
      if (relY > 0.5) score += 0.5;
      if (relX > 0.4) score += 0.5;
      return score;
    },
  },
  {
    // Skip buttons have class names or parent class names containing "skip" or "ad"
    name: 'class-hint',
    weight: 0.25,
    score: (el) => {
      const check = (e: Element): boolean => {
        const cls = (e.className ?? '').toString().toLowerCase();
        return cls.includes('skip') || cls.includes('ad');
      };
      if (check(el)) return 1;
      if (el.parentElement && check(el.parentElement)) return 0.8;
      if (el.parentElement?.parentElement && check(el.parentElement.parentElement)) return 0.5;
      return 0;
    },
  },
  {
    // Skip buttons have an aria-label or title
    name: 'has-label',
    weight: 0.10,
    score: (el) => {
      if (el.getAttribute('aria-label')) return 1;
      if (el.getAttribute('title')) return 0.8;
      return 0;
    },
  },
  {
    // Skip buttons are inside an overlay/ad module, not the main controls
    name: 'ad-ancestor',
    weight: 0.20,
    score: (el) => {
      let parent = el.parentElement;
      let depth = 0;
      while (parent && depth < 8) {
        const cls = (parent.className ?? '').toString().toLowerCase();
        if (cls.includes('ad-module') || cls.includes('ad-overlay') ||
            cls.includes('ad-player') || cls.includes('ad-skip') ||
            cls.includes('video-ads')) {
          return 1;
        }
        if (cls.includes('ad')) return 0.7;
        parent = parent.parentElement;
        depth++;
      }
      return 0;
    },
  },
  {
    // Bonus for text that resembles "skip" in any language (fuzzy)
    name: 'skip-text-fuzzy',
    weight: 0.10,
    score: (el) => {
      const text = (el.textContent ?? '').trim().toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') ?? '').toLowerCase();
      const combined = text + ' ' + ariaLabel;
      if (combined.includes('skip')) return 1;
      if (combined.includes('passer') || combined.includes('saltar') ||
          combined.includes('pular') || combined.includes('lewati') ||
          combined.includes('atla') || combined.includes('überspringen')) return 0.9;
      // Very short text on a button inside the ad area is suspicious in a good way
      if (text.length > 0 && text.length <= 15) return 0.3;
      return 0;
    },
  },
];

/** Minimum heuristic score to accept a button as the skip button */
const DISCOVERY_THRESHOLD = 0.55;

/**
 * Discover the skip button by scoring all candidate buttons.
 * This is the self-healing layer — it finds the button even when YouTube
 * renames every class, as long as the button is a visible button inside
 * the player during an ad.
 */
export function discoverSkipButton(): HTMLElement | null {
  const player = document.querySelector(PLAYER_SELECTOR);
  if (!player) return null;

  const buttons = player.querySelectorAll<HTMLElement>('button');
  let bestButton: HTMLElement | null = null;
  let bestScore = 0;

  for (const button of buttons) {
    if (!isVisible(button) || !isClickable(button)) continue;

    let score = 0;
    for (const signal of HEURISTIC_SIGNALS) {
      score += signal.weight * signal.score(button, player);
    }

    if (score > bestScore) {
      bestScore = score;
      bestButton = button;
    }
  }

  if (bestButton && bestScore >= DISCOVERY_THRESHOLD) {
    console.debug(
      `[Ski] Heuristic discovery found skip button (score: ${bestScore.toFixed(2)})`,
      bestButton
    );
    return bestButton;
  }

  // Throttled diagnostic warning
  if (isAdShowing() && buttons.length > 0) {
    console.debug(
      `[Ski] No skip button found during ad. ` +
      `Best candidate scored ${bestScore.toFixed(2)} (threshold: ${DISCOVERY_THRESHOLD}). ` +
      `The ad may be unskippable, or YouTube changed its structure significantly.`
    );
  }

  return null;
}

// ── Selector learning ───────────────────────────────────────────────────

/**
 * Extract the most useful CSS selector from a discovered button and
 * persist it so we try it first next time.
 */
function learnSelector(button: HTMLElement): void {
  const selectors: string[] = [];

  // If it has an id
  if (button.id) {
    selectors.push(`#${CSS.escape(button.id)}`);
  }

  // If it has specific class names
  if (button.classList.length > 0) {
    const classSelector = `button.${Array.from(button.classList)
      .map(c => CSS.escape(c))
      .join('.')}`;
    selectors.push(classSelector);
  }

  // If it has an aria-label
  const ariaLabel = button.getAttribute('aria-label');
  if (ariaLabel) {
    selectors.push(`button[aria-label="${CSS.escape(ariaLabel)}"]`);
  }

  // If its parent has useful classes
  if (button.parentElement && button.parentElement.classList.length > 0) {
    const parentClasses = Array.from(button.parentElement.classList)
      .filter(c => c.includes('skip') || c.includes('ad'))
      .map(c => CSS.escape(c));
    if (parentClasses.length > 0) {
      selectors.push(`.${parentClasses.join('.')} button`);
    }
  }

  // Save each discovered selector
  for (const sel of selectors) {
    if (SKIP_BUTTON_SELECTORS.includes(sel)) continue;
    saveLearnedSelector(sel);
  }
}

// ── Click method ────────────────────────────────────────────────────────

/**
 * Click the skip button using multiple strategies for maximum reliability.
 *
 * Strategy:
 * 1. Focus the button, then call .click() — HTMLElement.click() produces a
 *    trusted click event (isTrusted: true), which is what YouTube checks.
 * 2. If the button has an ancestor with a click handler (some YouTube layouts
 *    put the handler on the container), walk up and click that too.
 *
 * IMPORTANT: We deliberately do NOT dispatch synthetic pointer/mouse events.
 * Those events have isTrusted: false and can trigger YouTube's anti-automation
 * detection, causing it to ignore even the legitimate .click() call.
 */
export function clickSkipButton(button: HTMLElement): void {
  // Strategy 1: Focus + native .click() — produces isTrusted: true
  try {
    button.focus({ preventScroll: true });
  } catch {
    // focus() can throw in some edge cases; non-critical
  }
  button.click();

  // Strategy 2: Also click the nearest ad-related container
  // Some YouTube layouts attach the skip handler to a parent element
  const container = button.closest(
    '.ytp-ad-skip-button-container, .ytp-ad-skip-button-slot, [class*="skip"]'
  ) as HTMLElement | null;
  if (container && container !== button) {
    container.click();
  }
}
