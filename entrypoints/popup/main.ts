/**
 * Popup script — quick-access toolbar popup.
 * Shows auto-skip toggle + glanceable stats.
 */

import {
  loadSettings,
  saveSettings,
  loadStats,
  formatTimeSaved,
  getSkipsToday,
} from '../../src/shared/settings';
import { serializeKeyCombo } from '../../src/shared/keycombo';

// ── DOM references ───────────────────────────────────────────────────

const autoSkipToggle = document.getElementById('auto-skip-toggle') as HTMLInputElement;
const toggleHint = document.getElementById('toggle-hint') as HTMLElement;
const hotkeyDisplay = document.getElementById('hotkey-display') as HTMLElement;
const skipCountEl = document.getElementById('skip-count') as HTMLElement;
const timeSavedEl = document.getElementById('time-saved') as HTMLElement;
const todayCountEl = document.getElementById('today-count') as HTMLElement;
const versionEl = document.getElementById('version') as HTMLElement;
const openOptionsBtn = document.getElementById('open-options') as HTMLElement;
const fullSettingsLink = document.getElementById('full-settings') as HTMLElement;

// ── Initialize ───────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Version
  const manifest = browser.runtime.getManifest();
  versionEl.textContent = manifest.version ?? '0.1.0';

  // Load settings + stats in parallel
  const [settings, stats] = await Promise.all([loadSettings(), loadStats()]);

  // Auto-skip toggle
  autoSkipToggle.checked = settings.autoSkip;
  updateHint(settings.autoSkip, settings);

  // Stats
  skipCountEl.textContent = stats.skipCount.toLocaleString();
  timeSavedEl.textContent = `~${formatTimeSaved(stats.skipCount)}`;
  todayCountEl.textContent = getSkipsToday(stats).toLocaleString();
}

function updateHint(autoSkipOn: boolean, settings?: { keyCode: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean }): void {
  if (autoSkipOn) {
    toggleHint.textContent = 'Auto-skipping ads ✓';
    toggleHint.style.color = 'var(--success)';
  } else {
    const keyLabel = settings
      ? serializeKeyCombo({
          code: settings.keyCode,
          ctrlKey: settings.ctrlKey,
          altKey: settings.altKey,
          shiftKey: settings.shiftKey,
          metaKey: settings.metaKey,
        })
      : hotkeyDisplay?.textContent ?? 'Tab';
    toggleHint.innerHTML = `Hotkey mode — press <kbd>${keyLabel}</kbd> to skip`;
    toggleHint.style.color = '';
  }
}

// ── Toggle Auto-Skip ─────────────────────────────────────────────────

autoSkipToggle.addEventListener('change', async () => {
  const on = autoSkipToggle.checked;
  await saveSettings({ autoSkip: on });
  updateHint(on);
});

// ── Open Full Settings ───────────────────────────────────────────────

function openOptions(): void {
  browser.runtime.openOptionsPage();
  window.close();
}

openOptionsBtn.addEventListener('click', openOptions);
fullSettingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  openOptions();
});

// ── Live Stats Updates ───────────────────────────────────────────────

browser.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local') {
    const stats = await loadStats();
    skipCountEl.textContent = stats.skipCount.toLocaleString();
    timeSavedEl.textContent = `~${formatTimeSaved(stats.skipCount)}`;
    todayCountEl.textContent = getSkipsToday(stats).toLocaleString();
  }
  if (areaName === 'sync' && 'autoSkip' in changes) {
    autoSkipToggle.checked = changes.autoSkip.newValue as boolean;
    updateHint(autoSkipToggle.checked);
  }
});

// ── Start ────────────────────────────────────────────────────────────

init();
