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
 */

/** How long the toast stays visible (ms) */
const TOAST_DURATION_MS = 2000;

let shadowHost: HTMLElement | null = null;
/** Cached reference — mode:'closed' means .shadowRoot returns null */
let shadowRootRef: ShadowRoot | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** Detect if YouTube is in dark mode */
function isYouTubeDark(): boolean {
  // YouTube sets a 'dark' attribute on <html> in dark mode
  if (document.documentElement.hasAttribute('dark')) return true;
  // Fallback: check background luminance
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
  return true; // default to dark (YouTube defaults to dark)
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
      animation: progressShrink ${TOAST_DURATION_MS}ms linear forwards;
    }
    @keyframes progressShrink {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
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

/** Show a brief toast on the YouTube page */
export function showToast(message = 'Ad skipped ⏭'): void {
  const isDark = isYouTubeDark();
  const isMobile = isMobileView();

  // Create or recreate the shadow host (theme/position may have changed)
  if (!shadowHost || !shadowHost.isConnected) {
    shadowHost = document.createElement('div');
    shadowHost.id = 'ski-toast-host';
    shadowRootRef = shadowHost.attachShadow({ mode: 'closed' });
    document.body.appendChild(shadowHost);
  }

  if (!shadowRootRef) return;

  // Rebuild shadow content with current theme
  shadowRootRef.replaceChildren();

  const style = document.createElement('style');
  style.textContent = buildStyles(isDark, isMobile);

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  // Extract icon from message or use default
  let icon = '⏭';
  let text = message;
  if (message.includes('⚡')) {
    icon = '⚡';
    text = message.replace(/⚡/g, '').trim();
  } else if (message.includes('⏭')) {
    icon = '⏭';
    text = message.replace(/⏭/g, '').trim();
  }

  const content = document.createElement('div');
  content.className = 'toast-content';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.textContent = icon;

  const textSpan = document.createElement('span');
  textSpan.className = 'toast-text';
  textSpan.textContent = text;

  content.appendChild(iconSpan);
  content.appendChild(textSpan);

  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';

  toast.appendChild(content);
  toast.appendChild(progressBar);

  shadowRootRef.appendChild(style);
  shadowRootRef.appendChild(toast);

  // Clear any pending hide
  if (hideTimer) {
    clearTimeout(hideTimer);
  }

  // Force reflow then show
  void toast.offsetHeight;
  toast.classList.add('visible');

  // Auto-hide
  hideTimer = setTimeout(() => {
    toast.classList.remove('visible');
    hideTimer = null;
  }, TOAST_DURATION_MS);
}

/** Remove the toast host from the DOM entirely */
export function destroyToast(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (shadowHost && shadowHost.parentNode) {
    shadowHost.parentNode.removeChild(shadowHost);
    shadowHost = null;
    shadowRootRef = null;
  }
}
