// Client-side passphrase gate. SHA-256 hash compared in-browser.
// Acknowledged: bypassable by anyone who views source. Social barrier only.
// On the first successful unlock per session, fires a fire-and-forget POST to
// /.netlify/functions/unlock-ping so the site owner gets a Telegram alert.
(async function () {
  const expected = document.body.dataset.passhash;
  const gate = document.getElementById('gate');
  const app = document.getElementById('app');
  const form = document.getElementById('gate-form');
  const input = document.getElementById('gate-input');
  const errBox = document.getElementById('gate-error');

  async function sha256(s) {
    const buf = await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function pingOwner() {
    try {
      fetch('/.netlify/functions/unlock-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: location.pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch (_) { /* never let analytics break the gate */ }
  }

  function reveal() {
    gate.hidden = true;
    app.hidden = false;
    if (window.afterUnlock) window.afterUnlock();
  }

  if (sessionStorage.getItem('ab_unlocked') === expected) {
    reveal();
    return;
  }
  gate.hidden = false;

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    errBox.hidden = true;
    const hash = await sha256(input.value);
    if (hash === expected) {
      sessionStorage.setItem('ab_unlocked', expected);
      pingOwner();
      reveal();
    } else {
      errBox.hidden = false;
      input.value = '';
      input.focus();
    }
  });
})();
