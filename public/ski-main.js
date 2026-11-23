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

    // ── Strategy B: Text-match buttons inside the player ──
    if (!clicked) {
      var player = document.getElementById('movie_player') ||
                   document.querySelector('.html5-video-player');
      if (player) {
        var items = player.querySelectorAll(
          'button, [role="button"], a.ytp-ad-button'
        );
        for (var k = 0; k < items.length; k++) {
          var text = (items[k].textContent || '').trim();
          if (/^skip/i.test(text) && (items[k].offsetParent !== null || items[k].offsetWidth > 0)) {
            items[k].click();
            clicked = true;
          }
        }
      }
    }

    // ── Strategy C: YouTube Player API ──
    // The internal player object has methods only accessible from main world.
    try {
      var moviePlayer = document.getElementById('movie_player');
      if (moviePlayer) {
        // Some YouTube versions expose these methods
        if (typeof moviePlayer.skipAd === 'function') {
          moviePlayer.skipAd();
          return;
        }
        if (typeof moviePlayer.cancelPlayback === 'function') {
          // Cancel ad playback and reload the main video
          var videoData = typeof moviePlayer.getVideoData === 'function'
            ? moviePlayer.getVideoData()
            : null;
          if (videoData && videoData.video_id) {
            moviePlayer.cancelPlayback();
            setTimeout(function() {
              if (typeof moviePlayer.loadVideoById === 'function') {
                moviePlayer.loadVideoById(videoData.video_id);
              }
            }, 100);
            return;
          }
        }
      }
    } catch(e) {}

    // ── Strategy D: Seek every playing video past its end ──
    // This causes the ad to end naturally, triggering YouTube's own
    // ad-completion handler which transitions to the content video.
    // The native HTMLVideoElement.currentTime setter cannot be intercepted
    // or blocked by YouTube's JavaScript.
    var videos = document.querySelectorAll('video');
    for (var v = 0; v < videos.length; v++) {
      var vid = videos[v];
      if (vid.duration && isFinite(vid.duration) && vid.currentTime < vid.duration - 0.5) {
        vid.currentTime = vid.duration;
      }
    }
  });
})();
