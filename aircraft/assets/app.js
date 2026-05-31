// List-view filtering, sorting, pagination — all client-side.
window.afterUnlock = function () { initApp(); };

const PAGE_SIZE = 50;
let DATA = [];
let view = [];
let page = 1;
let sortKey = 'score';
let sortDir = -1; // -1 desc, +1 asc

async function initApp() {
  const resp = await fetch('data.json');
  DATA = await resp.json();
  populateStateFilter();
  bindFilters();
  bindSort();
  applyFilters();
}

function populateStateFilter() {
  const sel = document.getElementById('f-state');
  const states = [...new Set(DATA.map(r => r.state).filter(Boolean))].sort();
  for (const s of states) {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    sel.appendChild(opt);
  }
}

function bindFilters() {
  const ids = ['f-state', 'f-bucket', 'f-min-score', 'f-mfr', 'f-owner',
               'f-salvage', 'f-obit'];
  for (const id of ids) {
    document.getElementById(id).addEventListener('input', () => {
      page = 1; applyFilters();
    });
  }
  document.getElementById('f-reset').addEventListener('click', () => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el.type === 'checkbox') el.checked = false; else el.value = '';
    }
    page = 1; applyFilters();
  });
  document.getElementById('pg-prev').addEventListener('click', () => {
    if (page > 1) { page--; render(); }
  });
  document.getElementById('pg-next').addEventListener('click', () => {
    const last = Math.max(1, Math.ceil(view.length / PAGE_SIZE));
    if (page < last) { page++; render(); }
  });
}

function bindSort() {
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (sortKey === k) sortDir = -sortDir;
      else { sortKey = k; sortDir = (k === 'score') ? -1 : 1; }
      applyFilters();
    });
  });
}

function applyFilters() {
  const state = document.getElementById('f-state').value;
  const bucket = document.getElementById('f-bucket').value;
  const minScore = parseInt(document.getElementById('f-min-score').value, 10);
  const mfr = document.getElementById('f-mfr').value.trim().toUpperCase();
  const owner = document.getElementById('f-owner').value.trim().toUpperCase();
  const salvage = document.getElementById('f-salvage').value;
  const obit = document.getElementById('f-obit').checked;

  view = DATA.filter(r => {
    if (state && r.state !== state) return false;
    if (bucket && r.bucket !== bucket) return false;
    if (!isNaN(minScore) && r.score < minScore) return false;
    if (mfr && !(r.mfr || '').toUpperCase().includes(mfr)) return false;
    if (owner && !(r.owner_name || '').toUpperCase().includes(owner)) return false;
    if (salvage === 'only' && !r.is_salvage) return false;
    if (salvage === 'exclude' && r.is_salvage) return false;
    if (obit && r.obit_confidence !== 'definite') return false;
    return true;
  });

  view.sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return -1 * sortDir;
    if (av > bv) return  1 * sortDir;
    return 0;
  });

  render();
}

function render() {
  document.getElementById('match-count').textContent = view.length.toLocaleString();
  const tbody = document.getElementById('rows');
  const start = (page - 1) * PAGE_SIZE;
  const slice = view.slice(start, start + PAGE_SIZE);
  if (slice.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">No leads match the current filters.</td></tr>';
  } else {
    tbody.innerHTML = slice.map(r => `
      <tr>
        <td><span class="score score-${r.bucket}">${r.score}</span></td>
        <td><a href="aircraft/${escape(r.n_number)}.html">N${escape(r.n_number)}</a>
          ${r.is_salvage ? '<span class="salvage-tag" title="Parts/salvage">⚙</span>' : ''}
          ${r.obit_confidence === 'definite' ? `<span class="obit-tag" title="Obituary match${r.obit_year ? ' (' + r.obit_year + ')' : ''}">⚰${r.obit_year ? ' ' + r.obit_year : ''}</span>` : ''}
        </td>
        <td>${r.year_mfr || '—'}</td>
        <td>${escape(r.mfr || '')}</td>
        <td>${escape(r.model || '')}</td>
        <td>${escape(r.owner_name || '')}</td>
        <td>${escape(r.city || '')}</td>
        <td>${escape(r.state || '')}</td>
        <td>${escape(r.type_registrant_desc || '')}</td>
        <td class="reasons">${escape(r.reasons || '')}</td>
      </tr>`).join('');
  }
  const last = Math.max(1, Math.ceil(view.length / PAGE_SIZE));
  document.getElementById('pg-info').textContent =
    `page ${page} / ${last}`;
  document.getElementById('pg-prev').disabled = page <= 1;
  document.getElementById('pg-next').disabled = page >= last;
}

function escape(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
