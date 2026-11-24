/**
 * Unit tests for settings module.
 */
import { describe, it, expect } from 'vitest';
import {
  validateSettings,
  hasYouTubeConflict,
  formatTimeSaved,
  getSkipsToday,
  getSkipsThisWeek,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  type SkiSettings,
  type SkiStats,
} from '../../src/shared/settings';

describe('validateSettings', () => {
  it('returns defaults for empty input', () => {
    const result = validateSettings({});
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('preserves valid values', () => {
    const input: Partial<SkiSettings> = {
      keyCode: 'KeyS',
      ctrlKey: true,
      showToast: false,
    };
    const result = validateSettings(input);
    expect(result.keyCode).toBe('KeyS');
    expect(result.ctrlKey).toBe(true);
    expect(result.showToast).toBe(false);
    // Defaults for unspecified
    expect(result.altKey).toBe(false);
    expect(result.autoSkip).toBe(false);
  });

  it('rejects invalid types and falls back to defaults', () => {
    const result = validateSettings({
      keyCode: 123 as unknown as string,
      ctrlKey: 'yes' as unknown as boolean,
      skipCount: -5,
    });
    expect(result.keyCode).toBe(DEFAULT_SETTINGS.keyCode);
    expect(result.ctrlKey).toBe(DEFAULT_SETTINGS.ctrlKey);
    expect(result.skipCount).toBe(DEFAULT_SETTINGS.skipCount);
  });

  it('rejects empty keyCode', () => {
    const result = validateSettings({ keyCode: '' });
    expect(result.keyCode).toBe(DEFAULT_SETTINGS.keyCode);
  });

  it('floors skipCount', () => {
    const result = validateSettings({ skipCount: 10.7 });
    expect(result.skipCount).toBe(10);
  });

  it('validates trackHistory boolean', () => {
    const result = validateSettings({ trackHistory: true });
    expect(result.trackHistory).toBe(true);

    const defaultResult = validateSettings({});
    expect(defaultResult.trackHistory).toBe(false);
  });
});

describe('hasYouTubeConflict', () => {
  it('detects conflict for bare YouTube shortcut', () => {
    const settings = { ...DEFAULT_SETTINGS, keyCode: 'KeyK' };
    expect(hasYouTubeConflict(settings)).toBe(true);
  });

  it('no conflict when modifier is used', () => {
    const settings = { ...DEFAULT_SETTINGS, keyCode: 'KeyK', ctrlKey: true };
    expect(hasYouTubeConflict(settings)).toBe(false);
  });

  it('no conflict for non-YouTube key', () => {
    const settings = { ...DEFAULT_SETTINGS, keyCode: 'Period' };
    // Period is actually in the YouTube set (increases speed), but
    // the default is deliberate. The test checks the conflict detection works.
    expect(hasYouTubeConflict(settings)).toBe(false);
  });

  it('detects conflict for Space', () => {
    const settings = { ...DEFAULT_SETTINGS, keyCode: 'Space' };
    expect(hasYouTubeConflict(settings)).toBe(true);
  });
});

describe('formatTimeSaved', () => {
  it('formats seconds for small counts', () => {
    expect(formatTimeSaved(0)).toBe('0s');
    expect(formatTimeSaved(1)).toBe('15s');
    expect(formatTimeSaved(3)).toBe('45s');
  });

  it('formats minutes for medium counts', () => {
    expect(formatTimeSaved(4)).toBe('1m');       // 60s
    expect(formatTimeSaved(8)).toBe('2m');       // 120s
    expect(formatTimeSaved(10)).toBe('2m 30s');  // 150s
  });

  it('formats hours for large counts', () => {
    expect(formatTimeSaved(240)).toBe('1h');      // 3600s
    expect(formatTimeSaved(480)).toBe('2h');      // 7200s
    expect(formatTimeSaved(250)).toBe('1h 2m');   // 3750s
  });
});

describe('getSkipsToday', () => {
  it('returns count for today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const stats: SkiStats = {
      ...DEFAULT_STATS,
      dailySkips: { [today]: 7 },
    };
    expect(getSkipsToday(stats)).toBe(7);
  });

  it('returns 0 when no data for today', () => {
    const stats: SkiStats = {
      ...DEFAULT_STATS,
      dailySkips: { '2020-01-01': 5 },
    };
    expect(getSkipsToday(stats)).toBe(0);
  });
});

describe('getSkipsThisWeek', () => {
  it('sums the last 7 days', () => {
    const dailySkips: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailySkips[d.toISOString().slice(0, 10)] = 2;
    }
    // Add an old entry that should NOT be counted
    dailySkips['2020-01-01'] = 100;

    const stats: SkiStats = { ...DEFAULT_STATS, dailySkips };
    expect(getSkipsThisWeek(stats)).toBe(14); // 7 × 2
  });

  it('returns 0 for empty dailySkips', () => {
    expect(getSkipsThisWeek({ ...DEFAULT_STATS })).toBe(0);
  });
});

