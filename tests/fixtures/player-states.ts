/**
 * DOM fixtures: YouTube player in various states.
 * Captured from YouTube's player DOM structure.
 * Used by detector fixture tests.
 *
 * Last updated: 2026-11-24 from live YouTube.
 *
 * IMPORTANT: Includes "nuclear" fixtures where ALL class names are fully
 * obfuscated (no "skip", "ad", or recognizable patterns in any class name).
 * These test the self-healing heuristic's ability to find the skip button
 * purely by text content, element type, and position.
 */

// ── Skippable ad states ─────────────────────────────────────────────────

/**
 * DOM fixture: Legacy YouTube player in "skippable ad" state.
 * Uses the classic .ytp-skip-ad-button class.
 */
export const FIXTURE_SKIPPABLE_AD = `
<div class="html5-video-player ad-showing">
  <div class="ytp-ad-module">
    <div class="ytp-ad-player-overlay">
      <div class="ytp-ad-skip-button-container">
        <button class="ytp-skip-ad-button" aria-label="Skip Ad" style="display: block;">
          <span class="ytp-ad-skip-ad-label">Skip Ad</span>
        </button>
      </div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

/**
 * DOM fixture: Modern YouTube player (2024–2026) in "skippable ad" state.
 * Uses the .ytp-ad-skip-button-modern class with the slot pattern.
 */
export const FIXTURE_SKIPPABLE_AD_MODERN = `
<div id="movie_player" class="html5-video-player ad-showing ad-created ad-interrupting">
  <div class="video-ads ytp-ad-module">
    <div class="ytp-ad-player-overlay">
      <div class="ytp-ad-skip-button-slot">
        <button class="ytp-ad-skip-button-modern ytp-button" style="display: block;">
          <div class="ytp-ad-text">Skip</div>
          <div class="ytp-ad-skip-button-icon"></div>
        </button>
      </div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

/**
 * DOM fixture: YouTube player (Nov 2026 live capture) with fullscreen grid variant.
 * Uses .ytp-skip-ad-button with .ytp-skip-ad-button-fix-fullscreen-grid.
 */
export const FIXTURE_SKIPPABLE_AD_2026 = `
<div id="movie_player" class="html5-video-player ad-showing ad-created ad-interrupting">
  <div class="video-ads ytp-ad-module">
    <div class="ytp-ad-player-overlay">
      <div class="ytp-ad-skip-button-container">
        <button class="ytp-skip-ad-button ytp-skip-ad-button-fix-fullscreen-grid" style="display: block;">
          Skip
        </button>
      </div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

// ── Countdown state ─────────────────────────────────────────────────────

/**
 * DOM fixture: YouTube player during ad countdown (not yet skippable).
 * The skip button exists but is hidden.
 */
export const FIXTURE_COUNTDOWN = `
<div class="html5-video-player ad-showing">
  <div class="ytp-ad-module">
    <div class="ytp-ad-player-overlay">
      <div class="ytp-ad-skip-button-container">
        <button class="ytp-skip-ad-button" aria-label="Skip Ad" style="display: none;">
          <span class="ytp-ad-skip-ad-label">Skip Ad</span>
        </button>
      </div>
      <div class="ytp-ad-text">Ad · 0:05</div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

// ── No-ad state ─────────────────────────────────────────────────────────

/**
 * DOM fixture: YouTube player with no ad.
 */
export const FIXTURE_NO_AD = `
<div class="html5-video-player">
  <video class="html5-main-video"></video>
  <div class="ytp-chrome-bottom">
    <div class="ytp-progress-bar"></div>
  </div>
</div>
`;

// ── Unskippable ad state ────────────────────────────────────────────────

/**
 * DOM fixture: YouTube player with unskippable ad.
 */
export const FIXTURE_UNSKIPPABLE = `
<div class="html5-video-player ad-showing">
  <div class="ytp-ad-module">
    <div class="ytp-ad-player-overlay">
      <div class="ytp-ad-text">Ad · 0:15</div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

// ── Non-English state ───────────────────────────────────────────────────

/**
 * DOM fixture: YouTube player with non-English skip button (German).
 */
export const FIXTURE_NON_ENGLISH = `
<div class="html5-video-player ad-showing">
  <div class="ytp-ad-module">
    <div class="ytp-ad-player-overlay">
      <div class="ytp-ad-skip-button-container">
        <button class="ytp-skip-ad-button" aria-label="Überspringen" style="display: block;">
          <span class="ytp-ad-skip-ad-label">Überspringen</span>
        </button>
      </div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

