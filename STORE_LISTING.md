# Ski Extension — Store Listing & Submission Kit

Complete copy-paste materials for publishing **Ski Extension** on the **Chrome Web Store** and **Firefox Add-ons (AMO)**.

---

## 1. Store Metadata & Copy

### Extension Name / Title
```text
Ski — Skip YouTube Ads Instantly
```
*(32 characters / 45 max)*

### Summary / Short Description
```text
Skip YouTube ads with a single tap of the Tab key, or use smart auto-skip. Fast, lightweight, privacy-first, and 100% open source.
```
*(125 characters / 132 max)*

### Category
- **Chrome Web Store:** Productivity / Accessibility
- **Firefox Add-ons:** Video & Audio / Photos, Music & Videos

---

## 2. Detailed Description (Formatted for CWS & AMO)

```markdown
Skip YouTube ads the instant they become skippable — with a single keypress or hands-free auto-skip.

Unlike traditional ad blockers that break playback, trigger YouTube's "Ad blockers violate YouTube's Terms of Service" popups, or drain your CPU, Ski Extension simply clicks YouTube's native "Skip Ad" button for you the millisecond it appears.

⚡ KEY FEATURES

• ⌨️ One-Key Skip: Press Tab (or your custom preferred shortcut) to skip skippable ads instantly.
• ⚡ Smart Auto-Skip: Hands-free mode that automatically clicks the skip button for you as soon as YouTube allows.
• 🛡️ Self-Healing Engine: Uses an 8-signal heuristic detector that adapts automatically when YouTube redesigns its player or scrambles class names.
• ⏭️ Consecutive Ad Handling: Automatically handles double ads ("Ad 1 of 2" and "Ad 2 of 2") seamlessly.
• 📱 Mobile & Tablet Ready: Full support for Firefox for Android and Kiwi Browser, with auto-skip turned on by default for touch screens.
• 📊 Glanceable Stats: Track your skipped ad count and total estimated time saved right in the sleek toolbar popup.
• 🌓 Theme Aware: Beautiful modern UI with dark mode, light mode, and system preference detection.

🔒 100% PRIVACY FIRST — ZERO DATA COLLECTION

• No account or sign-up required.
• No telemetry, analytics, or background tracking.
• No external network requests — everything runs 100% locally on your device.
• Open source under the MIT License on GitHub.

💡 WHY SKI INSTEAD OF TRADITIONAL AD BLOCKERS?

YouTube actively detects and blocks standard network-level ad blockers. Ski Extension is fundamentally different: it does NOT intercept network requests or modify video streams. It simply automates the user action of clicking YouTube's official Skip button. It's clean, safe, and will never trigger ad-blocker warnings.

---
Built with ❤️ by [Winter Jackson](https://github.com/WinterJackson), under [Xinteck Digital Solutions](https://xinteck.co.ke/).
Source code & contributions: https://github.com/WinterJackson/ski
```

---

## 3. Chrome Web Store Compliance & Justifications

When submitting to the Chrome Developer Dashboard, Google asks for these specific compliance fields:

### Single Purpose Description
```text
The single purpose of Ski Extension is to automate clicking YouTube's official "Skip Ad" button on skippable video ads via a customizable hotkey (default Tab) or an opt-in auto-skip mode.
```

### Permission Justifications

#### `storage` Permission:
```text
The storage permission is used exclusively on the local device to save user configuration (selected hotkey, auto-skip toggle state, theme preference) and maintain a local counter of skipped ads and time saved. No data is ever transmitted externally.
```

#### Host Permissions (`*://www.youtube.com/*`, `*://m.youtube.com/*`, `*://www.youtube-nocookie.com/*`):
```text
Host permissions on YouTube domains are strictly required to detect the presence of the YouTube player's native "Skip Ad" button and dispatch a trusted click event when the user presses their hotkey or when auto-skip is enabled.
```

---

## 4. Firefox AMO Specific Notes

- **Add-on ID:** Configured in `wxt.config.ts` as `ski@winterjackson.dev` (or standard AMO GUID).
- **Source Code Upload:** Firefox requires source code for extensions built with minifiers/bundlers (Vite/WXT). 
  - WXT automatically creates `ski-1.0.0-sources.zip` during `pnpm zip:firefox`. You simply upload this file when prompted by AMO!

---

## 5. Visual Asset Checklist

| Asset | Dimensions | Status |
|-------|------------|--------|
| Small Tile Icon | 128 x 128 px | ✅ Generated (`public/icon/128.png`) |
| Store Main Icon | 512 x 512 px | ✅ Generated (`public/icon/512.png`) |
| Primary Screenshot | 1280 x 800 px | Capture options page & popup |
| Small Promo Tile (Optional) | 440 x 280 px | Banner graphic with logo |
| Marquee Promo Tile (Optional) | 1400 x 560 px | Full-bleed hero banner |
