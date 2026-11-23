/**
 * DOM fixtures: YouTube player in various states.
 * Captured from YouTube's player DOM structure.
 * Used by detector fixture tests.
 *
 * Last updated: 2026-11-23 from live YouTube.
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
 * DOM fixture: YouTube player with non-English skip button.
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

// ── Self-healing test state ─────────────────────────────────────────────

/**
 * DOM fixture: YouTube player where ALL class names have changed.
 * This simulates a YouTube update that breaks every hardcoded selector.
 * The self-healing heuristic detector should still find the button.
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