/**
 * DOM fixture: YouTube player with Japanese skip button.
 * No aria-label, only text content — tests text-based detection.
 */
export const FIXTURE_NON_ENGLISH_JAPANESE = `
<div class="html5-video-player ad-showing">
  <div class="ytp-ad-module">
    <div class="ytp-ad-player-overlay">
      <div class="ytp-ad-skip-button-container">
        <button class="ytp-skip-ad-button" style="display: block;">
          <span class="ytp-ad-skip-ad-label">スキップ</span>
        </button>
      </div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

/**
 * DOM fixture: YouTube player with Spanish skip button.
 */
export const FIXTURE_NON_ENGLISH_SPANISH = `
<div class="html5-video-player ad-showing">
  <div class="ytp-ad-module">
    <div class="ytp-ad-player-overlay">
      <div class="ytp-ad-skip-button-container">
        <button class="ytp-skip-ad-button" aria-label="Saltar anuncio" style="display: block;">
          Saltar anuncio
        </button>
      </div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

// ── Self-healing test states ────────────────────────────────────────────

/**
 * DOM fixture: YouTube player where skip-related classes have changed
 * but still contain "skip" and "ad" substrings.
 * Tests that the heuristic handles renamed-but-recognizable classes.
 */
export const FIXTURE_UNKNOWN_CLASSES = `
<div class="html5-video-player ad-showing">
  <div class="xQ7-ad-container">
    <div class="xQ7-ad-overlay-wrap">
      <div class="xQ7-skip-wrap">
        <button class="xQ7-skip-action" aria-label="Skip Ad" style="display: block;">
          <span class="xQ7-skip-label">Skip Ad</span>
        </button>
      </div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

/**
 * DOM fixture: NUCLEAR TEST — YouTube player where ALL class names are fully
 * obfuscated random strings with NO recognizable substrings. No aria-label.
 * No "skip", "ad", "button" anywhere in the class hierarchy.
 *
 * The ONLY way to find this button is by its text content ("Skip")
 * and its element type (<button>).
 *
 * This tests the heuristic's most extreme scenario.
 * Expected score: ~0.65+ (above 0.55 threshold)
 *   skip-text-match: 0.30 ("Skip" text)
 *   position: 0.075 (jsdom can't tell)
 *   class-hint: 0
 *   ad-ancestor: 0
 *   element-type: 0.10 (<button>)
 *   text-length: 0.10 (4 chars)
 *   has-label: 0
 *   element-size: 0.025 (jsdom can't tell)
 */
export const FIXTURE_FULLY_OBFUSCATED = `
<div class="html5-video-player ad-showing">
  <div class="a7x2k">
    <div class="b3zPq">
      <button class="c9yRw" style="display: block;">
        Skip
      </button>
      <button class="d4wXx" style="display: block;">
        Learn more
      </button>
      <button class="e5tLm" style="display: block;">
        Why this ad?
      </button>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

/**
 * DOM fixture: NUCLEAR TEST with non-English text.
 * Fully obfuscated classes, no aria-label, Turkish skip text.
 */
export const FIXTURE_FULLY_OBFUSCATED_INTL = `
<div class="html5-video-player ad-showing">
  <div class="q8mNn">
    <div class="r2kJj">
      <button class="s5pBb" style="display: block;">
        Reklamı atla
      </button>
      <button class="t7hVv" style="display: block;">
        Daha fazla
      </button>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;

/**
 * DOM fixture: YouTube uses a role="button" div instead of a <button>.
 * Tests that the detector finds non-button interactive elements.
 */
export const FIXTURE_ROLE_BUTTON = `
<div class="html5-video-player ad-showing">
  <div class="ytp-ad-module">
    <div class="ytp-ad-player-overlay">
      <div class="ytp-ad-skip-button-container">
        <div role="button" class="ytp-skip-ad-button" tabindex="0" style="display: block;">
          Skip Ad
        </div>
      </div>
    </div>
  </div>
  <video class="html5-main-video"></video>
</div>
`;
