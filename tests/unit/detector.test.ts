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
  clickSkipButton,
} from '../../src/content/detector';
import {
  FIXTURE_SKIPPABLE_AD,
  FIXTURE_SKIPPABLE_AD_MODERN,
  FIXTURE_SKIPPABLE_AD_2026,
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

    it('returns true for modern ad layout', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD_MODERN);
      expect(isAdShowing()).toBe(true);
    });

    it('returns true for 2026 ad layout', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD_2026);
      expect(isAdShowing()).toBe(true);
    });

    it('returns false when no ad', () => {
      loadFixture(FIXTURE_NO_AD);
      expect(isAdShowing()).toBe(false);
    });
  });

  describe('findSkipButton', () => {
    it('finds the skip button in a legacy skippable ad state', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD);
      const button = findSkipButton();
      expect(button).not.toBeNull();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('finds the skip button in a modern skippable ad state', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD_MODERN);
      const button = findSkipButton();
      expect(button).not.toBeNull();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('finds the skip button in a 2026 skippable ad state', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD_2026);
      const button = findSkipButton();
      expect(button).not.toBeNull();
      expect(button?.tagName).toBe('BUTTON');
      expect(button?.textContent?.trim()).toContain('Skip');
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

    it('matches bare "Skip" text', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD_2026);
      const button = document.querySelector('button')!;
      expect(matchesSkipText(button)).toBe(true);
    });

    it('matches German "Überspringen"', () => {
      loadFixture(FIXTURE_NON_ENGLISH);
      const button = document.querySelector('button')!;
      expect(matchesSkipText(button)).toBe(true);
    });
  });

  describe('clickSkipButton', () => {
    it('calls click() on the button', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD);
      const button = findSkipButton()!;
      let clicked = false;
      button.addEventListener('click', () => { clicked = true; });
      clickSkipButton(button);
      expect(clicked).toBe(true);
    });

    it('also clicks the parent container if it exists', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD);
      const button = findSkipButton()!;
      const container = button.closest('.ytp-ad-skip-button-container') as HTMLElement;
      expect(container).not.toBeNull();
      let containerClickCount = 0;
      container.addEventListener('click', () => {
        containerClickCount++;
      });
      clickSkipButton(button);
      // Container receives clicks: bubbled from button + ancestor walk + shotgun
      expect(containerClickCount).toBeGreaterThanOrEqual(1);
    });

    it('dispatches __ski_skip custom event for main-world helper', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD);
      const button = findSkipButton()!;
      let eventFired = false;
      document.addEventListener('__ski_skip', () => { eventFired = true; }, { once: true });
      clickSkipButton(button);
      expect(eventFired).toBe(true);
    });

    it('does not throw when button has no matching container', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      expect(() => clickSkipButton(button)).not.toThrow();
    });
  });
});
