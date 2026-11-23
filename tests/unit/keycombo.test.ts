/**
 * Unit tests for keycombo module.
 */
import { describe, it, expect } from 'vitest';
import {
  serializeKeyCombo,
  parseKeyCombo,
  matchesKeyCombo,
  formatKeyCode,
  keyComboFromEvent,
} from '../../src/shared/keycombo';

describe('serializeKeyCombo', () => {
  it('serializes a bare key', () => {
    expect(serializeKeyCombo({ code: 'Period', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }))
      .toBe('.');
  });

  it('serializes a key with modifiers', () => {
    expect(serializeKeyCombo({ code: 'KeyA', ctrlKey: true, altKey: false, shiftKey: true, metaKey: false }))
      .toBe('Ctrl+Shift+A');
  });

  it('serializes all modifiers', () => {
    expect(serializeKeyCombo({ code: 'KeyX', ctrlKey: true, altKey: true, shiftKey: true, metaKey: true }))
      .toBe('Ctrl+Alt+Shift+Meta+X');
  });
});

describe('parseKeyCombo', () => {
  it('parses a bare key', () => {
    const combo = parseKeyCombo('.');
    expect(combo.code).toBe('Period');
    expect(combo.ctrlKey).toBe(false);
  });

  it('parses a key with modifiers', () => {
    const combo = parseKeyCombo('Ctrl+Shift+A');
    expect(combo.code).toBe('KeyA');
    expect(combo.ctrlKey).toBe(true);
    expect(combo.shiftKey).toBe(true);
    expect(combo.altKey).toBe(false);
  });

  it('round-trips with serialize', () => {
    const original = { code: 'KeyB', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false };
    const serialized = serializeKeyCombo(original);
    const parsed = parseKeyCombo(serialized);
    expect(parsed).toEqual(original);
  });
});

describe('formatKeyCode', () => {
  it('strips Key prefix', () => {
    expect(formatKeyCode('KeyA')).toBe('A');
  });

  it('strips Digit prefix', () => {
    expect(formatKeyCode('Digit5')).toBe('5');
  });

  it('maps Period', () => {
    expect(formatKeyCode('Period')).toBe('.');
  });

  it('maps arrow keys', () => {
    expect(formatKeyCode('ArrowUp')).toBe('↑');
  });

  it('passes through unknown codes', () => {
    expect(formatKeyCode('F12')).toBe('F12');
  });
});

describe('matchesKeyCombo', () => {
  it('matches exact combo', () => {
    const event = new KeyboardEvent('keydown', {
      code: 'Period',
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    });
    const combo = { code: 'Period', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
    expect(matchesKeyCombo(event, combo)).toBe(true);
  });

  it('rejects mismatched modifier', () => {
    const event = new KeyboardEvent('keydown', {
      code: 'Period',
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    });
    const combo = { code: 'Period', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
    expect(matchesKeyCombo(event, combo)).toBe(false);
  });

  it('rejects mismatched key', () => {
    const event = new KeyboardEvent('keydown', {
      code: 'KeyA',
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    });
    const combo = { code: 'Period', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
    expect(matchesKeyCombo(event, combo)).toBe(false);
  });
});

