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
    // ── YouTube Player API (main-world only) ──
    // Content script already handles DOM clicks; main-world only needs to
    // invoke YouTube's internal skipAd() API when ad-showing is active,
    // avoiding duplicate DOM .click() calls that can corrupt Ad 1 -> Ad 2 UI state.
    try {
      var moviePlayer = document.getElementById('movie_player');
      if (moviePlayer && moviePlayer.classList && moviePlayer.classList.contains('ad-showing')) {
        if (typeof moviePlayer.skipAd === 'function') {
          moviePlayer.skipAd();
        }
      }
    } catch(e) {}
  });
})();
