/**
 * ALL selectors and localized strings live here.
 * This is the most-edited file — when YouTube changes, update here.
 *
 * Selectors are ordered newest-first. The detector tries them in order
 * and stops at the first match.
 */

// ----- Skip button selectors (newest first) -----

/** CSS selectors for the Skip Ad button, ordered by specificity/recency */
export const SKIP_BUTTON_SELECTORS: readonly string[] = [
  // Modern YouTube (2024+)
  'button.ytp-skip-ad-button',
  '.ytp-skip-ad-button',
  'button.ytp-ad-skip-button-modern',
  '.ytp-ad-skip-button-modern',
  // Older variants
  'button.ytp-ad-skip-button',
  '.ytp-ad-skip-button',
  '.ytp-ad-skip-button-slot button',
  // Fallback: any button inside the skip container
  '.ytp-ad-skip-button-container button',
];

// ----- Player state selectors -----

/** Selector for the video player container */
export const PLAYER_SELECTOR = '.html5-video-player';

/** Class that YouTube adds to the player when an ad is showing */
export const AD_SHOWING_CLASS = 'ad-showing';

/** Full selector for a player currently showing an ad */
export const AD_SHOWING_SELECTOR = `.${AD_SHOWING_CLASS}`;

// ----- Localized "Skip" strings -----

/**
 * Known "Skip" button text in various languages.
 * Used as a structural fallback when class selectors fail.
 * Add new translations as they're discovered.
 */
export const SKIP_STRINGS: readonly string[] = [
  'Skip',         // English
  'Skip Ad',      // English (variant)
  'Skip Ads',     // English (plural)
  'Überspringen', // German
  'Passer',       // French
  'Saltar',       // Spanish
  'Pular',        // Portuguese
  'Lewati',       // Indonesian
  'Atla',         // Turkish
  'Пропустить',   // Russian
  'スキップ',      // Japanese
  '건너뛰기',      // Korean
  '跳过',          // Chinese (Simplified)
  '跳過',          // Chinese (Traditional)
  'تخطي',         // Arabic
  'छोड़ें',         // Hindi
];

// ----- aria-label patterns -----

/** Patterns to match the Skip button by aria-label */
export const SKIP_ARIA_PATTERNS: readonly RegExp[] = [
  /^skip/i,
  /^skip\s+ad/i,
];

