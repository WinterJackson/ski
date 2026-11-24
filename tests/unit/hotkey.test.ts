/**
 * Unit tests for hotkey module.
 */
import { describe, it, expect } from 'vitest';
import { isTypingContext, shouldTriggerSkip } from '../../src/content/hotkey';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';

function makeKeyEvent(
  overrides: Partial<KeyboardEventInit> & { targetTag?: string; contentEditable?: boolean } = {}
): KeyboardEvent {
  const { targetTag, contentEditable, ...eventInit } = overrides;
  const event = new KeyboardEvent('keydown', {
    code: 'Tab',
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...eventInit,
  });

  // Create a real target element and attach to document so properties work in jsdom
  if (targetTag || contentEditable) {
    const el = document.createElement(targetTag ?? 'div');
    if (contentEditable) {
      el.setAttribute('contenteditable', 'true');
    }
    // Attach to document so isContentEditable resolves correctly
    document.body.appendChild(el);
    Object.defineProperty(event, 'target', { value: el, writable: false });
  }

  return event;
}

describe('isTypingContext', () => {
  it('returns true for INPUT elements', () => {
    const event = makeKeyEvent({ targetTag: 'INPUT' });
    expect(isTypingContext(event)).toBe(true);
  });

  it('returns true for TEXTAREA elements', () => {
    const event = makeKeyEvent({ targetTag: 'TEXTAREA' });
    expect(isTypingContext(event)).toBe(true);
  });

  it('returns true for SELECT elements', () => {
    const event = makeKeyEvent({ targetTag: 'SELECT' });
    expect(isTypingContext(event)).toBe(true);
  });

  it('returns true for contenteditable elements', () => {
    const event = makeKeyEvent({ targetTag: 'DIV', contentEditable: true });
    expect(isTypingContext(event)).toBe(true);
  });

  it('returns false for regular div', () => {
    const event = makeKeyEvent({ targetTag: 'DIV' });
    expect(isTypingContext(event)).toBe(false);
  });
});

describe('shouldTriggerSkip', () => {
  it('returns true for matching key on a non-typing target', () => {
    const event = makeKeyEvent({ code: 'Tab', targetTag: 'DIV' });
    expect(shouldTriggerSkip(event, DEFAULT_SETTINGS)).toBe(true);
  });

  it('returns false for wrong key', () => {
    const event = makeKeyEvent({ code: 'KeyA', targetTag: 'DIV' });
    expect(shouldTriggerSkip(event, DEFAULT_SETTINGS)).toBe(false);
  });

  it('returns false for repeat events', () => {
    const event = makeKeyEvent({ code: 'Tab', targetTag: 'DIV', repeat: true });
    expect(shouldTriggerSkip(event, DEFAULT_SETTINGS)).toBe(false);
  });

  it('returns false when typing in an input', () => {
    const event = makeKeyEvent({ code: 'Tab', targetTag: 'INPUT' });
    expect(shouldTriggerSkip(event, DEFAULT_SETTINGS)).toBe(false);
  });

  it('respects modifier settings', () => {
    const settings = { ...DEFAULT_SETTINGS, keyCode: 'KeyS', ctrlKey: true };
    const eventWithCtrl = makeKeyEvent({ code: 'KeyS', ctrlKey: true, targetTag: 'DIV' });
    const eventWithoutCtrl = makeKeyEvent({ code: 'KeyS', ctrlKey: false, targetTag: 'DIV' });

    expect(shouldTriggerSkip(eventWithCtrl, settings)).toBe(true);
    expect(shouldTriggerSkip(eventWithoutCtrl, settings)).toBe(false);
  });
});
