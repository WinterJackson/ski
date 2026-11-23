/**
 * Typed settings, defaults, validation, and storage helpers.
 * Settings are stored in chrome.storage.sync so they follow the user across devices.
 */

export interface SkiSettings {
  [key: string]: unknown;
  /** The key code (event.code) that triggers the skip */
  keyCode: string;
  /** Whether Ctrl must be held */
  ctrlKey: boolean;
  /** Whether Alt must be held */
  altKey: boolean;
  /** Whether Shift must be held */
  shiftKey: boolean;
  /** Whether Meta (Cmd/Win) must be held */
  metaKey: boolean;
  /** Show a toast notification after a successful skip */
  showToast: boolean;
  /** Enable opt-in auto-skip mode */
  autoSkip: boolean;
  /** Number of successful skips (stored in local, not sync) */
  skipCount: number;
  /** Whether the donation prompt has been permanently dismissed */
  donationDismissed: boolean;
  /** Timestamp of temporary donation dismissal (Maybe Later) */
  donationSnoozedUntil: number;
}

/** Default settings — the key is Period (.) which is not used by YouTube */
export const DEFAULT_SETTINGS: SkiSettings = {
  keyCode: 'Period',
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  showToast: true,
  autoSkip: false,
  skipCount: 0,
  donationDismissed: false,
  donationSnoozedUntil: 0,
};

/** YouTube's own keyboard shortcuts — warn on conflict */
export const YOUTUBE_SHORTCUTS: ReadonlySet<string> = new Set([
  'KeyK',     // play/pause
  'KeyJ',     // rewind 10s
  'KeyL',     // forward 10s
  'KeyF',     // fullscreen
  'KeyM',     // mute
  'KeyC',     // captions
  'KeyT',     // theater mode
  'KeyI',     // mini player
  'Space',    // play/pause
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
  'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
  'Home',
  'End',
  'Comma',    // decrease playback speed
  // Note: Period (.) increases playback speed on YouTube, but we use it
  // as default because it's less commonly used. The options page warns about this.
]);

/**
 * Check if a key combo conflicts with YouTube shortcuts.
 * Only bare keys (no modifiers) conflict with YouTube.
 */
export function hasYouTubeConflict(settings: SkiSettings): boolean {
  const hasModifier = settings.ctrlKey || settings.altKey || settings.shiftKey || settings.metaKey;
  if (hasModifier) return false;
  return YOUTUBE_SHORTCUTS.has(settings.keyCode);
}

/** Validate that settings have sane values */
export function validateSettings(settings: Partial<SkiSettings>): SkiSettings {
  return {
    keyCode: typeof settings.keyCode === 'string' && settings.keyCode.length > 0
      ? settings.keyCode
      : DEFAULT_SETTINGS.keyCode,
    ctrlKey: typeof settings.ctrlKey === 'boolean' ? settings.ctrlKey : DEFAULT_SETTINGS.ctrlKey,
    altKey: typeof settings.altKey === 'boolean' ? settings.altKey : DEFAULT_SETTINGS.altKey,
    shiftKey: typeof settings.shiftKey === 'boolean' ? settings.shiftKey : DEFAULT_SETTINGS.shiftKey,
    metaKey: typeof settings.metaKey === 'boolean' ? settings.metaKey : DEFAULT_SETTINGS.metaKey,
    showToast: typeof settings.showToast === 'boolean' ? settings.showToast : DEFAULT_SETTINGS.showToast,
    autoSkip: typeof settings.autoSkip === 'boolean' ? settings.autoSkip : DEFAULT_SETTINGS.autoSkip,
    skipCount: typeof settings.skipCount === 'number' && settings.skipCount >= 0
      ? Math.floor(settings.skipCount)
      : DEFAULT_SETTINGS.skipCount,
    donationDismissed: typeof settings.donationDismissed === 'boolean'
      ? settings.donationDismissed
      : DEFAULT_SETTINGS.donationDismissed,
    donationSnoozedUntil: typeof settings.donationSnoozedUntil === 'number'
      ? settings.donationSnoozedUntil
      : DEFAULT_SETTINGS.donationSnoozedUntil,
  };
}

/** Load settings from storage, with defaults for missing values */
export async function loadSettings(): Promise<SkiSettings> {
  try {
    const stored = await browser.storage.sync.get(DEFAULT_SETTINGS);
    return validateSettings(stored as Partial<SkiSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Save settings to storage */
export async function saveSettings(settings: Partial<SkiSettings>): Promise<void> {
  await browser.storage.sync.set(settings);
}

/** Increment the skip counter (stored locally) */
export async function incrementSkipCount(): Promise<number> {
  try {
    const result = await browser.storage.local.get({ skipCount: 0 });
    const newCount = (result.skipCount as number) + 1;
    await browser.storage.local.set({ skipCount: newCount });
    return newCount;
  } catch {
    return 0;
  }
}

