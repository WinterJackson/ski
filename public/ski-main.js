// Ski Extension — Main-world skip helper
// Runs in YouTube's JavaScript context (not the extension's isolated world)
// to access internal player APIs and click buttons from the page's context.
//
// Communication: listens for '__ski_skip' CustomEvent from the content script.
(function() {
  'use strict';
  if (window.__skiLoaded) return;
  window.__skiLoaded = true;

  document.addEventListener('__ski_skip', function() {
    var success = false;

    // ── Strategy A: Click all visible skip buttons from page context ──
    var selectors = [
      'button.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-modern',
      'button.ytp-skip-ad-button',
      '.ytp-skip-ad-button',
      'button.ytp-ad-skip-button',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-container button',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-skip-button-container',
      '.ytp-ad-skip-button-slot',
    ];

    for (var i = 0; i < selectors.length; i++) {
      try {
        var els = document.querySelectorAll(selectors[i]);
        for (var j = 0; j < els.length; j++) {
          var el = els[j];
          if (el.offsetParent !== null || el.offsetWidth > 0) {
            el.click();
            success = true;
          }
        }
      } catch(e) {}
    }

    // ── Strategy B: Find buttons by text content in the player ──
    if (!success) {
      var player = document.querySelector('#movie_player') ||
                   document.querySelector('.html5-video-player');
      if (player) {
        var items = player.querySelectorAll(
          'button, [role="button"], a.ytp-ad-button'
        );
        for (var k = 0; k < items.length; k++) {
          var text = (items[k].textContent || '').trim();
          if (/^skip/i.test(text) && (items[k].offsetParent !== null || items[k].offsetWidth > 0)) {
            items[k].click();
            success = true;
          }
        }
      }
    }

    // ── Strategy C: Seek every playing video past its end ──
    // This causes the ad to finish naturally, triggering YouTube's
    // own ad-completion handler → transitions to the content video.
    if (!success) {
      var videos = document.querySelectorAll('video');
      for (var v = 0; v < videos.length; v++) {
        var vid = videos[v];
        if (!vid.paused && vid.duration && isFinite(vid.duration)) {
          vid.currentTime = vid.duration;
          success = true;
        }
      }
    }
  });
})();
