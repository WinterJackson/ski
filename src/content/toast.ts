/**
 * Toast module — skip-confirmation feedback UI.
 *
 * Features:
 * - Theme-aware: detects YouTube dark/light mode
 * - Glassmorphism: frosted blur background
 * - Branded: left accent border + ⏭ icon
 * - Auto-dismiss with animated progress bar
 * - Responsive: bottom-center on mobile, bottom-right on desktop
 * - Rendered inside shadow DOM to avoid YouTube CSS conflicts
 * - Flicker-free in-place text updates (never blinks or tears down DOM during skipping)
 */

/** How long the completion toast stays visible (ms) */
const TOAST_DURATION_MS = 2000;

let shadowHost: HTMLElement | null = null;
/** Cached reference — mode:'closed' means .shadowRoot returns null */
let shadowRootRef: ShadowRoot | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

let toastEl: HTMLElement | null = null;
let iconSpanEl: HTMLElement | null = null;
let textSpanEl: HTMLElement | null = null;
let progressBarEl: HTMLElement | null = null;

/** Detect if YouTube is in dark mode */
function isYouTubeDark(): boolean {
  if (document.documentElement.hasAttribute('dark')) return true;
  try {
    const bg = getComputedStyle(document.body).backgroundColor;
    if (bg) {
      const match = bg.match(/\d+/g);
      if (match && match.length >= 3) {
        const r = Number(match[0]);
        const g = Number(match[1]);
        const b = Number(match[2]);
        return (r + g + b) / 3 < 128;
      }
    }
  } catch { /* non-critical */ }
  return true;
}

/** Detect if viewing on a small screen */
function isMobileView(): boolean {
  return window.innerWidth < 768 || navigator.maxTouchPoints > 0;
}

/** Build the shadow DOM styles */
function buildStyles(isDark: boolean, isMobile: boolean): string {
  const bg = isDark
    ? 'rgba(22, 22, 24, 0.92)'
    : 'rgba(255, 255, 255, 0.92)';
  const textColor = isDark ? '#f5f5f7' : '#1d1d1f';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const shadowColor = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)';

  const position = isMobile
    ? 'bottom: 16px; left: 50%; transform: translateX(-50%);'
    : 'bottom: 24px; right: 24px;';

  return `
    :host {
      position: fixed;
      ${position}
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
    }
    .toast {
      background: ${bg};
      backdrop-filter: blur(20px) saturate(1.8);
      -webkit-backdrop-filter: blur(20px) saturate(1.8);
      color: ${textColor};
      border: 1px solid ${borderColor};
      border-left: 3px solid #3ea6ff;
      border-radius: 12px;
      padding: 10px 16px 12px 14px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      box-shadow: 0 4px 20px ${shadowColor};
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 160px;
      max-width: 300px;
    }
    .toast.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .toast-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toast-icon {
      font-size: 16px;
      flex-shrink: 0;
    }
    .toast-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .progress-bar {
      height: 2px;
      border-radius: 1px;
      background: #3ea6ff;
      width: 100%;
      transform-origin: left;
    }
    .progress-bar.animate {
      animation: progressShrink ${TOAST_DURATION_MS}ms linear forwards;
    }
    .progress-bar.pulse {
      animation: progressPulse 1.5s ease-in-out infinite alternate;
    }
    @keyframes progressShrink {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
    @keyframes progressPulse {
      from { opacity: 0.35; transform: scaleX(0.7); }
      to { opacity: 1; transform: scaleX(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .toast {
        transition: none;
      }
      .progress-bar {
        animation: none;
      }
    }
  `;
}

/**
 * Show or update a toast notification on the YouTube page.
 * 
 * @param message - text to display (supports ⏭ or ⚡ icons)
 * @param autoDismiss - if true, animates progress bar and auto-hides after 2s. If false, stays visible steadily.
 */
export function showToast(message = 'Ad skipped ⏭', autoDismiss = true): void {
  const isDark = isYouTubeDark();
  const isMobile = isMobileView();

  // Create or recreate the shadow host (if detached)
  if (!shadowHost || !shadowHost.isConnected) {
    shadowHost = document.createElement('div');
    shadowHost.id = 'ski-toast-host';
    shadowRootRef = shadowHost.attachShadow({ mode: 'closed' });
    document.body.appendChild(shadowHost);
    toastEl = null; // force rebuild of inner nodes
  }

  if (!shadowRootRef) return;

  // Build inner DOM once — reuse existing nodes to eliminate visual blinking
  if (!toastEl || !toastEl.isConnected) {
    shadowRootRef.replaceChildren();

    const style = document.createElement('style');
    style.textContent = buildStyles(isDark, isMobile);

    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');

    const content = document.createElement('div');
    content.className = 'toast-content';

    iconSpanEl = document.createElement('span');
    iconSpanEl.className = 'toast-icon';

    textSpanEl = document.createElement('span');
    textSpanEl.className = 'toast-text';

    content.appendChild(iconSpanEl);
    content.appendChild(textSpanEl);

    progressBarEl = document.createElement('div');
    progressBarEl.className = 'progress-bar';

    toastEl.appendChild(content);
    toastEl.appendChild(progressBarEl);

    shadowRootRef.appendChild(style);
    shadowRootRef.appendChild(toastEl);
  }

  // Parse icon and text
  let icon = '⏭';
  let text = message;
  if (message.includes('⚡')) {
    icon = '⚡';
    text = message.replace(/⚡/g, '').trim();
  } else if (message.includes('⏭')) {
    icon = '⏭';
    text = message.replace(/⏭/g, '').trim();
  }

  if (iconSpanEl) iconSpanEl.textContent = icon;
  if (textSpanEl) textSpanEl.textContent = text;

  // Clear existing auto-hide timer
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  // Progress bar animation state
  if (progressBarEl) {
    progressBarEl.classList.remove('animate', 'pulse');
    if (autoDismiss) {
      void progressBarEl.offsetWidth; // force reflow for smooth animation start
      progressBarEl.classList.add('animate');
    } else {
      progressBarEl.classList.add('pulse');
    }
  }

  // Ensure visible
  if (toastEl) {
    toastEl.classList.add('visible');
  }

  // Auto-dismiss countdown
  if (autoDismiss) {
    hideTimer = setTimeout(() => {
      if (toastEl) {
        toastEl.classList.remove('visible');
      }
      hideTimer = null;
    }, TOAST_DURATION_MS);
  }
}

/** Smoothly hide the toast */
export function hideToast(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (toastEl) {
    toastEl.classList.remove('visible');
  }
}

/** Remove the toast host from the DOM entirely */
export function destroyToast(): void {
  hideToast();
  if (shadowHost && shadowHost.parentNode) {
    shadowHost.parentNode.removeChild(shadowHost);
    shadowHost = null;
    shadowRootRef = null;
    toastEl = null;
    iconSpanEl = null;
    textSpanEl = null;
    progressBarEl = null;
  }
}
