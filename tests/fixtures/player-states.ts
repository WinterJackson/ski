/**
 * DOM fixture: YouTube player in "skippable ad" state.
 * Captured from YouTube's player DOM structure.
 * Used by detector fixture tests.
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
