/**
 * Options page script.
 * Handles hotkey recording, settings persistence, stats display,
 * recent activity log, theme management, and touch-device adaptive UI.
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

// ── DOM references ───────────────────────────────────────────────────

const hotkeyInput = document.getElementById('hotkey-input') as HTMLInputElement;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-hotkey') as HTMLButtonElement;
const conflictWarning = document.getElementById('conflict-warning') as HTMLElement;
const extensionEnabledCheckbox = document.getElementById('extension-enabled') as HTMLInputElement;
const showToastCheckbox = document.getElementById('show-toast') as HTMLInputElement;
const autoSkipCheckbox = document.getElementById('auto-skip') as HTMLInputElement;
const trackHistoryCheckbox = document.getElementById('track-history') as HTMLInputElement;
const versionEl = document.getElementById('version') as HTMLElement;

// Touch/mobile elements
const touchBanner = document.getElementById('touch-banner') as HTMLElement;
const autoSkipRec = document.getElementById('auto-skip-rec') as HTMLElement;
const hotkeyHintMobile = document.getElementById('hotkey-hint-mobile') as HTMLElement;

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

// Welcome card elements
const welcomeCard = document.getElementById('welcome-card') as HTMLElement;
const welcomeDismissBtn = document.getElementById('welcome-dismiss') as HTMLButtonElement;
const welcomeText = document.getElementById('welcome-text') as HTMLElement;

let isRecording = false;
let currentSettings: SkiSettings;
let isFirstLoad = true;

// Detect touch device
const isTouchDevice = navigator.maxTouchPoints > 0;

// ── Theme Management ─────────────────────────────────────────────────

type ThemeMode = 'system' | 'light' | 'dark';
let currentTheme: ThemeMode = 'system';

function loadTheme(): void {
  const saved = localStorage.getItem('ski-theme') as ThemeMode | null;
  currentTheme = saved && ['system', 'light', 'dark'].includes(saved) ? saved : 'system';
  applyTheme();
}

function applyTheme(): void {
  let resolved: 'light' | 'dark';
  if (currentTheme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolved = currentTheme;
  }
  document.documentElement.setAttribute('data-theme', resolved);
  updateThemeIcon();
}

function cycleTheme(): void {
  const modes: ThemeMode[] = ['system', 'light', 'dark'];
  const idx = modes.indexOf(currentTheme);
  currentTheme = modes[(idx + 1) % modes.length] ?? 'system';
  localStorage.setItem('ski-theme', currentTheme);
  applyTheme();
}

function updateThemeIcon(): void {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const icons: Record<ThemeMode, string> = { system: '💻', light: '☀️', dark: '🌙' };
  btn.textContent = icons[currentTheme];
  btn.title = `Theme: ${currentTheme}`;
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (currentTheme === 'system') applyTheme();
});

// ── Count-up Animation ───────────────────────────────────────────────

function animateCountUp(el: HTMLElement, target: number, suffix = '', duration = 600): void {
  if (target === 0) {
    el.textContent = '0' + suffix;
    return;
  }
  const start = performance.now();
  const update = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = target.toLocaleString() + suffix;
    }
  };
  requestAnimationFrame(update);
}

// ── Save Confirmation ────────────────────────────────────────────────

function showSaveConfirm(input: HTMLElement): void {
  const row = input.closest('.setting-row');
  if (!row) return;
  const check = row.querySelector('.save-check');
  if (!check) return;
  check.classList.add('show');
  setTimeout(() => check.classList.remove('show'), 1500);
}

// ── Welcome Card ─────────────────────────────────────────────────────

function initWelcomeCard(): void {
  if (localStorage.getItem('ski-welcome-dismissed')) return;
  welcomeCard.hidden = false;

  // Customize message for touch devices
  if (isTouchDevice) {
    welcomeText.innerHTML =
      'Auto-skip is enabled — ads will be skipped automatically. ' +
      'Connect a keyboard to use the <kbd>Tab</kbd> hotkey too.';
  }
}

// ── Initialize ───────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Apply theme immediately
  loadTheme();

  // Set version from manifest
  const manifest = browser.runtime.getManifest();
  versionEl.textContent = manifest.version ?? '1.0.0';

  // Load settings and stats in parallel
  const [settings, stats] = await Promise.all([loadSettings(), loadStats()]);
  currentSettings = settings;

  // Touch device adaptive UI
  if (isTouchDevice) {
    touchBanner.hidden = false;
    autoSkipRec.hidden = false;
    hotkeyHintMobile.hidden = false;
  }

  // Welcome card
  initWelcomeCard();

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

  extensionEnabledCheckbox.checked = currentSettings.enabled;
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

  if (isFirstLoad) {
    // Animate counters on first load
    animateCountUp(skipCountEl, skipCount);
    animateCountUp(skipsTodayEl, getSkipsToday(stats));
    animateCountUp(skipsWeekEl, getSkipsThisWeek(stats));
    animateCountUp(manualCountEl, manualSkipCount);
    isFirstLoad = false;
  } else {
    // Instant update with bump animation
    skipCountEl.textContent = skipCount.toLocaleString();
    skipCountEl.classList.add('bump');
    setTimeout(() => skipCountEl.classList.remove('bump'), 200);

    skipsTodayEl.textContent = getSkipsToday(stats).toLocaleString();
    skipsWeekEl.textContent = getSkipsThisWeek(stats).toLocaleString();
    manualCountEl.textContent = manualSkipCount.toLocaleString();
  }

  // These don't animate (formatted strings)
  timeSavedEl.textContent = `~${formatTimeSaved(skipCount)}`;

  // Legend counts
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

// ── Hotkey Recording ─────────────────────────────────────────────────

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

// ── Reset to Default ─────────────────────────────────────────────────

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

// ── Toggle Listeners ─────────────────────────────────────────────────

extensionEnabledCheckbox.addEventListener('change', async () => {
  currentSettings.enabled = extensionEnabledCheckbox.checked;
  await saveSettings({ enabled: currentSettings.enabled });
  showSaveConfirm(extensionEnabledCheckbox);
});

showToastCheckbox.addEventListener('change', async () => {
  currentSettings.showToast = showToastCheckbox.checked;
  await saveSettings({ showToast: currentSettings.showToast });
  showSaveConfirm(showToastCheckbox);
});

autoSkipCheckbox.addEventListener('change', async () => {
  currentSettings.autoSkip = autoSkipCheckbox.checked;
  await saveSettings({ autoSkip: currentSettings.autoSkip });
  showSaveConfirm(autoSkipCheckbox);
});

trackHistoryCheckbox.addEventListener('change', async () => {
  currentSettings.trackHistory = trackHistoryCheckbox.checked;
  await saveSettings({ trackHistory: currentSettings.trackHistory });
  recentActivitySection.hidden = !currentSettings.trackHistory;
  showSaveConfirm(trackHistoryCheckbox);
});

// ── Clear History ────────────────────────────────────────────────────

clearHistoryBtn.addEventListener('click', async () => {
  await clearRecentSkips();
  renderRecentSkips([]);
});

// ── Welcome Card Dismiss ─────────────────────────────────────────────

welcomeDismissBtn.addEventListener('click', () => {
  welcomeCard.hidden = true;
  localStorage.setItem('ski-welcome-dismissed', '1');
});

// ── Theme Toggle ─────────────────────────────────────────────────────

document.getElementById('theme-toggle')?.addEventListener('click', cycleTheme);

// ── Live Stats Updates ───────────────────────────────────────────────

browser.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync') {
    const updated: Partial<SkiSettings> = {};
    for (const [key, change] of Object.entries(changes)) {
      if (key in DEFAULT_SETTINGS) {
        (updated as Record<string, unknown>)[key] = change.newValue;
      }
    }
    currentSettings = { ...currentSettings, ...updated };
    updateUI();
  }

  if (areaName === 'local' && ('skipCount' in changes || 'autoSkipCount' in changes || 'manualSkipCount' in changes || 'dailySkips' in changes || 'recentSkips' in changes)) {
    const stats = await loadStats();
    updateStats(stats);
  }
});

// ── Start ────────────────────────────────────────────────────────────

init();
