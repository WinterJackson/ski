/**
 * Hotkey module — key matching and typing-context guard.
 *
 * - Listens in the capture phase so YouTube's handlers cannot swallow the key.
 * - Uses event.code for layout independence.
 * - Skips when the target is an input, textarea, select, or contenteditable.
 * - Ignores event.repeat to prevent double clicks.
 */

import type { SkipKeySettings } from '../shared/settings';

/** Elements where keystrokes should be treated as typing, not shortcuts */
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Check if the event target is a typing context (input, textarea,
 * contenteditable, etc.) where the hotkey should be ignored.
 */
export function isTypingContext(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;

  // Standard form elements
  if (TYPING_TAGS.has(target.tagName)) return true;

  // contenteditable elements (comments, rich text editors)
  // Check both the property and attribute — jsdom doesn't always reflect the property
  if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') return true;

  // IME composition in progress
  if (event.isComposing) return true;

  return false;
}

/**
 * Check if a keyboard event matches the configured hotkey.
 */
export function matchesHotkey(event: KeyboardEvent, settings: SkipKeySettings): boolean {
  return (
    event.code === settings.keyCode &&
    event.ctrlKey === settings.ctrlKey &&
    event.altKey === settings.altKey &&
    event.shiftKey === settings.shiftKey &&
    event.metaKey === settings.metaKey
  );
}

/**
 * Determine if a keyboard event should trigger a skip attempt.
 * Returns true only if:
 * - The key matches the configured hotkey
 * - It's not a repeat event
 * - The user is not typing
 */
export function shouldTriggerSkip(event: KeyboardEvent, settings: SkipKeySettings): boolean {
  // Don't trigger on held keys
  if (event.repeat) return false;

  // Don't trigger while typing
  if (isTypingContext(event)) return false;

  // Check if the key matches
  return matchesHotkey(event, settings);
}

