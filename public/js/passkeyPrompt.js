import { Passkeys } from 'https://cdn.jsdelivr.net/npm/@laravel/passkeys@0.4.0/+esm';

const DISMISS_KEY = 'afiezfinancial:passkeyPromptDismissed';

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  return 'Peranti ini';
}

function toast(message) {
  window.dispatchEvent(new CustomEvent('toast', { detail: message }));
}

export function initPasskeyPrompt(user) {
  const banner = document.getElementById('passkey-banner');
  const enableBtn = document.getElementById('passkey-enable-btn');
  const dismissBtn = document.getElementById('passkey-dismiss-btn');

  if (user.has_passkeys || localStorage.getItem(DISMISS_KEY) || !Passkeys.isSupported()) return;

  banner.hidden = false;

  dismissBtn.addEventListener('click', () => {
    localStorage.setItem(DISMISS_KEY, '1');
    banner.hidden = true;
  });

  enableBtn.addEventListener('click', async () => {
    enableBtn.disabled = true;
    enableBtn.textContent = 'Menyediakan…';
    try {
      await Passkeys.register({ name: deviceLabel() });
      banner.hidden = true;
      toast('Face ID diaktifkan untuk peranti ini.');
    } catch (err) {
      enableBtn.disabled = false;
      enableBtn.textContent = 'Aktifkan';
      if (err?.name !== 'UserCancelledError') {
        toast('Gagal aktifkan Face ID. Sila cuba lagi.');
      }
    }
  });
}
