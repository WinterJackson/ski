/**
 * Comprehensive fixture-based tests for the detector module.
 * Tests detection against saved DOM snapshots of real YouTube player states,
 * including nuclear self-healing scenarios with fully obfuscated classes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  findSkipButton,
  isAdShowing,
  isVisible,
  matchesSkipText,
  discoverSkipButton,
  clickSkipButton,
  getPlayerElement,
} from '../../src/content/detector';
import {
  FIXTURE_SKIPPABLE_AD,
  FIXTURE_SKIPPABLE_AD_MODERN,
  FIXTURE_SKIPPABLE_AD_2026,
  FIXTURE_COUNTDOWN,
  FIXTURE_NO_AD,
  FIXTURE_UNSKIPPABLE,
  FIXTURE_NON_ENGLISH,
  FIXTURE_NON_ENGLISH_JAPANESE,
  FIXTURE_NON_ENGLISH_SPANISH,
  FIXTURE_UNKNOWN_CLASSES,
  FIXTURE_FULLY_OBFUSCATED,
  FIXTURE_FULLY_OBFUSCATED_INTL,
  FIXTURE_ROLE_BUTTON,
} from '../fixtures/player-states';

function loadFixture(html: string): void {
  document.body.innerHTML = html;
}

describe('detector with fixtures', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // ── isAdShowing ──────────────────────────────────────────────────────

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

    it('returns true even with obfuscated button classes', () => {
      loadFixture(FIXTURE_FULLY_OBFUSCATED);
      expect(isAdShowing()).toBe(true);
    });

    it('returns false when no ad', () => {
      loadFixture(FIXTURE_NO_AD);
      expect(isAdShowing()).toBe(false);
    });

    it('detects ads via ad overlay containers', () => {
      // Player has ad-showing but test that ad module also triggers detection
      loadFixture(FIXTURE_SKIPPABLE_AD);
      expect(isAdShowing()).toBe(true);
    });
  });

  // ── findSkipButton ───────────────────────────────────────────────────

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

    it('finds the skip button with non-English text (German)', () => {
      loadFixture(FIXTURE_NON_ENGLISH);
      const button = findSkipButton();
      expect(button).not.toBeNull();
    });

    it('finds the skip button with Japanese text', () => {
      loadFixture(FIXTURE_NON_ENGLISH_JAPANESE);
      const button = findSkipButton();
      expect(button).not.toBeNull();
      expect(button?.textContent?.trim()).toContain('スキップ');
    });

    it('finds the skip button with Spanish text', () => {
      loadFixture(FIXTURE_NON_ENGLISH_SPANISH);
      const button = findSkipButton();
      expect(button).not.toBeNull();
    });

    it('finds a role="button" div as skip button', () => {
      loadFixture(FIXTURE_ROLE_BUTTON);
      const button = findSkipButton();
      expect(button).not.toBeNull();
      expect(button?.getAttribute('role')).toBe('button');
    });
  });

  // ── Self-healing: discoverSkipButton ─────────────────────────────────

  describe('self-healing: discoverSkipButton', () => {
    it('discovers a skip button when class names are partially unknown', () => {
      loadFixture(FIXTURE_UNKNOWN_CLASSES);
      const button = discoverSkipButton();
      expect(button).not.toBeNull();
      expect(button?.textContent?.trim()).toContain('Skip');
    });

    it('discovers a skip button when ALL classes are fully obfuscated (nuclear test)', () => {
      loadFixture(FIXTURE_FULLY_OBFUSCATED);
      // No CSS selector will match — only the heuristic can find it
      const button = discoverSkipButton();
      expect(button).not.toBeNull();
      expect(button?.textContent?.trim()).toBe('Skip');
    });

    it('discovers a non-English skip button with fully obfuscated classes', () => {
      loadFixture(FIXTURE_FULLY_OBFUSCATED_INTL);
      const button = discoverSkipButton();
      expect(button).not.toBeNull();
      expect(button?.textContent?.trim()).toContain('atla');
    });

    it('picks the skip button over other buttons in the obfuscated DOM', () => {
      loadFixture(FIXTURE_FULLY_OBFUSCATED);
      const button = discoverSkipButton();
      expect(button).not.toBeNull();
      // Should pick "Skip" (score ~0.65) over "Learn more" (score ~0.35)
      // and "Why this ad?" (score ~0.25)
      expect(button?.textContent?.trim()).toBe('Skip');
    });
  });

  // ── matchesSkipText ──────────────────────────────────────────────────

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

    it('matches Japanese "スキップ"', () => {
      loadFixture(FIXTURE_NON_ENGLISH_JAPANESE);
      const button = document.querySelector('button')!;
      expect(matchesSkipText(button)).toBe(true);
    });

    it('matches Spanish "Saltar anuncio"', () => {
      loadFixture(FIXTURE_NON_ENGLISH_SPANISH);
      const button = document.querySelector('button')!;
      expect(matchesSkipText(button)).toBe(true);
    });

    it('does not match "Learn more" text', () => {
      const el = document.createElement('button');
      el.textContent = 'Learn more';
      document.body.appendChild(el);
      expect(matchesSkipText(el)).toBe(false);
    });

    it('does not match "Why this ad?" text', () => {
      const el = document.createElement('button');
      el.textContent = 'Why this ad?';
      document.body.appendChild(el);
      expect(matchesSkipText(el)).toBe(false);
    });
  });

  // ── clickSkipButton ──────────────────────────────────────────────────

  describe('clickSkipButton', () => {
    it('calls click() on the button', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD);
      const button = findSkipButton()!;
      let clicked = false;
      button.addEventListener('click', () => { clicked = true; });
      clickSkipButton(button);
      expect(clicked).toBe(true);
    });

    it('clicks parent container as part of ancestor walk', () => {
      loadFixture(FIXTURE_SKIPPABLE_AD);
      const button = findSkipButton()!;
      const container = button.closest('.ytp-ad-skip-button-container') as HTMLElement;
      expect(container).not.toBeNull();
      let containerClickCount = 0;
      container.addEventListener('click', () => {
        containerClickCount++;
      });
      clickSkipButton(button);
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

  // ── isVisible ────────────────────────────────────────────────────────

  describe('isVisible', () => {
    it('returns false for display:none', () => {
      const el = document.createElement('button');
      el.style.display = 'none';
      document.body.appendChild(el);
      expect(isVisible(el)).toBe(false);
    });

    it('returns false for visibility:hidden', () => {
      const el = document.createElement('button');
      el.style.visibility = 'hidden';
      document.body.appendChild(el);
      expect(isVisible(el)).toBe(false);
    });

    it('returns true for display:block', () => {
      const el = document.createElement('button');
      el.style.display = 'block';
      document.body.appendChild(el);
      expect(isVisible(el)).toBe(true);
    });

    it('returns false when an ancestor has display:none or visibility:hidden', () => {
      const parent = document.createElement('div');
      parent.style.display = 'none';
      const el = document.createElement('button');
      el.style.display = 'block';
      parent.appendChild(el);
      document.body.appendChild(parent);
      expect(isVisible(el)).toBe(false);

      parent.style.display = 'block';
      parent.style.visibility = 'hidden';
      expect(isVisible(el)).toBe(false);

      parent.style.visibility = 'visible';
      el.style.opacity = '0';
      expect(isVisible(el)).toBe(false);
    });

    it('prefers #movie_player over an earlier .html5-video-player preview', () => {
      const preview = document.createElement('div');
      preview.id = 'inline-preview-player';
      preview.className = 'html5-video-player';
      const mainPlayer = document.createElement('div');
      mainPlayer.id = 'movie_player';
      mainPlayer.className = 'html5-video-player ad-showing';
      document.body.appendChild(preview);
      document.body.appendChild(mainPlayer);
      expect(getPlayerElement()).toBe(mainPlayer);
    });

    it('ignores empty oval or countdown-only skip buttons', () => {
      const player = document.createElement('div');
      player.id = 'movie_player';
      player.className = 'html5-video-player ad-showing';

      const emptyBtn = document.createElement('button');
      emptyBtn.className = 'ytp-skip-ad-button';
      emptyBtn.style.display = 'block';
      player.appendChild(emptyBtn);
      document.body.appendChild(player);
      expect(findSkipButton()).toBeNull();

      emptyBtn.textContent = '5';
      expect(findSkipButton()).toBeNull();

      emptyBtn.textContent = 'Skip in 5';
      expect(findSkipButton()).toBeNull();

      emptyBtn.textContent = 'Skip';
      expect(findSkipButton()).toBe(emptyBtn);
    });

    it('returns false when checkVisibility returns false or 0x0 in layout engine', () => {
      const el = document.createElement('button') as HTMLButtonElement & {
        checkVisibility?: () => boolean;
      };
      el.style.display = 'block';
      el.checkVisibility = () => false;
      document.body.appendChild(el);
      expect(isVisible(el)).toBe(false);

      // Even if checkVisibility returns true, 0x0 bounding rect in a real browser is hidden
      el.checkVisibility = () => true;
      el.getBoundingClientRect = () => ({ width: 0, height: 0 } as DOMRect);
      expect(isVisible(el)).toBe(false);

      // Non-zero bounding rect + checkVisibility=true is visible
      el.getBoundingClientRect = () => ({ width: 80, height: 36, left: 0, top: 0 } as DOMRect);
      expect(isVisible(el)).toBe(true);
    });
  });
});
