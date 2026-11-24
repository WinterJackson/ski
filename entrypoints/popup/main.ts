/**
 * Popup script — quick-access toolbar popup.
 * Controls Master On/Off switch, auto-skip toggle, and glanceable stats.
 */

import {
  loadSettings,
  saveSettings,
  loadStats,
  formatTimeSaved,
  getSkipsToday,
  type SkiSettings,
} from '../../src/shared/settings';
import { serializeKeyCombo } from '../../src/shared/keycombo';

// ── DOM references ───────────────────────────────────────────────────

const powerCard = document.getElementById('power-card') as HTMLElement;
const masterToggle = document.getElementById('master-toggle') as HTMLInputElement;
const powerTitle = document.getElementById('power-title') as HTMLElement;
const powerSubtitle = document.getElementById('power-subtitle') as HTMLElement;
const powerHint = document.getElementById('power-hint') as HTMLElement;

const subSection = document.getElementById('sub-section') as HTMLElement;
const autoSkipToggle = document.getElementById('auto-skip-toggle') as HTMLInputElement;

const statsRow = document.getElementById('stats-row') as HTMLElement;
const skipCountEl = document.getElementById('skip-count') as HTMLElement;
const timeSavedEl = document.getElementById('time-saved') as HTMLElement;
const todayCountEl = document.getElementById('today-count') as HTMLElement;

const versionEl = document.getElementById('version') as HTMLElement;
const openOptionsBtn = document.getElementById('open-options') as HTMLElement;
const fullSettingsLink = document.getElementById('full-settings') as HTMLElement;

let cachedSettings: SkiSettings;

// ── Initialize ───────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Version
  const manifest = browser.runtime.getManifest();
  versionEl.textContent = manifest.version ?? '1.0.0';

  // Load settings + stats in parallel
  const [settings, stats] = await Promise.all([loadSettings(), loadStats()]);
  cachedSettings = settings;

  // Render initial UI state
  masterToggle.checked = settings.enabled;
  autoSkipToggle.checked = settings.autoSkip;
  renderPowerState(settings);

  // Stats
  skipCountEl.textContent = stats.skipCount.toLocaleString();
  timeSavedEl.textContent = `~${formatTimeSaved(stats.skipCount)}`;
  todayCountEl.textContent = getSkipsToday(stats).toLocaleString();
}

function renderPowerState(settings: SkiSettings): void {
  const isEnabled = settings.enabled;
  const isAutoSkip = settings.autoSkip;

  const keyLabel = serializeKeyCombo({
    code: settings.keyCode,
    ctrlKey: settings.ctrlKey,
    altKey: settings.altKey,
    shiftKey: settings.shiftKey,
    metaKey: settings.metaKey,
  });

  if (isEnabled) {
    powerCard.classList.add('is-active');
    powerCard.classList.remove('is-paused');
    powerTitle.textContent = 'Ski is Active';
    subSection.classList.remove('disabled');
    statsRow.classList.remove('disabled');

    if (isAutoSkip) {
      powerSubtitle.textContent = 'Auto-skipping ads';
      powerHint.innerHTML = `Auto-skip active ⚡ (or press <kbd>${keyLabel}</kbd>)`;
    } else {
      powerSubtitle.textContent = 'Hotkey mode active';
      powerHint.innerHTML = `Press <kbd>${keyLabel}</kbd> during an ad to skip`;
    }
  } else {
    powerCard.classList.remove('is-active');
    powerCard.classList.add('is-paused');
    powerTitle.textContent = 'Ski is Paused';
    powerSubtitle.textContent = 'Extension is turned off';
    powerHint.textContent = 'Ski is off. YouTube ads will play normally.';
    subSection.classList.add('disabled');
    statsRow.classList.add('disabled');
  }
}

// ── Toggle Master On / Off ───────────────────────────────────────────

masterToggle.addEventListener('change', async () => {
  const enabled = masterToggle.checked;
  cachedSettings.enabled = enabled;
  renderPowerState(cachedSettings);
  await saveSettings({ enabled });
});

// ── Toggle Auto-Skip ─────────────────────────────────────────────────

autoSkipToggle.addEventListener('change', async () => {
  const autoSkip = autoSkipToggle.checked;
  cachedSettings.autoSkip = autoSkip;
  renderPowerState(cachedSettings);
  await saveSettings({ autoSkip });
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

// ── Live Storage Updates ─────────────────────────────────────────────

browser.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local') {
    const stats = await loadStats();
    skipCountEl.textContent = stats.skipCount.toLocaleString();
    timeSavedEl.textContent = `~${formatTimeSaved(stats.skipCount)}`;
    todayCountEl.textContent = getSkipsToday(stats).toLocaleString();
  }

  if (areaName === 'sync') {
    if ('enabled' in changes) {
      cachedSettings.enabled = Boolean(changes.enabled.newValue);
      masterToggle.checked = cachedSettings.enabled;
    }
    if ('autoSkip' in changes) {
      cachedSettings.autoSkip = Boolean(changes.autoSkip.newValue);
      autoSkipToggle.checked = cachedSettings.autoSkip;
    }
    if ('keyCode' in changes || 'ctrlKey' in changes || 'altKey' in changes || 'shiftKey' in changes || 'metaKey' in changes) {
      cachedSettings = await loadSettings();
    }
    renderPowerState(cachedSettings);
  }
});

// ── Start ────────────────────────────────────────────────────────────

init();
