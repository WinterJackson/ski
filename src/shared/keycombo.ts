/**
 * Parse, serialize, and compare key combinations.
 * Uses event.code for layout independence.
 */

export interface KeyCombo {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

/** Serialize a key combo to a human-readable string like "Ctrl+Shift+KeyA" */
export function serializeKeyCombo(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.ctrlKey) parts.push('Ctrl');
  if (combo.altKey) parts.push('Alt');
  if (combo.shiftKey) parts.push('Shift');
  if (combo.metaKey) parts.push('Meta');
  parts.push(formatKeyCode(combo.code));
  return parts.join('+');
}

/** Parse a serialized key combo string back into a KeyCombo */
export function parseKeyCombo(str: string): KeyCombo {
  const parts = str.split('+');
  const code = parts[parts.length - 1];
  return {
    code: unformatKeyCode(code),
    ctrlKey: parts.includes('Ctrl'),
    altKey: parts.includes('Alt'),
    shiftKey: parts.includes('Shift'),
    metaKey: parts.includes('Meta'),
  };
}

/** Check if a keyboard event matches a key combo */
export function matchesKeyCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  return (
    event.code === combo.code &&
    event.ctrlKey === combo.ctrlKey &&
    event.altKey === combo.altKey &&
    event.shiftKey === combo.shiftKey &&
    event.metaKey === combo.metaKey
  );
}

/** Create a KeyCombo from a KeyboardEvent */
export function keyComboFromEvent(event: KeyboardEvent): KeyCombo {
  return {
    code: event.code,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
  };
}

/** Format a key code for display (e.g., "KeyA" → "A", "Period" → ".") */
export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);

  const map: Record<string, string> = {
    Period: '.',
    Comma: ',',
    Slash: '/',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    Space: 'Space',
    Enter: 'Enter',
    Escape: 'Esc',
    Backspace: 'Backspace',
    Tab: 'Tab',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  };
  return map[code] ?? code;
}

/** Convert a formatted key name back to a code */
function unformatKeyCode(formatted: string): string {
  if (formatted.length === 1 && formatted >= 'A' && formatted <= 'Z') return `Key${formatted}`;
  if (formatted.length === 1 && formatted >= '0' && formatted <= '9') return `Digit${formatted}`;

  const reverseMap: Record<string, string> = {
    '.': 'Period',
    ',': 'Comma',
    '/': 'Slash',
    '\\': 'Backslash',
    '[': 'BracketLeft',
    ']': 'BracketRight',
    ';': 'Semicolon',
    "'": 'Quote',
    '`': 'Backquote',
    '-': 'Minus',
    '=': 'Equal',
    Space: 'Space',
    Enter: 'Enter',
    Esc: 'Escape',
    Backspace: 'Backspace',
    Tab: 'Tab',
    '↑': 'ArrowUp',
    '↓': 'ArrowDown',
    '←': 'ArrowLeft',
    '→': 'ArrowRight',
  };
  return reverseMap[formatted] ?? formatted;
}

