/**
 * Detector module — finds and validates the Skip button.
 *
 * LAYERED DETECTION (most specific → least specific):
 * 1. Learned selectors — discovered at runtime when YouTube changes
 * 2. Known class selectors from selectors.ts (fastest, most specific)
 * 3. Structural fallback: buttons/role-buttons inside the player matching
 *    Skip text or aria-label in any supported language
 * 4. Heuristic discovery: score ALL interactive elements in the player by
 *    text content, position, size, element type, and proximity to ad
 *    elements — the self-healing layer
 *
 * The heuristic layer is what makes the extension survive YouTube changes
 * automatically. When it discovers a button the known selectors missed,
 * it learns the selector and uses it first next time.
 */

import {
  SKIP_BUTTON_SELECTORS,
  PLAYER_SELECTOR,
  AD_SHOWING_CLASS,
  AD_CONTAINER_SELECTORS,
  SKIP_STRINGS,
  SKIP_ARIA_PATTERNS,
} from './selectors';

// ── Learned selectors cache ─────────────────────────────────────────────

/** Selectors discovered at runtime (tried before hardcoded ones) */
let learnedSelectors: string[] = [];

/** Storage key for persisted learned selectors */
const LEARNED_SELECTORS_KEY = 'ski_learned_selectors';
const LEARNED_SELECTORS_MAX = 10;

/** Load learned selectors from storage on init and keep synced across frames */
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

