/**
 * Fixture-based tests for the detector module.
 * Tests detection against saved DOM snapshots of real YouTube player states.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  findSkipButton,
  isAdShowing,
  isVisible,
  matchesSkipText,
  discoverSkipButton,
} from '../../src/content/detector';
import {
  FIXTURE_SKIPPABLE_AD,
  FIXTURE_COUNTDOWN,
  FIXTURE_NO_AD,
  FIXTURE_UNSKIPPABLE,
  FIXTURE_NON_ENGLISH,
  FIXTURE_UNKNOWN_CLASSES,
} from '../fixtures/player-states';

function loadFixture(html: string): void {
  document.body.innerHTML = html;
}

describe('detector with fixtures', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('isAdShowing', () => {
    it('returns true when player has ad-showing class', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD);
      expect(isAdShowing()).toBe(true);
    });

    it('returns false when no ad', () => {
      loadFixture(FIXTURE_NO_AD);
      expect(isAdShowing()).toBe(false);
    });
  });

  describe('findSkipButton', () => {
    it('finds the skip button in a skippable ad state', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD);
      const button = findSkipButton();
      expect(button).not.toBeNull();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('returns null during countdown (button hidden)', () => {
      loadFixture(FIXTURE_COUNTDOWN);
      const button = findSkipButton();
      expect(button).toBeNull();
    });

    it('returns null when no ad is showing', () => {
      loadFixture(FIXTURE_NO_AD);
      const button = findSkipButton();
      expect(button).toBeNull();
    });

    it('returns null for unskippable ad', () => {
      loadFixture(FIXTURE_UNSKIPPABLE);
      const button = findSkipButton();
      expect(button).toBeNull();
    });

    it('finds the skip button with non-English text', () => {
      loadFixture(FIXTURE_NON_ENGLISH);
      const button = findSkipButton();
      expect(button).not.toBeNull();
    });
  });

  describe('self-healing: discoverSkipButton', () => {
    it('discovers a skip button when class names are completely unknown', () => {
      loadFixture(FIXTURE_UNKNOWN_CLASSES);
      // Known selectors won't match, but heuristic discovery should find it
      const button = discoverSkipButton();
      expect(button).not.toBeNull();
      expect(button?.textContent?.trim()).toContain('Skip');
    });
  });

  describe('matchesSkipText', () => {
    it('matches English "Skip Ad"', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD);
      const button = document.querySelector('button')!;
      expect(matchesSkipText(button)).toBe(true);
    });

    it('matches German "Überspringen"', () => {
      loadFixture(FIXTURE_NON_ENGLISH);
      const button = document.querySelector('button')!;
      expect(matchesSkipText(button)).toBe(true);
    });
  });
});
