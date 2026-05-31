// Client-side passphrase gate. SHA-256 hash compared in-browser.
// Acknowledged: bypassable by anyone who views source. Social barrier only.
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

  function unlock() {
    gate.hidden = true;
    app.hidden = false;
    if (window.afterUnlock) window.afterUnlock();
  }

  if (sessionStorage.getItem('ab_unlocked') === expected) {
    unlock();
    return;
  }
  gate.hidden = false;

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    errBox.hidden = true;
    const hash = await sha256(input.value);
    if (hash === expected) {
      sessionStorage.setItem('ab_unlocked', expected);
      unlock();
    } else {
      errBox.hidden = false;
      input.value = '';
      input.focus();
    }
  });
})();
