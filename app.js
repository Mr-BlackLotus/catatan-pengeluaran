(function () {
  'use strict';
  const L = window.Lib;
  const $ = (s) => document.querySelector(s);
  const el = (tag, props, children) => {
    const n = document.createElement(tag);
    Object.keys(props || {}).forEach((k) => {
      if (k === 'text') n.textContent = props[k];
      else if (k === 'class') n.className = props[k];
      else n.setAttribute(k, props[k]);
    });
    (children || []).forEach((c) => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  };
  const catColor = (name) => (L.CATEGORIES.find((c) => c.name === name) || L.CATEGORIES[L.CATEGORIES.length - 1]).color;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- state ----------
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penuh/diblokir */ } },
  };
  let cfg = store.get('et_cfg', {});
  let data = [];
  let mode = 'month';
  let anchor = new Date();
  let drafts = [];
  let visible = 50;
  let barChart = null;
  let pieChart = null;

  const connected = () => Boolean(cfg.url && cfg.token);

  // ---------- util UI ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 3200);
  }
  function setStatus(kind, text) {
    const s = $('#status');
    s.className = 'status status-' + kind;
    s.textContent = text;
  }
  function addMsg(role, nodes) {
    const log = $('#chat-log');
    const m = el('div', { class: 'msg ' + role }, Array.isArray(nodes) ? nodes : [nodes]);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  // ---------- data layer ----------
  async function api(action, payload) {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ token: cfg.token, action: action }, payload || {})),
    });
    if (!res.ok) throw new Error('Server membalas ' + res.status);
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Gagal');
    return j;
  }
  const persistLocal = () => { if (!connected()) store.set('et_local', data); else store.set('et_cache', data); };

  async function load() {
    if (!connected()) {
      data = store.get('et_local', []);
      setStatus('local', 'Mode lokal (belum terhubung ke Drive)');
      $('#banner').hidden = false;
      render();
      return;
    }
    $('#banner').hidden = true;
    data = store.get('et_cache', []);
    render();
    setStatus('local', 'Menyinkronkan…');
    try {
      const j = await api('list');
      data = j.items;
      persistLocal();
      setStatus('ok', 'Terhubung ke Google Sheets · ' + data.length + ' catatan');
    } catch (e) {
      setStatus('err', 'Gagal terhubung: ' + e.message);
    }
    render();
  }

  async function saveItems(items) {
    const withId = items.map((i) => Object.assign({ id: uid() }, i));
    const forServer = withId.map((i) => Object.assign({}, i));
    withId.forEach((i) => { delete i.receipt; });
    data = data.concat(withId);
    persistLocal();
    render();
    if (connected()) {
      try {
        await api('add', { items: forServer });
        setStatus('ok', 'Tersimpan di Google Sheets · ' + data.length + ' catatan');
      } catch (e) {
        const ids = new Set(withId.map((i) => i.id));
        data = data.filter((d) => !ids.has(d.id));
        persistLocal();
        render();
        setStatus('err', 'Gagal menyimpan: ' + e.message);
        throw e;
      }
    }
    return withId;
  }

  async function deleteItems(ids) {
    const backup = data.slice();
    const set = new Set(ids);
    data = data.filter((d) => !set.has(d.id));
    persistLocal();
    render();
    if (connected()) {
      try { await api('delete', { ids: ids }); } catch (e) { data = backup; persistLocal(); render(); throw e; }
    }
  }

  async function updateItem(item) {
    const backup = data.slice();
    data = data.map((d) => (d.id === item.id ? Object.assign({}, d, item) : d));
    persistLocal();
    render();
    if (connected()) {
      try { await api('update', { item: item }); } catch (e) { data = backup; persistLocal(); render(); throw e; }
    }
  }

  // ---------- chat input ----------
  function summaryNode(items) {
    const ul = el('ul');
    items.forEach((i) => ul.appendChild(el('li', { text: i.desc + ' — ' + L.rupiah(i.amount) + ' · ' + i.category + ' · ' + i.date })));
    return ul;
  }

  async function handleText(text) {
    addMsg('user', text);
    const parsed = L.parseMessage(text);
    const ok = parsed.filter((p) => p.entry && p.entry.amount > 0).map((p) => p.entry);
    const bad = parsed.filter((p) => !p.entry || !(p.entry.amount > 0)).map((p) => p.raw);

    if (bad.length) {
      addMsg('bot err', 'Nominal tidak ditemukan pada: ' + bad.map((b) => '"' + b + '"').join(', ') + '. Tulis angkanya, mis. 25rb atau 25.000.');
    }
    if (!ok.length) return;

    if ($('#autosave').checked) {
      try {
        const saved = await saveItems(ok);
        const undo = el('button', { class: 'link-btn undo', type: 'button', text: 'Batalkan' });
        const msg = addMsg('bot', [el('span', { text: 'Dicatat ' + saved.length + ' pengeluaran:' }), undo, summaryNode(saved)]);
        undo.addEventListener('click', async () => {
          undo.disabled = true;
          try { await deleteItems(saved.map((s) => s.id)); undo.remove(); msg.firstChild.textContent = 'Dibatalkan.'; } catch (e) { undo.disabled = false; toast('Gagal membatalkan: ' + e.message); }
        });
      } catch (e) {
        addMsg('bot err', 'Gagal menyimpan: ' + e.message + '. Coba lagi.');
      }
    } else {
      addDrafts(ok);
      addMsg('bot', 'Periksa dulu di bawah, lalu tekan "Simpan semua".');
    }
  }

  // ---------- drafts ----------
  function addDrafts(items) {
    items.forEach((i) => drafts.push(Object.assign({ tid: uid() }, i)));
    renderDrafts();
  }
  function renderDrafts() {
    const box = $('#drafts');
    const list = $('#draft-list');
    list.textContent = '';
    box.hidden = drafts.length === 0;
    drafts.forEach((d) => {
      const wrap = el('div', { class: 'draft' + (d.amount > 0 ? '' : ' bad') });
      const mk = (label, input, full) => { const l = el('label', { class: full ? 'full' : '' }, [label, input]); return l; };
      const date = el('input', { type: 'date', value: d.date });
      date.addEventListener('change', () => (d.date = date.value));
      const amt = el('input', { type: 'number', min: '1', inputmode: 'numeric', value: d.amount || '' });
      amt.addEventListener('input', () => { d.amount = Number(amt.value); wrap.classList.toggle('bad', !(d.amount > 0)); });
      const desc = el('input', { type: 'text', value: d.desc });
      desc.addEventListener('input', () => (d.desc = desc.value));
      const cat = el('select');
      L.CATEGORIES.forEach((c) => { const o = el('option', { value: c.name, text: c.name }); if (c.name === d.category) o.selected = true; cat.appendChild(o); });
      cat.addEventListener('change', () => (d.category = cat.value));
      const rm = el('button', { type: 'button', class: 'ghost rm', text: 'Hapus' });
      rm.addEventListener('click', () => { drafts = drafts.filter((x) => x.tid !== d.tid); renderDrafts(); });
      wrap.appendChild(mk('Deskripsi', desc, true));
      wrap.appendChild(mk('Jumlah (Rp)', amt));
      wrap.appendChild(mk('Tanggal', date));
      wrap.appendChild(mk('Kategori', cat, true));
      wrap.appendChild(rm);
      list.appendChild(wrap);
    });
  }
  async function saveDrafts() {
    const valid = drafts.filter((d) => d.amount > 0 && d.date && d.desc.trim());
    if (!valid.length) { toast('Isi deskripsi, tanggal dan jumlah dulu.'); return; }
    const btn = $('#draft-save');
    btn.disabled = true;
    try {
      const items = valid.map((d) => ({ date: d.date, desc: d.desc.trim(), amount: d.amount, category: d.category, method: d.method || '', source: d.source || 'chat', receipt: d.receipt }));
      const saved = await saveItems(items);
      drafts = drafts.filter((d) => !valid.includes(d));
      renderDrafts();
      addMsg('bot', [el('span', { text: 'Tersimpan ' + saved.length + ' catatan.' }), summaryNode(saved)]);
    } catch (e) {
      toast('Gagal menyimpan: ' + e.message);
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- foto struk (OCR di browser) ----------
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat pustaka OCR (cek internet)'));
      document.head.appendChild(s);
    });
  }
  function fileToCanvas(file, maxSide) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('File gambar tidak bisa dibaca')); };
      img.src = url;
    });
  }
  async function handlePhoto(file) {
    const bar = $('#ocr-progress');
    const fill = bar.firstElementChild;
    const label = bar.lastElementChild;
    bar.hidden = false; fill.style.width = '5%'; label.textContent = 'Menyiapkan pembaca struk…';
    addMsg('user', '📷 ' + (file.name || 'foto struk'));
    try {
      const big = await fileToCanvas(file, 1800);
      const thumb = await fileToCanvas(file, 1000);
      const receipt = thumb.toDataURL('image/jpeg', 0.7);
      if (!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
      const worker = await window.Tesseract.createWorker('ind+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') { fill.style.width = Math.round(10 + m.progress * 90) + '%'; label.textContent = 'Membaca struk… ' + Math.round(m.progress * 100) + '%'; }
          else { label.textContent = 'Menyiapkan: ' + m.status; }
        },
      });
      const out = await worker.recognize(big);
      await worker.terminate();
      const entry = L.parseReceipt(out.data.text);
      entry.receipt = receipt;
      addDrafts([entry]);
      addMsg('bot', entry.amount ? 'Struk terbaca. Periksa total, tanggal dan kategori di bawah — pembacaan foto bisa meleset.' : 'Struk terbaca, tapi total tidak ketemu. Isi jumlahnya manual di bawah.');
    } catch (e) {
      addMsg('bot err', 'Gagal membaca foto: ' + e.message);
    } finally {
      bar.hidden = true;
    }
  }

  // ---------- render ----------
  function currentRange() { return L.periodRange(mode, anchor, data); }

  function render() {
    const range = currentRange();
    const items = L.inRange(data, range);
    const total = L.sum(items);
    const days = Math.max(1, Math.round((range.end - range.start) / 864e5) + 1);
    const prevRange = L.previousRange(mode, range);
    const prevTotal = prevRange ? L.sum(L.inRange(data, prevRange)) : null;
    const cats = L.byCategory(items);
    const threshold = L.bigThreshold(data, Number(cfg.limit));

    $('#period-label').textContent = L.periodLabel(mode, range);
    document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $('#prev').disabled = $('#next').disabled = mode === 'all';
    $('#today').hidden = mode === 'all';

    // KPI
    $('#k-total').textContent = L.rupiah(total);
    const kd = $('#k-delta');
    kd.className = '';
    if (prevTotal !== null && prevTotal > 0) {
      const pct = ((total - prevTotal) / prevTotal) * 100;
      kd.textContent = (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(0) + '% vs periode lalu';
      kd.className = pct > 0 ? 'up' : 'down';
    } else { kd.textContent = prevTotal === 0 ? 'Periode lalu kosong' : ''; }
    const elapsed = (() => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (mode === 'all') return days;
      if (today >= range.start && today <= range.end) return Math.max(1, Math.round((today - range.start) / 864e5) + 1);
      return days;
    })();
    $('#k-avg').textContent = L.rupiah(total / elapsed);
    $('#k-days').textContent = elapsed + ' hari';
    $('#k-count').textContent = String(items.length);
    const biggest = items.reduce((m, x) => (x.amount > (m ? m.amount : 0) ? x : m), null);
    $('#k-max').textContent = biggest ? 'Terbesar ' + L.rupiah(biggest.amount) : '';
    $('#k-top').textContent = cats.length ? cats[0].category : '–';
    $('#k-topval').textContent = cats.length ? L.rupiah(cats[0].total) + ' (' + Math.round((cats[0].total / total) * 100) + '%)' : '';

    renderCharts(items, range, cats, total);
    renderAlerts(items, range, cats, total, prevRange, threshold);
    renderList(items, threshold);
  }

  function chartTheme() {
    const cs = getComputedStyle(document.documentElement);
    return { ink: cs.getPropertyValue('--ink').trim(), muted: cs.getPropertyValue('--muted').trim(), line: cs.getPropertyValue('--line').trim(), brand: cs.getPropertyValue('--brand').trim(), card: cs.getPropertyValue('--card').trim() };
  }

  function renderCharts(items, range, cats, total) {
    const th = chartTheme();
    const bk = L.buckets(items, mode, mode === 'all' ? L.periodRange('all', anchor, data) : range);
    if (barChart) barChart.destroy();
    if (pieChart) pieChart.destroy();
    if (!window.Chart) return;
    barChart = new Chart($('#chart-bar'), {
      type: 'bar',
      data: { labels: bk.map((b) => b.label), datasets: [{ data: bk.map((b) => b.total), backgroundColor: th.brand, borderRadius: 4, maxBarThickness: 28 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => L.rupiah(c.parsed.y) } } },
        scales: {
          x: { ticks: { color: th.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: mode === 'month' ? 10 : 12 }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: th.muted, callback: (v) => (v >= 1e6 ? v / 1e6 + ' jt' : v >= 1e3 ? v / 1e3 + ' rb' : v) }, grid: { color: th.line } },
        },
      },
    });
    pieChart = new Chart($('#chart-pie'), {
      type: 'doughnut',
      data: { labels: cats.map((c) => c.category), datasets: [{ data: cats.map((c) => c.total), backgroundColor: cats.map((c) => catColor(c.category)), borderColor: th.card, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.label + ': ' + L.rupiah(c.parsed) } } } },
    });
    const ul = $('#cat-list');
    ul.textContent = '';
    cats.forEach((c) => {
      ul.appendChild(el('li', {}, [
        el('span', { class: 'dot', style: 'background:' + catColor(c.category) }),
        el('span', { text: c.category }),
        el('span', { class: 'val', text: L.rupiah(c.total) }),
        el('span', { class: 'pct', text: Math.round((c.total / total) * 100) + '%' }),
      ]));
    });
  }

  function renderAlerts(items, range, cats, total, prevRange, threshold) {
    const ul = $('#alerts');
    ul.textContent = '';
    $('#threshold-note').textContent = 'Batas besar: ' + L.rupiah(threshold) + (cfg.limit ? ' (manual)' : ' (otomatis)');
    const add = (cls, node) => { const li = el('li', { class: cls }, [node]); ul.appendChild(li); return li; };
    if (!items.length) { add('info', 'Belum ada data di periode ini.'); return; }

    const big = items.filter((x) => x.amount >= threshold).sort((a, b) => b.amount - a.amount);
    if (big.length) {
      const bigTotal = L.sum(big);
      const li = add('bad', el('span', { text: big.length + ' pengeluaran besar (total ' + L.rupiah(bigTotal) + ', ' + Math.round((bigTotal / total) * 100) + '% dari periode ini):' }));
      const ol = el('ol');
      big.slice(0, 5).forEach((b) => ol.appendChild(el('li', { text: b.desc + ' — ' + L.rupiah(b.amount) + ' (' + b.category + ', ' + b.date + ')' })));
      li.appendChild(ol);
    } else {
      add('good', 'Tidak ada pengeluaran di atas batas ' + L.rupiah(threshold) + '. 👍');
    }
    if (cats.length && cats[0].total / total > 0.4 && cats.length > 1) {
      add('warn', 'Kategori "' + cats[0].category + '" menguasai ' + Math.round((cats[0].total / total) * 100) + '% pengeluaran periode ini.');
    }
    if (prevRange) {
      const prevItems = L.inRange(data, prevRange);
      const prevTotal = L.sum(prevItems);
      if (prevTotal > 0) {
        const pct = ((total - prevTotal) / prevTotal) * 100;
        if (pct > 20) add('warn', 'Total naik ' + pct.toFixed(0) + '% dibanding periode sebelumnya (' + L.rupiah(prevTotal) + ').');
        const pm = {}; L.byCategory(prevItems).forEach((c) => (pm[c.category] = c.total));
        cats.forEach((c) => {
          const p = pm[c.category] || 0;
          if (p > 0 && c.total > p * 1.5 && c.total - p >= 100000) add('warn', c.category + ' naik ' + Math.round(((c.total - p) / p) * 100) + '% (dari ' + L.rupiah(p) + ' ke ' + L.rupiah(c.total) + ').');
        });
      }
    }
  }

  function renderList(items, threshold) {
    const q = $('#q').value.trim().toLowerCase();
    const fc = $('#f-cat').value;
    let rows = items.filter((x) => (!fc || x.category === fc) && (!q || (x.desc + ' ' + x.category).toLowerCase().includes(q)));
    rows = rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)));
    const list = $('#list');
    list.textContent = '';
    $('#table-empty').hidden = rows.length > 0;
    rows.slice(0, visible).forEach((x) => {
      const meta = el('div', { class: 'meta' }, [
        el('span', { text: x.date }),
        el('span', { class: 'chip' }, [el('i', { style: 'background:' + catColor(x.category) }), x.category]),
      ]);
      if (x.source === 'foto') meta.appendChild(el('span', { text: '📷' }));
      if (x.receipt) { const a = el('a', { href: x.receipt, target: '_blank', rel: 'noopener', text: 'bukti' }); meta.appendChild(a); }
      if (x.amount >= threshold) meta.appendChild(el('span', { class: 'badge', text: 'Besar' }));
      const edit = el('button', { type: 'button', text: 'Ubah' });
      edit.addEventListener('click', () => openEdit(x));
      list.appendChild(el('li', { class: 'tx' }, [
        el('div', {}, [el('div', { class: 'd', text: x.desc }), meta]),
        el('div', {}, [el('div', { class: 'amt', text: L.rupiah(x.amount) }), edit]),
      ]));
    });
    $('#more').hidden = rows.length <= visible;
  }

  function fillCategoryFilter() {
    const sel = $('#f-cat');
    L.CATEGORIES.forEach((c) => sel.appendChild(el('option', { value: c.name, text: c.name })));
  }

  // ---------- edit dialog ----------
  let editing = null;
  function openEdit(x) {
    editing = x;
    const cat = $('#e-cat');
    cat.textContent = '';
    L.CATEGORIES.forEach((c) => { const o = el('option', { value: c.name, text: c.name }); if (c.name === x.category) o.selected = true; cat.appendChild(o); });
    $('#e-date').value = x.date;
    $('#e-desc').value = x.desc;
    $('#e-amount').value = x.amount;
    $('#e-method').value = x.method || '';
    $('#dlg-edit').showModal();
  }

  // ---------- events ----------
  function autosize(t) { t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; }

  function init() {
    fillCategoryFilter();

    const input = $('#chat-input');
    input.addEventListener('input', () => autosize(input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chat-form').requestSubmit(); }
    });
    $('#chat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = ''; autosize(input);
      const btn = $('#send-btn'); btn.disabled = true;
      try { await handleText(text); } finally { btn.disabled = false; input.focus(); }
    });
    $('#photo').addEventListener('change', (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) handlePhoto(f);
    });
    $('#autosave').checked = store.get('et_autosave', true);
    $('#autosave').addEventListener('change', (e) => store.set('et_autosave', e.target.checked));
    $('#draft-save').addEventListener('click', saveDrafts);
    $('#draft-cancel').addEventListener('click', () => { drafts = []; renderDrafts(); });

    document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; anchor = new Date(); visible = 50; render(); }));
    $('#prev').addEventListener('click', () => { anchor = L.shiftAnchor(mode, anchor, -1); render(); });
    $('#next').addEventListener('click', () => { anchor = L.shiftAnchor(mode, anchor, 1); render(); });
    $('#today').addEventListener('click', () => { anchor = new Date(); render(); });
    $('#q').addEventListener('input', () => { visible = 50; render(); });
    $('#f-cat').addEventListener('change', () => { visible = 50; render(); });
    $('#more').addEventListener('click', () => { visible += 50; render(); });

    $('#btn-sync').addEventListener('click', () => { load(); toast(connected() ? 'Memuat ulang dari Drive…' : 'Belum terhubung ke Drive'); });
    const openSettings = () => {
      $('#cfg-url').value = cfg.url || '';
      $('#cfg-token').value = cfg.token || '';
      $('#cfg-limit').value = cfg.limit || '';
      $('#cfg-msg').textContent = '';
      $('#dlg-settings').showModal();
    };
    $('#btn-settings').addEventListener('click', openSettings);
    $('#banner-setup').addEventListener('click', openSettings);
    $('#cfg-close').addEventListener('click', () => $('#dlg-settings').close());
    $('#cfg-test').addEventListener('click', async () => {
      const url = $('#cfg-url').value.trim(), token = $('#cfg-token').value.trim();
      const msg = $('#cfg-msg');
      if (!url || !token) { msg.textContent = 'Isi URL dan TOKEN dulu.'; return; }
      msg.textContent = 'Menguji…';
      try {
        const keep = cfg; cfg = { url: url, token: token };
        await api('ping'); cfg = keep;
        msg.textContent = '✔ Terhubung. Klik Simpan.';
      } catch (e) { msg.textContent = '✖ ' + e.message + ' — pastikan akses Web App "Siapa saja" dan TOKEN sama.'; }
    });
    $('#settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const wasConnected = connected();
      cfg = { url: $('#cfg-url').value.trim(), token: $('#cfg-token').value.trim(), limit: Number($('#cfg-limit').value) || 0 };
      store.set('et_cfg', cfg);
      $('#dlg-settings').close();
      if (!wasConnected && connected() && data.length) {
        // data lokal yang sudah ada dikirim ke Drive sekali
        const local = store.get('et_local', []);
        if (local.length && confirm('Kirim ' + local.length + ' catatan lokal ke Google Sheets?')) {
          api('add', { items: local }).then(() => { store.set('et_local', []); load(); toast('Catatan lokal terkirim'); }).catch((err) => toast('Gagal kirim: ' + err.message));
          return;
        }
      }
      load();
    });

    $('#e-close').addEventListener('click', () => $('#dlg-edit').close());
    $('#edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const item = { id: editing.id, date: $('#e-date').value, desc: $('#e-desc').value.trim(), amount: Number($('#e-amount').value), category: $('#e-cat').value, method: $('#e-method').value, source: editing.source || 'chat' };
      $('#dlg-edit').close();
      try { await updateItem(item); toast('Perubahan disimpan'); } catch (err) { toast('Gagal mengubah: ' + err.message); }
    });
    $('#e-delete').addEventListener('click', async () => {
      if (!confirm('Hapus catatan ini?')) return;
      $('#dlg-edit').close();
      try { await deleteItems([editing.id]); toast('Catatan dihapus'); } catch (err) { toast('Gagal menghapus: ' + err.message); }
    });

    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
    load();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
