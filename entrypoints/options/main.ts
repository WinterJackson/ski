/**
 * Options page script.
 * Handles hotkey recording, settings persistence, stats display,
 * and recent activity log.
 */

import { serializeKeyCombo, keyComboFromEvent } from '../../src/shared/keycombo';
import {
  loadSettings,
  saveSettings,
  loadStats,
  clearRecentSkips,
  hasYouTubeConflict,
  formatTimeSaved,
  getSkipsToday,
  getSkipsThisWeek,
  DEFAULT_SETTINGS,
  type SkiSettings,
  type SkiStats,
  type RecentSkip,
} from '../../src/shared/settings';

// ----- DOM references -----
const hotkeyInput = document.getElementById('hotkey-input') as HTMLInputElement;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-hotkey') as HTMLButtonElement;
const conflictWarning = document.getElementById('conflict-warning') as HTMLElement;
const showToastCheckbox = document.getElementById('show-toast') as HTMLInputElement;
const autoSkipCheckbox = document.getElementById('auto-skip') as HTMLInputElement;
const trackHistoryCheckbox = document.getElementById('track-history') as HTMLInputElement;
const versionEl = document.getElementById('version') as HTMLElement;

// Stats elements
const skipCountEl = document.getElementById('skip-count') as HTMLElement;
const timeSavedEl = document.getElementById('time-saved') as HTMLElement;
const skipsTodayEl = document.getElementById('skips-today') as HTMLElement;
const skipsWeekEl = document.getElementById('skips-week') as HTMLElement;
const manualCountEl = document.getElementById('manual-count') as HTMLElement;
const manualCountLegendEl = document.getElementById('manual-count-legend') as HTMLElement;
const autoCountEl = document.getElementById('auto-count') as HTMLElement;
const breakdownManualEl = document.getElementById('breakdown-manual') as HTMLElement;
const breakdownAutoEl = document.getElementById('breakdown-auto') as HTMLElement;

// Recent activity elements
const recentActivitySection = document.getElementById('recent-activity-section') as HTMLElement;
const recentListEl = document.getElementById('recent-list') as HTMLElement;
const clearHistoryBtn = document.getElementById('clear-history') as HTMLButtonElement;

let isRecording = false;
let currentSettings: SkiSettings;

// ----- Initialize -----
async function init(): Promise<void> {
  // Set version from manifest
  const manifest = browser.runtime.getManifest();
  versionEl.textContent = manifest.version ?? '0.1.0';

  // Load settings and stats in parallel
  const [settings, stats] = await Promise.all([loadSettings(), loadStats()]);
  currentSettings = settings;
  updateUI();
  updateStats(stats);
}

function updateUI(): void {
  hotkeyInput.value = serializeKeyCombo({
    code: currentSettings.keyCode,
    ctrlKey: currentSettings.ctrlKey,
    altKey: currentSettings.altKey,
    shiftKey: currentSettings.shiftKey,
    metaKey: currentSettings.metaKey,
  });

  showToastCheckbox.checked = currentSettings.showToast;
  autoSkipCheckbox.checked = currentSettings.autoSkip;
  trackHistoryCheckbox.checked = currentSettings.trackHistory;

  // Show conflict warning
  conflictWarning.hidden = !hasYouTubeConflict(currentSettings);

  // Show/hide recent activity section
  recentActivitySection.hidden = !currentSettings.trackHistory;
}

function updateStats(stats: SkiStats): void {
  const { skipCount, autoSkipCount, manualSkipCount } = stats;

  // Main counters
  skipCountEl.textContent = skipCount.toLocaleString();
  timeSavedEl.textContent = `~${formatTimeSaved(skipCount)}`;

  // Periodic
  skipsTodayEl.textContent = getSkipsToday(stats).toLocaleString();
  skipsWeekEl.textContent = getSkipsThisWeek(stats).toLocaleString();

  // Breakdown
  manualCountEl.textContent = manualSkipCount.toLocaleString();
  manualCountLegendEl.textContent = manualSkipCount.toLocaleString();
  autoCountEl.textContent = autoSkipCount.toLocaleString();

  // Breakdown bar
  const total = autoSkipCount + manualSkipCount;
  if (total > 0) {
    const manualPct = Math.round((manualSkipCount / total) * 100);
    breakdownManualEl.style.width = `${manualPct}%`;
    breakdownAutoEl.style.width = `${100 - manualPct}%`;
  } else {
    breakdownManualEl.style.width = '100%';
    breakdownAutoEl.style.width = '0%';
  }

  // Recent activity
  renderRecentSkips(stats.recentSkips);
}

