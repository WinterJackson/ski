# Changelog

All notable changes to Ski Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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

