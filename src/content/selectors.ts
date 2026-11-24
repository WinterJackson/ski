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
  // Modern YouTube (2024–2026) — the new skip button with icon+text
  'button.ytp-ad-skip-button-modern',
  '.ytp-ad-skip-button-modern',
  // Modern variant with ytp-button base class
  '.ytp-ad-skip-button-slot button.ytp-button',
  '.ytp-ad-skip-button-slot button',
  '.ytp-ad-skip-button-slot [role="button"]',
  // Legacy selectors (still seen as fallbacks)
  'button.ytp-skip-ad-button',
  '.ytp-skip-ad-button',
  'button.ytp-ad-skip-button',
  '.ytp-ad-skip-button',
  // Container-based fallbacks
  '.ytp-ad-skip-button-container button',
  '.ytp-ad-skip-button-container [role="button"]',
  // Mobile YouTube web player selectors
  '.skip-button',
  '.mobile-topbar-header-sign-in-button + button',
  '.ad-skip-button',
  'button.skip-ad-button',
  // Attribute-based selector (works even if classes are obfuscated)
  'button[aria-label^="Skip"]',
  'button[aria-label^="skip"]',
  '[role="button"][aria-label^="Skip"]',
  '[role="button"][aria-label^="skip"]',
];

// ----- Player state selectors -----

/** Selector for the video player container */
export const PLAYER_SELECTOR = '#movie_player, .html5-video-player, .player-container, ytm-player';

/** Class that YouTube adds to the player when an ad is showing */
export const AD_SHOWING_CLASS = 'ad-showing';

/** Full selector for a player currently showing an ad */
export const AD_SHOWING_SELECTOR = `.${AD_SHOWING_CLASS}`;

// ----- Ad overlay selectors (for heuristic scoring & ad detection) -----

/** Selectors for ad-related containers to help discovery and ad detection */
export const AD_CONTAINER_SELECTORS: readonly string[] = [
  '.ytp-ad-module',
  '.video-ads',
  '.ytp-ad-player-overlay',
  '.ytp-ad-overlay-container',
  '.ytp-ad-player-overlay-layout',
];

// ----- Localized "Skip" strings -----

/**
 * Known "Skip" button text in various languages.
 * Used as a structural fallback when class selectors fail.
 * Add new translations as they're discovered.
 *
 * IMPORTANT: These are checked with text.startsWith(skipStr),
 * so "Skip" matches "Skip", "Skip Ad", "Skip Ads", etc.
 */
export const SKIP_STRINGS: readonly string[] = [
  // English
  'Skip',
  'Skip Ad',
  'Skip Ads',
  'Skip ad',
  'Skip ads',
  // German
  'Überspringen',
  'Werbung überspringen',
  // French
  'Passer',
  'Ignorer',
  "Passer l'annonce",
  // Spanish
  'Saltar',
  'Saltar anuncio',
  'Omitir',
  // Portuguese
  'Pular',
  'Pular anúncio',
  // Italian
  'Salta',
  "Salta l'annuncio",
  // Dutch
  'Overslaan',
  'Advertentie overslaan',
  // Swedish
  'Hoppa över',
  // Finnish
  'Ohita',
  // Norwegian
  'Hopp over',
  // Danish
  'Spring over',
  // Polish
  'Pomiń',
  // Czech
  'Přeskočit',
  // Romanian
  'Omiteți',
  // Hungarian
  'Kihagyás',
  // Greek
  'Παράλειψη',
  // Russian
  'Пропустить',
  // Ukrainian
  'Пропустити',
  // Turkish
  'Atla',
  'Reklamı atla',
  // Arabic
  'تخطي',
  'تخطى',
  // Hebrew
  'דלג',
  // Hindi
  'छोड़ें',
  // Thai
  'ข้าม',
  // Vietnamese
  'Bỏ qua',
  // Indonesian / Malay
  'Lewati',
  'Langkau',
  // Japanese
  'スキップ',
  '広告をスキップ',
  // Korean
  '건너뛰기',
  '광고 건너뛰기',
  // Chinese (Simplified)
  '跳过',
  '跳过广告',
  // Chinese (Traditional)
  '跳過',
  '跳過廣告',
  // Bengali
  'এড়িয়ে যান',
  // Tamil
  'தவிர்',
  // Swahili
  'Ruka',
];

// ----- aria-label patterns -----

/**
 * Patterns to match the Skip button by aria-label.
 * Covers English and common patterns across languages.
 */
export const SKIP_ARIA_PATTERNS: readonly RegExp[] = [
  /^skip/i,
  /^skip\s+ad/i,
  /^skip\s+ads/i,
  /überspringen/i,
  /passer/i,
  /saltar/i,
  /pular/i,
  /salta/i,
  /overslaan/i,
  /пропустить/i,
  /atla/i,
  /تخطي/,
  /スキップ/,
  /건너뛰기/,
  /跳过|跳過/,
  /lewati/i,
  /pomiń/i,
];