function renderRecentSkips(skips: RecentSkip[]): void {
  if (!skips || skips.length === 0) {
    recentListEl.innerHTML = '<p class="hint">No activity yet. Skip some ads!</p>';
    return;
  }

  recentListEl.innerHTML = skips
    .slice(0, 20)
    .map((skip) => {
      const time = formatTimeAgo(skip.timestamp);
      const icon = skip.method === 'auto' ? '⚡' : '⌨';
      const methodLabel = skip.method === 'auto' ? 'Auto' : 'Manual';
      const title = escapeHtml(skip.title || 'Unknown video');
      return `<div class="recent-item">
        <span class="recent-icon">${icon}</span>
        <div class="recent-info">
          <span class="recent-title">${title}</span>
          <span class="recent-meta">${methodLabel} · ${time}</span>
        </div>
      </div>`;
    })
    .join('');
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ----- Hotkey recording -----
function startRecording(): void {
  isRecording = true;
  hotkeyInput.value = 'Press a key...';
  hotkeyInput.classList.add('recording');
  recordBtn.textContent = 'Cancel';
  hotkeyInput.focus();
}

function stopRecording(): void {
  isRecording = false;
  hotkeyInput.classList.remove('recording');
  recordBtn.textContent = 'Change';
  updateUI();
}

recordBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

hotkeyInput.addEventListener('click', () => {
  if (!isRecording) startRecording();
});

document.addEventListener('keydown', async (event: KeyboardEvent) => {
  if (!isRecording) return;

  // Ignore modifier-only presses
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;

  event.preventDefault();
  event.stopPropagation();

  const combo = keyComboFromEvent(event);

  currentSettings = {
    ...currentSettings,
    keyCode: combo.code,
    ctrlKey: combo.ctrlKey,
    altKey: combo.altKey,
    shiftKey: combo.shiftKey,
    metaKey: combo.metaKey,
  };

  await saveSettings({
    keyCode: combo.code,
    ctrlKey: combo.ctrlKey,
    altKey: combo.altKey,
    shiftKey: combo.shiftKey,
    metaKey: combo.metaKey,
  });

  stopRecording();
});

// ----- Reset to default -----
resetBtn.addEventListener('click', async () => {
  currentSettings = {
    ...currentSettings,
    keyCode: DEFAULT_SETTINGS.keyCode,
    ctrlKey: DEFAULT_SETTINGS.ctrlKey,
    altKey: DEFAULT_SETTINGS.altKey,
    shiftKey: DEFAULT_SETTINGS.shiftKey,
    metaKey: DEFAULT_SETTINGS.metaKey,
  };

  await saveSettings({
    keyCode: DEFAULT_SETTINGS.keyCode,
    ctrlKey: DEFAULT_SETTINGS.ctrlKey,
    altKey: DEFAULT_SETTINGS.altKey,
    shiftKey: DEFAULT_SETTINGS.shiftKey,
    metaKey: DEFAULT_SETTINGS.metaKey,
  });

  updateUI();
});

// ----- Toggles -----
showToastCheckbox.addEventListener('change', async () => {
  currentSettings.showToast = showToastCheckbox.checked;
  await saveSettings({ showToast: currentSettings.showToast });
});

autoSkipCheckbox.addEventListener('change', async () => {
  currentSettings.autoSkip = autoSkipCheckbox.checked;
  await saveSettings({ autoSkip: currentSettings.autoSkip });
});

trackHistoryCheckbox.addEventListener('change', async () => {
  currentSettings.trackHistory = trackHistoryCheckbox.checked;
  await saveSettings({ trackHistory: currentSettings.trackHistory });
  recentActivitySection.hidden = !currentSettings.trackHistory;
});

// ----- Clear history -----
clearHistoryBtn.addEventListener('click', async () => {
  await clearRecentSkips();
  renderRecentSkips([]);
});

// ----- Live stats updates -----
browser.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && ('skipCount' in changes || 'autoSkipCount' in changes || 'manualSkipCount' in changes || 'dailySkips' in changes || 'recentSkips' in changes)) {
    const stats = await loadStats();
    updateStats(stats);
  }
});

// ----- Start -----
init();