/** Sync learned selectors if another frame updates local storage */
try {
  browser.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'local' || !(LEARNED_SELECTORS_KEY in changes)) return;
    const next = changes[LEARNED_SELECTORS_KEY]?.newValue;
    if (Array.isArray(next)) {
      learnedSelectors = next.filter((s): s is string => typeof s === 'string');
    }
  });
} catch {
  // Non-critical in unit tests without full extension runtime
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

/**
 * Resolve the active YouTube player element in priority order.
 * Using a single comma-joined querySelector can return an earlier feed/preview
 * `.html5-video-player` instead of `#movie_player`.
 */
export function getPlayerElement(): Element | null {
  return (
    document.querySelector('#movie_player.ad-showing, .html5-video-player.ad-showing') ??
    document.getElementById('movie_player') ??
    document.querySelector('ytm-player') ??
    document.querySelector('.html5-video-player') ??
    document.querySelector('.player-container')
  );
}

/**
 * Check if the player is currently showing an ad.
 *
 * Uses multiple detection strategies to survive YouTube renaming
 * the ad-showing class:
 * 1. Check for the known ad-showing class on the player
 * 2. Broader selector fallback for different player IDs
 * 3. Check for visible ad overlay containers inside the player
 * 4. Check for ad-related classes on the player (pattern match)
 */
export function isAdShowing(): boolean {
  const player = getPlayerElement();

  // Strategy 1: Known ad-showing class on the player
  if (player && player.classList.contains(AD_SHOWING_CLASS)) return true;

  // Strategy 2: Broader selector for different player structures
  const adPlayer = document.querySelector(
    '.html5-video-player.ad-showing, #movie_player.ad-showing, [class*="video-player"].ad-showing'
  );
  if (adPlayer) return true;

  // Strategy 3: Active video-ad overlay containers inside the player.
  // Exclude .ytp-ad-overlay-container (companion/banner cards that persist over main video).
  if (player) {
    for (const sel of AD_CONTAINER_SELECTORS) {
      if (sel === '.ytp-ad-overlay-container') continue;
      try {
        const overlay = player.querySelector<HTMLElement>(sel);
        if (overlay && overlay.children.length > 0 && isVisible(overlay)) {
          return true;
        }
      } catch { /* invalid selector */ }
    }
  }

  // Strategy 4: Pattern match for ad-related classes on the player
  // Catches renamed variants like "ad-active", "ad-interrupting", "ad-playing"
  if (player) {
    const cls = player.className.toString().toLowerCase();
    if (/\bad-\w*show|\bad-\w*play|\bad-\w*active|\bad-\w*interrupt/.test(cls)) {
      return true;
    }
  }

  return false;
}

/**
 * Find the visible, clickable Skip button.
 * Returns the button element or null if not found/not ready.
 *
 * Detection order:
 * 1. Learned selectors (fastest — already discovered this session)
 * 2. Known CSS selectors from selectors.ts
 * 3. Text/aria structural match (finds buttons by skip text in any language)
 * 4. Heuristic discovery (self-healing — scores all candidate elements)
 */
export function findSkipButton(): HTMLElement | null {
  // Gate: only search during ads
  if (!isAdShowing()) {
    return null;
  }

  const player = getPlayerElement();
  const queryRoots: ParentNode[] = player ? [player, document] : [document];

  // Layer 1: Learned selectors (prefer player scope, fall back to document)
  for (const root of queryRoots) {
    for (const selector of learnedSelectors) {
      try {
        const button = root.querySelector<HTMLElement>(selector);
        if (button && isVisible(button) && isClickable(button) && !isCountdownOrEmpty(button)) {
          if (matchesSkipText(button) || hasSkipLikeClass(button)) {
            return button;
          }
        }
      } catch {
        // Invalid selector — skip
      }
    }
  }

  // Layer 2: Known CSS selectors (prefer player scope, fall back to document)
  for (const root of queryRoots) {
    for (const selector of SKIP_BUTTON_SELECTORS) {
      try {
        const els = root.querySelectorAll<HTMLElement>(selector);
        for (const button of els) {
          if (isVisible(button) && isClickable(button) && !isCountdownOrEmpty(button)) {
            return button;
          }
        }
      } catch { /* invalid selector */ }
    }
  }

  // Layer 3: Structural fallback — interactive elements with skip text
  // Searches buttons AND role="button" elements (YouTube may change element types)
  if (player) {
    const candidates = player.querySelectorAll<HTMLElement>(
      'button, [role="button"], a[class*="skip" i], a[class*="ad" i]'
    );
    for (const el of candidates) {
      if (isVisible(el) && isClickable(el) && !isCountdownOrEmpty(el) && matchesSkipText(el)) {
        // This element matched by text — learn its selector for next time
        learnSelector(el);
        return el;
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
  // Fast native check (Firefox 106+, Chrome 105+) — catches ancestor display/visibility/content-visibility.
  // Intentionally omits checkOpacity so fade-in transitions or .ytp-autohide wrappers don't block clickable buttons.
  const checkVis = (el as HTMLElement & {
    checkVisibility?: (opts?: { checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean;
  }).checkVisibility;
  if (typeof checkVis === 'function') {
    try {
      if (!checkVis.call(el, { checkVisibilityCSS: true })) {
        return false;
      }
    } catch {
      // Fall through to manual checks
    }
  }

  // Check element and ancestors for inline/computed display/visibility/clip-path/pointer-events hiding
  let current: HTMLElement | null = el;
  for (let depth = 0; depth < 10 && current; depth++) {
    if (current.hasAttribute('hidden')) return false;
    if (current.style.display === 'none') return false;
    if (current.style.visibility === 'hidden') return false;
    if (current === el && current.style.opacity === '0') return false;

    try {
      const style = getComputedStyle(current);
      if (style.display === 'none') return false;
      if (style.visibility === 'hidden') return false;
      if (style.pointerEvents === 'none') return false;
      if (current === el && style.opacity === '0') return false;
      if (style.clipPath === 'inset(100%)') return false;
    } catch {
      // getComputedStyle can throw in edge cases
    }

    if (current === document.body) break;
    current = current.parentElement;
  }

  // Check bounding box — zero-size elements are invisible in real browsers
  const rect = el.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return true;
  }

  // In a real browser (where checkVisibility exists or documentElement has layout),
  // a 0x0 bounding box is definitively invisible (e.g. collapsed countdown button).
  const hasLayoutEngine =
    typeof checkVis === 'function' ||
    (document.documentElement?.getBoundingClientRect().width ?? 0) > 0;
  if (hasLayoutEngine) {
    return false;
  }

  // Layoutless test environment (jsdom): all ancestor & self style checks passed
  return true;
}

/** Check if an element is likely clickable (not disabled) */
export function isClickable(el: HTMLElement): boolean {
  if (el instanceof HTMLButtonElement && el.disabled) return false;
  if (el.getAttribute('aria-disabled') === 'true') return false;
  if (el.hasAttribute('disabled')) return false;
  return true;
}

/** Reject empty oval placeholders or countdown-only labels ("5", "Skip in 5s") */
function isCountdownOrEmpty(el: HTMLElement): boolean {
  const text = (el.textContent ?? '').trim();
  const aria = (el.getAttribute('aria-label') ?? '').trim();
  if (!text && !aria) return true;
  if (/^\d+\s*s?$/i.test(text)) return true;
  if (/\bskip\s+in\s+\d/i.test(text) || /\bskip\s+in\s+\d/i.test(aria)) return true;
  return false;
}

/**
 * Check if an element's text or aria-label matches a known "Skip" string.
 * Supports 30+ languages via SKIP_STRINGS and SKIP_ARIA_PATTERNS.
 */
export function matchesSkipText(el: HTMLElement): boolean {
  // Check aria-label against multilingual patterns
  const ariaLabel = el.getAttribute('aria-label') ?? '';
  if (ariaLabel) {
    for (const pattern of SKIP_ARIA_PATTERNS) {
      if (pattern.test(ariaLabel)) return true;
    }
  }

  // Check visible text content against all known skip strings
  const text = (el.textContent ?? '').trim();
  if (!text) return false;
  for (const skipStr of SKIP_STRINGS) {
    if (text.startsWith(skipStr)) return true;
  }

  // Fallback: case-insensitive check for "skip" anywhere in short text
  // (catches "Skip >" or "Skip →" variants)
  if (text.length <= 30 && /skip/i.test(text)) return true;

  return false;
}

/** Check if an element has class names that look skip-related */
function hasSkipLikeClass(el: HTMLElement): boolean {
  const cls = (el.className ?? '').toString().toLowerCase();
  return cls.includes('skip') && (cls.includes('ad') || cls.includes('button'));
}

// ── Self-healing heuristic discovery ────────────────────────────────────

/**
 * Heuristic signals for scoring a candidate skip button.
 * Each signal returns 0-1; the final score is a weighted sum.
 *
 * WEIGHT RATIONALE:
 * - skip-text-match (0.30): Text saying "Skip" is the strongest signal.
 *   Even with fully obfuscated class names and no aria-label, text alone
 *   should nearly reach the threshold.
 * - position (0.15): Skip buttons are in the bottom-right of the player.
 * - class-hint (0.12): Bonus for "skip" or "ad" in class names.
 * - ad-ancestor (0.13): Bonus for being inside an ad-related container.
 * - element-type (0.10): Buttons and role="button" score higher.
 * - text-length (0.10): Skip buttons have short, action-like text.
 * - has-label (0.05): Bonus for having an aria-label.
 * - element-size (0.05): Skip buttons have a reasonable clickable size.
 *
 * With FULLY obfuscated classes, no aria-label, but text "Skip" at
 * bottom-right as a <button>:
 *   0.30 + 0.15 + 0 + 0 + 0.10 + 0.10 + 0 + 0.05 = 0.70 ✓ (above 0.55)
 */
interface HeuristicSignal {
  name: string;
  weight: number;
  score: (el: HTMLElement, player: Element) => number;
}

const HEURISTIC_SIGNALS: HeuristicSignal[] = [
  {
    // THE MOST IMPORTANT SIGNAL: does the text say "Skip"?
    name: 'skip-text-match',
    weight: 0.30,
    score: (el) => {
      const text = (el.textContent ?? '').trim().toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') ?? '').toLowerCase();
      const combined = text + ' ' + ariaLabel;

      // Exact match for "skip" in any language
      if (matchesSkipText(el)) return 1;

      // Fuzzy: contains "skip" or known translations
      if (combined.includes('skip')) return 0.9;
      if (combined.includes('passer') || combined.includes('saltar') ||
          combined.includes('pular') || combined.includes('lewati') ||
          combined.includes('atla') || combined.includes('überspringen') ||
          combined.includes('overslaan') || combined.includes('salta') ||
          combined.includes('pomiń') || combined.includes('přeskočit') ||
          combined.includes('пропустить') || combined.includes('スキップ') ||
          combined.includes('건너뛰기') || combined.includes('跳过') ||
          combined.includes('跳過') || combined.includes('تخطي') ||
          combined.includes('ข้าม') || combined.includes('ohita') ||
          combined.includes('ruka')) return 0.9;

      // Very short text on a button inside the ad area is mildly suspicious
      if (text.length > 0 && text.length <= 10) return 0.2;
      return 0;
    },
  },
  {
    // Skip buttons are near the bottom-right of the player
    name: 'position',
    weight: 0.15,
    score: (el, player) => {
      const pRect = player.getBoundingClientRect();
      const bRect = el.getBoundingClientRect();
      if (pRect.width === 0 || pRect.height === 0) return 0.5; // Can't tell (jsdom)
      const relX = (bRect.left - pRect.left) / pRect.width;
      const relY = (bRect.top - pRect.top) / pRect.height;
      let score = 0;
      if (relY > 0.5) score += 0.5;  // bottom half
      if (relX > 0.4) score += 0.5;  // right side
      return score;
    },
  },
  {
    // Bonus for class names containing "skip" or "ad"
    name: 'class-hint',
    weight: 0.12,
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
    // Skip buttons are inside an overlay/ad module, not the main controls
    name: 'ad-ancestor',
    weight: 0.13,
    score: (el) => {
      let parent = el.parentElement;
      let depth = 0;
      while (parent && depth < 8) {
        const cls = (parent.className ?? '').toString().toLowerCase();
        if (cls.includes('ad-module') || cls.includes('ad-overlay') ||
            cls.includes('ad-player') || cls.includes('ad-skip') ||
            cls.includes('video-ads') || cls.includes('ad-container')) {
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
    // <button> and role="button" elements are more likely to be the skip button
    name: 'element-type',
    weight: 0.10,
    score: (el) => {
      if (el.tagName === 'BUTTON') return 1;
      if (el.getAttribute('role') === 'button') return 0.9;
      if (el.tagName === 'A') return 0.5;
      if (el.hasAttribute('tabindex')) return 0.4;
      return 0;
    },
  },
  {
    // Skip buttons contain short, action-like text
    name: 'text-length',
    weight: 0.10,
    score: (el) => {
      const text = (el.textContent ?? '').trim();
      if (text.length === 0) return 0;
      if (text.length <= 20) return 1;
      if (text.length <= 40) return 0.5;
      return 0;
    },
  },
  {
    // Skip buttons may have an aria-label
    name: 'has-label',
    weight: 0.05,
    score: (el) => {
      if (el.getAttribute('aria-label')) return 1;
      if (el.getAttribute('title')) return 0.8;
      return 0;
    },
  },
  {
    // Skip buttons have a reasonable clickable size (not tiny icons)
    name: 'element-size',
    weight: 0.05,
    score: (el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return 0.5; // Can't tell (jsdom)
      const area = rect.width * rect.height;
      // Skip buttons are typically 60-200px wide and 30-50px tall
      if (area >= 1000 && area <= 20000) return 1;
      if (area > 0 && area < 1000) return 0.3;  // Too small
      if (area > 20000) return 0.2;              // Too large
      return 0;
    },
  },
];

/** Minimum heuristic score to accept a button as the skip button */
const DISCOVERY_THRESHOLD = 0.55;

/**
 * Discover the skip button by scoring all candidate interactive elements.
 * This is the self-healing layer — it finds the button even when YouTube
 * renames every class, as long as it's a visible interactive element
 * inside the player during an ad with text resembling "Skip".
 *
 * Searches: <button>, [role="button"], <a>, and elements with tabindex.
 */
export function discoverSkipButton(): HTMLElement | null {
  const player = getPlayerElement();
  if (!player) return null;

  // Search buttons AND other interactive elements
  const candidates = player.querySelectorAll<HTMLElement>(
    'button, [role="button"], a, [tabindex]'
  );
  let bestButton: HTMLElement | null = null;
  let bestScore = 0;

  // Split cheap DOM/text signals from layout-forcing getBoundingClientRect() signals
  const cheapSignals = HEURISTIC_SIGNALS.filter(
    s => s.name !== 'position' && s.name !== 'element-size'
  );
  const layoutSignals = HEURISTIC_SIGNALS.filter(
    s => s.name === 'position' || s.name === 'element-size'
  );
  const maxLayoutContribution = layoutSignals.reduce((sum, s) => sum + s.weight, 0);

  for (const el of candidates) {
    if (!isVisible(el) || !isClickable(el) || isCountdownOrEmpty(el)) continue;

    let score = 0;
    for (const signal of cheapSignals) {
      score += signal.weight * signal.score(el, player);
    }

    // Short-circuit before forcing synchronous layout if candidate cannot reach threshold
    if (score + maxLayoutContribution < DISCOVERY_THRESHOLD) {
      continue;
    }

    for (const signal of layoutSignals) {
      score += signal.weight * signal.score(el, player);
    }

    if (score > bestScore) {
      bestScore = score;
      bestButton = el;
    }
  }

  if (bestButton && bestScore >= DISCOVERY_THRESHOLD) {
    console.debug(
      `[Ski] Heuristic discovery found skip button (score: ${bestScore.toFixed(2)})`,
      bestButton
    );
    return bestButton;
  }

  if (candidates.length > 0) {
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
 * Extract the most useful CSS selectors from a discovered element and
 * persist them so we try them first next time.
 *
 * Learns INDIVIDUAL distinctive classes (not the full class list) so
 * the learned selector survives YouTube adding or removing other classes
 * on the same element.
 */
const GENERIC_CHROME_CLASSES = new Set([
  'ytp-button',
  'ytp-icon',
  'ytp-menuitem',
  'ytp-control',
  'yt-spec-button-shape-next',
]);

function learnSelector(button: HTMLElement): void {
  const selectors: string[] = [];
  const tag = button.tagName.toLowerCase();

  // If it has an id
  if (button.id) {
    selectors.push(`#${CSS.escape(button.id)}`);
  }

  // Learn INDIVIDUAL skip-specific classes (never generic chrome like ytp-button)
  if (button.classList.length > 0) {
    for (const cls of button.classList) {
      const lower = cls.toLowerCase();
      if (GENERIC_CHROME_CLASSES.has(lower)) continue;
      if (lower.includes('skip') || lower.includes('ad-skip')) {
        selectors.push(`${tag}.${CSS.escape(cls)}`);
      }
    }
    // If no skip-specific classes, learn the full class set only if it has non-generic classes
    if (selectors.length === 0) {
      const nonGeneric = Array.from(button.classList).filter(
        c => !GENERIC_CHROME_CLASSES.has(c.toLowerCase())
      );
      if (nonGeneric.length > 0) {
        selectors.push(`${tag}.${nonGeneric.map(c => CSS.escape(c)).join('.')}`);
      }
    }
  }

  // If it has a skip-like aria-label, learn an attribute selector
  const ariaLabel = button.getAttribute('aria-label');
  if (ariaLabel && matchesSkipText(button)) {
    selectors.push(`${tag}[aria-label="${CSS.escape(ariaLabel)}"]`);
  }

  // Learn parent context selectors (skip-specific containers only)
  if (button.parentElement && button.parentElement.classList.length > 0) {
    for (const cls of button.parentElement.classList) {
      const lower = cls.toLowerCase();
      if (lower.includes('skip') || lower.includes('ad-skip') || lower.includes('ad-button')) {
        selectors.push(`.${CSS.escape(cls)} ${tag}`);
      }
    }
  }

  // Save each discovered selector (skip duplicates of known ones)
  for (const sel of selectors) {
    if (SKIP_BUTTON_SELECTORS.includes(sel)) continue;
    saveLearnedSelector(sel);
  }
}

// ── Click method ────────────────────────────────────────────────────────

/**
 * Dispatch a realistic pointer + mouse + click sequence on the target element.
 * YouTube's Polymer/mobile gesture handlers may listen for pointerdown/mouseup
 * rather than synthetic .click() alone.
 */
function dispatchRealisticClick(el: HTMLElement): void {
  try {
    const rect = el.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const commonInit: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX,
      clientY,
      button: 0,
    };

    if (typeof PointerEvent === 'function') {
      el.dispatchEvent(new PointerEvent('pointerdown', { ...commonInit, pointerId: 1, isPrimary: true }));
    }
    el.dispatchEvent(new MouseEvent('mousedown', commonInit));
    if (typeof PointerEvent === 'function') {
      el.dispatchEvent(new PointerEvent('pointerup', { ...commonInit, pointerId: 1, isPrimary: true }));
    }
    el.dispatchEvent(new MouseEvent('mouseup', commonInit));
  } catch {
    // Fallback cleanly to .click()
  }

  el.click();
}

/**
 * Click the skip button using native event dispatch, scoped fallback
 * element clicks, and main-world helper notification.
 *
 * Retry & consecutive-ad coordination is handled by the unified
 * state machine in observer.ts / content.ts (no competing interval timers).
 */
export function clickSkipButton(button: HTMLElement): void {
  // ── 1. Focus + realistic pointer/mouse/click sequence on the button ──
  try { button.focus({ preventScroll: true }); } catch { /* non-critical */ }
  dispatchRealisticClick(button);

  // ── 2. Deduplicated fallback for split/layered skip elements ──
  clickAllSkipElements(button);

  // ── 3. Dispatch to main-world helper (handles moviePlayer.skipAd()) ──
  try { document.dispatchEvent(new CustomEvent('__ski_skip')); } catch { /* noop */ }
}

/**
 * Safely seek the active ad video to its end ONLY when the player still
 * confirms `ad-showing`. Scoped strictly to `player.querySelector('video')`
 * so main content videos are never touched.
 */
export function seekAdVideoIfStillShowing(): boolean {
  const player = getPlayerElement();
  if (!player || !isAdShowing()) {
    return false;
  }
  const video = player.querySelector<HTMLVideoElement>('video');
  if (video && video.duration && isFinite(video.duration) && video.currentTime < video.duration - 0.5) {
    video.currentTime = video.duration;
    console.debug('[Ski] Escalation: seeked active ad video to end');
    return true;
  }
  return false;
}

/**
 * Click any additional visible skip buttons inside the player (deduplicated).
 */
function clickAllSkipElements(exclude: HTMLElement | null): void {
  const clicked = new Set<HTMLElement>();
  if (exclude) clicked.add(exclude);

  const player = getPlayerElement();
  const queryRoot: ParentNode = player ?? document;

  const allSelectors = [
    ...SKIP_BUTTON_SELECTORS,
    '.ytp-ad-skip-button-container',
    '.ytp-ad-skip-button-container button',
    '.ytp-ad-skip-button-slot',
    '.ytp-ad-skip-button-slot button',
    '[class*="skip-ad"][class*="button"]',
  ];

  for (const sel of allSelectors) {
    try {
      queryRoot.querySelectorAll<HTMLElement>(sel).forEach(el => {
        if (!clicked.has(el) && isVisible(el) && isClickable(el)) {
          clicked.add(el);
          el.click();
        }
      });
    } catch { /* noop */ }
  }

  // Text-matched elements inside the player (multilingual)
  if (player) {
    player.querySelectorAll<HTMLElement>('button, [role="button"]').forEach(el => {
      if (!clicked.has(el) && isVisible(el) && isClickable(el) && matchesSkipText(el)) {
        clicked.add(el);
        el.click();
      }
    });
  }
}
