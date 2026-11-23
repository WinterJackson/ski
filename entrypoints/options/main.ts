/**
 * Options page script.
 * Handles hotkey recording, settings persistence, and conflict warnings.
 */

import { serializeKeyCombo, keyComboFromEvent } from '../../src/shared/keycombo';
import {
  loadSettings,
  saveSettings,
  hasYouTubeConflict,
  DEFAULT_SETTINGS,
  type SkipKeySettings,
} from '../../src/shared/settings';

// ----- DOM references -----
const hotkeyInput = document.getElementById('hotkey-input') as HTMLInputElement;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-hotkey') as HTMLButtonElement;
const conflictWarning = document.getElementById('conflict-warning') as HTMLElement;
const showToastCheckbox = document.getElementById('show-toast') as HTMLInputElement;
const autoSkipCheckbox = document.getElementById('auto-skip') as HTMLInputElement;
const skipCountEl = document.getElementById('skip-count') as HTMLElement;
const versionEl = document.getElementById('version') as HTMLElement;

let isRecording = false;
let currentSettings: SkipKeySettings;

// ----- Initialize -----
async function init(): Promise<void> {
  // Set version from manifest
  const manifest = browser.runtime.getManifest();
  versionEl.textContent = manifest.version ?? '0.1.0';

  // Load settings
  currentSettings = await loadSettings();
  updateUI();

  // Load skip count from local storage
  const local = await browser.storage.local.get({ skipCount: 0 });
  skipCountEl.textContent = String(local.skipCount ?? 0);
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

  // Show conflict warning
  conflictWarning.hidden = !hasYouTubeConflict(currentSettings);
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

// ----- Start -----
init();

