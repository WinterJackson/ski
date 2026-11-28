/**
 * Typed settings, defaults, validation, and storage helpers.
 * Settings are stored in chrome.storage.sync so they follow the user across devices.
 * Stats are stored in chrome.storage.local (device-specific, larger quota).
 */

export interface SkiSettings {
  [key: string]: unknown;
  /** Master switch — whether the extension is enabled or paused */
  enabled: boolean;
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
  /** Track video titles in recent activity (opt-in, default off) */
  trackHistory: boolean;
  /** Whether auto-skip has been configured (first-run detection done) */
  autoSkipConfigured: boolean;
}

/** A single skip event recorded in the recent activity log */
export interface RecentSkip {
  /** Video title at the time of skip */
  title: string;
  /** Unix timestamp (Date.now()) */
  timestamp: number;
  /** How the skip was triggered */
  method: 'manual' | 'auto';
}

/** Stats stored in chrome.storage.local */
export interface SkiStats {
  [key: string]: unknown;
  skipCount: number;
  autoSkipCount: number;
  manualSkipCount: number;
  /** Date string → count, e.g. { "2026-11-24": 5 } */
  dailySkips: Record<string, number>;
  /** Last 50 skip events (only populated when trackHistory is on) */
  recentSkips: RecentSkip[];
}

/** Default stats shape */
export const DEFAULT_STATS: SkiStats = {
  skipCount: 0,
  autoSkipCount: 0,
  manualSkipCount: 0,
  dailySkips: {},
  recentSkips: [],
};

/** Average ad duration estimate in seconds (used for "time saved" calculation) */
export const AVG_AD_DURATION_SECONDS = 15;

/** Maximum recent skip entries to keep */
const MAX_RECENT_SKIPS = 50;

/** Days of daily skip data to retain */
const DAILY_SKIPS_RETENTION_DAYS = 90;

/** Default settings — Tab key (not a YouTube shortcut, no conflicts) */
export const DEFAULT_SETTINGS: SkiSettings = {
  enabled: true,
  keyCode: 'Tab',
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  showToast: true,
  autoSkip: false,
  skipCount: 0,
  donationDismissed: false,
  donationSnoozedUntil: 0,
  trackHistory: false,
  autoSkipConfigured: false,
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
  'Period',   // increase playback speed
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
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : DEFAULT_SETTINGS.enabled,
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
    trackHistory: typeof settings.trackHistory === 'boolean'
      ? settings.trackHistory
      : DEFAULT_SETTINGS.trackHistory,
    autoSkipConfigured: typeof settings.autoSkipConfigured === 'boolean'
      ? settings.autoSkipConfigured
      : DEFAULT_SETTINGS.autoSkipConfigured,
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

/** Increment the skip counter (stored locally) — DEPRECATED, use recordSkip */
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

/**
 * Promise queue to serialize recordSkip calls.
 * Prevents TOCTOU race conditions when two skips happen near-simultaneously
 * (e.g., rapid consecutive ads). Each read-modify-write completes before
 * the next one starts.
 */
let recordQueue: Promise<void> = Promise.resolve();

/**
 * Record a skip event with full stats tracking.
 * Updates all counters, daily breakdown, and optionally the recent activity log.
 *
 * Calls are serialized via a promise queue to prevent race conditions
 * where two near-simultaneous calls could read the same old value and
 * lose an increment.
 *
 * @param method  — 'manual' (hotkey) or 'auto' (auto-skip)
 * @param videoTitle — the video title (only stored if trackHistory is enabled)
 */
export async function recordSkip(
  method: 'manual' | 'auto',
  videoTitle?: string,
): Promise<void> {
  // Chain onto the queue — each call waits for the previous one to finish
  const thisCall = recordQueue.then(() => recordSkipInner(method, videoTitle));
  recordQueue = thisCall.catch(() => { /* keep the chain alive on errors */ });
  return thisCall;
}

/** Internal implementation — always called serially via the queue above */
async function recordSkipInner(
  method: 'manual' | 'auto',
  videoTitle?: string,
): Promise<void> {
  try {
    const result = await browser.storage.local.get(DEFAULT_STATS);

    const skipCount = ((result.skipCount as number) ?? 0) + 1;
    const autoSkipCount =
      ((result.autoSkipCount as number) ?? 0) + (method === 'auto' ? 1 : 0);
    const manualSkipCount =
      ((result.manualSkipCount as number) ?? 0) + (method === 'manual' ? 1 : 0);

    // Daily breakdown
    const today = new Date().toISOString().slice(0, 10);
    const dailySkips = { ...((result.dailySkips as Record<string, number>) ?? {}) };
    dailySkips[today] = (dailySkips[today] ?? 0) + 1;

    // Prune old daily entries (keep last N days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DAILY_SKIPS_RETENTION_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    for (const key of Object.keys(dailySkips)) {
      if (key < cutoffStr) delete dailySkips[key];
    }

    const updates: Record<string, unknown> = {
      skipCount,
      autoSkipCount,
      manualSkipCount,
      dailySkips,
    };

    // Recent activity log (opt-in)
    if (videoTitle) {
      const recentSkips = [...((result.recentSkips as RecentSkip[]) ?? [])];
      recentSkips.unshift({
        title: videoTitle,
        timestamp: Date.now(),
        method,
      });
      if (recentSkips.length > MAX_RECENT_SKIPS) {
        recentSkips.length = MAX_RECENT_SKIPS;
      }
      updates.recentSkips = recentSkips;
    }

    await browser.storage.local.set(updates);
  } catch (err) {
    console.warn('[Ski] Failed to record skip stats:', err);
  }
}

/** Load all stats from local storage */
export async function loadStats(): Promise<SkiStats> {
  try {
    const result = await browser.storage.local.get(DEFAULT_STATS);
    return {
      skipCount: (result.skipCount as number) ?? 0,
      autoSkipCount: (result.autoSkipCount as number) ?? 0,
      manualSkipCount: (result.manualSkipCount as number) ?? 0,
      dailySkips: (result.dailySkips as Record<string, number>) ?? {},
      recentSkips: (result.recentSkips as RecentSkip[]) ?? [],
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

/** Clear the recent activity history */
export async function clearRecentSkips(): Promise<void> {
  await browser.storage.local.set({ recentSkips: [] });
}

/**
 * Get the skip count for today.
 */
export function getSkipsToday(stats: SkiStats): number {
  const today = new Date().toISOString().slice(0, 10);
  return stats.dailySkips[today] ?? 0;
}

/**
 * Get the skip count for the last 7 days.
 */
export function getSkipsThisWeek(stats: SkiStats): number {
  const now = new Date();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    total += stats.dailySkips[key] ?? 0;
  }
  return total;
}

/**
 * Format seconds into a human-readable string.
 * e.g., 90 → "1m 30s", 3661 → "1h 1m", 86400 → "1d"
 *
 * Tiers: seconds → minutes → hours → days
 * Each tier shows at most two units for readability (e.g., "1h 2m" not "1h 2m 30s").
 */
export function formatTimeSaved(totalSkips: number): string {
  const seconds = totalSkips * AVG_AD_DURATION_SECONDS;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remaining = seconds % 60;
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

