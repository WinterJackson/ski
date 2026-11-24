// Ski Extension — Main-world skip helper
// Runs in YouTube's JavaScript context (not the extension's isolated world)
// to access YouTube's internal player API and click buttons from the
// page's own execution context.
//
// Communication: listens for '__ski_skip' CustomEvent from the content script.
(function() {
  'use strict';
  if (window.__skiLoaded) return;
  window.__skiLoaded = true;

  document.addEventListener('__ski_skip', function() {
    // ── Strategy A: Click all visible skip buttons from page context ──
    var selectors = [
      'button.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-modern',
      'button.ytp-skip-ad-button',
      '.ytp-skip-ad-button',
      'button.ytp-ad-skip-button',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-container button',
      '.ytp-ad-skip-button-container',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-skip-button-slot',
      '.ytp-ad-skip-button-container [role="button"]',
      '.ytp-ad-skip-button-slot [role="button"]',
    ];

    var clicked = false;
    for (var i = 0; i < selectors.length; i++) {
      try {
        var els = document.querySelectorAll(selectors[i]);
        for (var j = 0; j < els.length; j++) {
          var el = els[j];
          if (el.offsetParent !== null || el.offsetWidth > 0) {
            el.click();
            clicked = true;
          }
        }
      } catch(e) {}
    }

    // ── Strategy B: Text-match buttons inside the player (multilingual) ──
    if (!clicked) {
      var player = document.getElementById('movie_player') ||
                   document.querySelector('.html5-video-player');
      if (player) {
        var items = player.querySelectorAll(
          'button, [role="button"], a.ytp-ad-button'
        );
        // Known skip text patterns across languages
        var skipPatterns = /^(skip|passer|saltar|pular|salta|overslaan|überspringen|atla|ohita|pomiń|přeskočit|omiteți|παράλειψη|пропустить|пропустити|スキップ|건너뛰기|跳过|跳過|تخطي|تخطى|דלג|छोड़ें|ข้าม|lewati|langkau|ruka|hoppa|spring|hopp)/i;
        for (var k = 0; k < items.length; k++) {
          var text = (items[k].textContent || '').trim();
          if (skipPatterns.test(text) && (items[k].offsetParent !== null || items[k].offsetWidth > 0)) {
            items[k].click();
            clicked = true;
          }
        }
      }
    }

    // ── Strategy C: YouTube Player API ──
    // The internal player object has methods only accessible from main world.
    if (!clicked) {
      try {
        var moviePlayer = document.getElementById('movie_player');
        if (moviePlayer) {
          if (typeof moviePlayer.skipAd === 'function') {
            moviePlayer.skipAd();
            return;
          }
        }
      } catch(e) {}
    }

    // ── Strategy D: Seek every playing video past its end ──
    // This causes the ad to end naturally, triggering YouTube's own
    // ad-completion handler which transitions to the content video.
    if (!clicked) {
      var videos = document.querySelectorAll('video');
      for (var v = 0; v < videos.length; v++) {
        var vid = videos[v];
        if (vid.duration && isFinite(vid.duration) && vid.currentTime < vid.duration - 0.5) {
          vid.currentTime = vid.duration;
        }
      }
    }
  });
})();
