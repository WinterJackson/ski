# Changelog

All notable changes to Ski Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.2] - 2026-11-28

### Added
- Scoped two-tier `MutationObserver` + `requestAnimationFrame` auto-skip engine for sub-16ms reaction time
- Realistic pointer/mouse event dispatch (`pointerdown` → `mousedown` → `pointerup` → `mouseup` → `click`)
- Full-title & exact-timestamp tooltips, 2-line title clamping, and scrollable 50-entry Activity Log in Options

### Changed
- Enforced strict human-mouse parity in Manual Mode (`1 keypress = 1 click` without background auto-clicking)
- Prioritized `#movie_player` over feed preview players via `getPlayerElement()` and scoped `seekAdVideoIfStillShowing()` fallback
- Hardened the master **Enable Ski** toggle across popup, options, background badge, and content script

### Fixed
- Fixed premature visibility matches on empty ovals, countdown numbers, and `pointer-events: none` / `hidden` placeholders
- Fixed double-counting and off-by-one stats on consecutive ads and post-ad companion cards
- Removed duplicate DOM `.click()` loops from `ski-main.js` that could clear button text during Ad 1 → Ad 2 transitions

## [1.0.0] - 2026-11-24

### Added
- Complete UI/UX redesign with light, dark, and system themes
- Quick-access toolbar popup with 20px rounded corners, auto-skip toggle, and live stats
- Self-healing 4-layer detection engine with 8 weighted heuristic signals
- Consecutive ad support (automatically handles Ad 1 of 2 and Ad 2 of 2)
- Touch device auto-detection with auto-skip default on mobile/tablets
- Enhanced stats dashboard: time saved calculation, daily/weekly breakdowns, and opt-in activity log
- High-resolution vector-crafted branded extension icons (16, 32, 48, 96, 128, 512px)
- Multi-language detection support across 30+ YouTube locales

### Changed
- Default hotkey changed to `Tab` for conflict-free keyboard navigation
- Time saved formatting now rolls up cleanly into days (`1d`, `2d`) for long-term power users

### Fixed
- Fixed double-counting bug on consecutive ads in auto-skip mode
- Fixed TOCTOU race condition in stats recording using promise-based serialization

## [0.1.0] - 2026-11-23

### Added
- Initial project scaffolding with WXT and TypeScript
- Content script with layered Skip button detection
- Configurable hotkey with modifier support (default: `Tab`)
- Typing-context guard (ignores hotkey in inputs, textareas, contenteditable)
- SPA navigation support via `yt-navigate-finish`
- Optional toast notification on successful skip
- Optional auto-skip mode (off by default)
- Options page with hotkey recorder and YouTube conflict warnings
- Skip counter
- Privacy-first design: no network requests, no data collection

