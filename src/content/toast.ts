/**
 * Toast module — optional skip-confirmation feedback UI.
 * Rendered inside a shadow root to avoid YouTube CSS conflicts.
 */

/** How long the toast stays visible (ms) */
const TOAST_DURATION_MS = 1500;

let shadowHost: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** Show a brief "Ad skipped" toast on the page */
export function showToast(message = 'Ad skipped ⏭'): void {
  // Create the shadow host on first use
  if (!shadowHost) {
    shadowHost = document.createElement('div');
    shadowHost.id = 'skipkey-toast-host';
    const shadow = shadowHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: fixed;
        bottom: 80px;
        right: 24px;
        z-index: 2147483647;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .toast {
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }
      @media (prefers-reduced-motion: reduce) {
        .toast {
          transition: none;
        }
      }
    `;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    shadow.appendChild(style);
    shadow.appendChild(toast);
    document.body.appendChild(shadowHost);
  }

  const shadow = shadowHost.shadowRoot ?? shadowHost.attachShadow({ mode: 'closed' });
  const toast = shadow.querySelector('.toast') as HTMLElement;
  if (!toast) return;

  // Clear any pending hide
  if (hideTimer) {
    clearTimeout(hideTimer);
  }

  // Update text and show
  toast.textContent = message;
  // Force reflow for re-trigger animation
  toast.classList.remove('visible');
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
  }
}

