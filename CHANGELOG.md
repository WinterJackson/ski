# Changelog

All notable changes to Ski Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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

