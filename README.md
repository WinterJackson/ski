# SkipKey (ski)

> Skip YouTube ads with a keypress. Free, open-source, no tracking.

![License](https://img.shields.io/badge/license-MIT-blue)
![Chrome](https://img.shields.io/badge/chrome-MV3-green)
![Firefox](https://img.shields.io/badge/firefox-supported-orange)

## What it does

SkipKey clicks YouTube's own **Skip** button when you press a key — so you never have to reach for the mouse.

- **One configurable hotkey** clicks the visible Skip button
- Works in **fullscreen, theater mode, and embeds**
- Ignores the key while you **type** in comments or search
- **No ad blocking, muting, or speed-up tricks**
- **No data collected**, no network requests
- **Tiny**: under 20 KB, zero runtime dependencies

## Install

### Chrome
1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load Unpacked** and select the `.output/chrome-mv3` folder

### Firefox
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file in `.output/firefox-mv2`

## Usage

1. Watch a YouTube video
2. When a skippable ad appears and the **Skip** button shows up, press your hotkey (default: `.`)
3. The ad skips instantly

### Change the hotkey

Right-click the extension icon → **Options** → Click **Change** → Press your new key.

## Development

```bash
# Install dependencies
pnpm install

# Start dev mode (Chrome)
pnpm dev

# Start dev mode (Firefox)
pnpm dev:firefox

# Build for production
pnpm build
pnpm build:firefox

# Run tests
pnpm test

# Type check
pnpm compile

# Create zip for store submission
pnpm zip
pnpm zip:firefox
```

## Architecture

```
src/
├── content/
│   ├── selectors.ts   # All CSS selectors and localized strings
│   ├── detector.ts    # findSkipButton(), isVisible(), isClickable()
│   ├── hotkey.ts      # Key matching and typing-context guard
│   ├── observer.ts    # SPA navigation hooks, optional auto-skip
│   └── toast.ts       # Optional feedback UI in a shadow root
├── shared/
│   ├── settings.ts    # Typed settings, defaults, validation
│   └── keycombo.ts    # Parse, serialize, compare key combos
entrypoints/
├── content.ts         # Content script entry point
└── options/           # Options page (HTML + TS + CSS)
```

**Detection is layered** (most specific → least specific):
1. Known CSS class selectors (updated when YouTube changes)
2. Structural fallback: buttons inside the player matching Skip text/aria
3. Ad-state gate: only searches while the player has the `ad-showing` class

## Privacy

SkipKey makes **no network requests** and collects **no data**. The only thing stored is your chosen hotkey (in `chrome.storage.sync`). See [PRIVACY.md](PRIVACY.md).

## Contributing

Found a bug after a YouTube update? [Open an issue](https://github.com/WinterJackson/ski/issues) with:
- Browser and version
- Extension version
- YouTube locale/language
- Whether the Skip button was visible

Selector fixes are usually shipped within 24 hours.

## License

[MIT](LICENSE) · Built by [Winter Jackson](https://github.com/WinterJackson), available for hire.

