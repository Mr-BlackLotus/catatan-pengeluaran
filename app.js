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
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const norm = (d) => Object.assign({}, d, { type: d.type === 'income' ? 'income' : 'expense' });
  const sign = (type) => (type === 'income' ? '+ ' : '− ');

  // ---------- state ----------
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penuh/diblokir */ } },
  };
  let cfg = store.get('et_cfg', {});
  let data = [];
  let mode = 'month';
  let anchor = new Date();
  let tab = store.get('et_tab', 'summary');
  if (['summary', 'expense', 'income'].indexOf(tab) < 0) tab = 'summary';
  let entryType = tab === 'income' ? 'income' : 'expense';
  let drafts = [];
  let visible = 50;
  const charts = { bar: null, pie: null, sum: null };

  // mode 'google' = Drive pengguna lewat login Google. Konfigurasi lama (url + token Apps Script) hanya
  // dipertahankan agar pengguna lama tetap bisa membuka datanya dan memindahkannya lewat login Google.
  const googleMode = () => cfg.mode === 'google';
  const connected = () => googleMode();
  const GB = () => window.GoogleBackend;
  const googleReady = () => Boolean(GB() && GB().configured());

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

  // ---------- tema ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    $('#theme-icon').textContent = t === 'dark' ? '☀' : '☾';
    $('#btn-theme').title = t === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap';
    const meta = $('#meta-theme');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#090d18' : '#4f46e5');
  }

  // ---------- data layer ----------
  async function api(action, payload) {
    if (googleMode()) return GB().call(action, payload);
    const err = new Error('Belum masuk ke Google');
    err.code = 'AUTH';
    throw err;
  }
  const persistLocal = () => { if (connected()) store.set('et_cache', data); };

  function connLabel() {
    if (googleMode()) {
      const p = GB() && GB().getProfile();
      return 'Google Drive' + (p ? ' · ' + p.given : '');
    }
    return 'Google Sheets';
  }

  function updateBanner(state) {
    const b = $('#banner');
    b.hidden = state === 'hidden';
    if (state === 'hidden') return;
    const g = googleReady();
    const reauth = state === 'reauth';
    $('#banner-text').textContent = reauth
      ? 'Sesi Google berakhir. Ketuk untuk menyambung lagi — catatan Anda tetap aman di Drive.'
      : g
        ? 'Tidak terhubung ke Google Drive. Masuk dengan akun Google untuk melihat dan menyimpan catatan di Drive Anda sendiri.'
        : 'Tidak terhubung ke Google Drive.';
    $('#banner-google').hidden = !g;
    $('#banner-google').textContent = reauth ? 'Sambungkan lagi' : 'Masuk dengan Google';
  }

  // hapus semua sisa data di browser (termasuk konfigurasi Apps Script lama)
  function wipeLocal() {
    store.set('et_local', []);
    store.set('et_cache', []);
    if (cfg.url || cfg.token) {
      cfg = Object.assign({}, cfg, { url: undefined, token: undefined });
      store.set('et_cfg', cfg);
    }
  }

  async function load() {
    if (!connected()) {
      wipeLocal();
      data = [];
      setStatus('err', 'Tidak terhubung ke Google Drive');
      updateBanner('signin');
      render();
      return;
    }
    updateBanner('hidden');
    data = store.get('et_cache', []).map(norm);
    render();
    setStatus('local', 'Menyinkronkan…');
    try {
      const j = await api('list');
      data = j.items.map(norm);
      persistLocal();
      setStatus('ok', 'Terhubung ke ' + connLabel() + ' · ' + data.length + ' catatan');
    } catch (e) {
      if (e.code === 'AUTH') { setStatus('err', 'Perlu masuk lagi ke Google'); updateBanner('reauth'); }
      else setStatus('err', 'Gagal terhubung: ' + e.message);
    }
    render();
  }

  // ---------- akun Google ----------
  function updateAccountUI() {
    const g = googleMode();
    const ready = googleReady();
    const p = GB() && GB().getProfile();
    $('#acct-status').textContent = g
      ? 'Masuk sebagai ' + (p ? p.name + ' (' + p.email + ')' : 'akun Google') + '. Catatan tersimpan di spreadsheet "Catatan Keuangan" di Google Drive Anda.'
      : !ready
        ? 'Login Google belum diaktifkan pada aplikasi ini.'
        : 'Belum masuk. Masuk dengan Google untuk menyimpan catatan di Drive Anda sendiri.';
    $('#acct-signin').hidden = g || !ready;
    $('#acct-switch').hidden = !g;
    $('#acct-signout').hidden = !g;
    const url = g && GB() ? GB().spreadsheetUrl() : '';
    $('#acct-open').hidden = !url;
    if (url) $('#acct-open').href = url;
  }

  async function googleSignIn(opts) {
    if (!googleReady()) { toast('Login Google belum diaktifkan pada aplikasi ini.'); return false; }
    const wasGoogle = googleMode();
    setStatus('local', 'Membuka login Google…');
    try {
      await GB().signIn(opts);
    } catch (e) {
      if (wasGoogle) { setStatus('err', 'Perlu masuk lagi ke Google'); updateBanner('reauth'); }
      else load();
      toast('Login gagal: ' + e.message);
      return false;
    }
    cfg = Object.assign({}, cfg, { mode: 'google' });
    store.set('et_cfg', cfg);
    updateAccountUI();
    await load();
    return true;
  }

  function googleSignOut() {
    if (GB()) GB().signOut();
    cfg = Object.assign({}, cfg, { mode: undefined });
    store.set('et_cfg', cfg);
    wipeLocal();
    data = [];
    updateAccountUI();
    load();
  }

  async function saveItems(items) {
    if (!connected()) { updateBanner('signin'); const e = new Error('Belum masuk ke Google Drive. Masuk dulu agar catatan tersimpan.'); e.code = 'AUTH'; throw e; }
    const withId = items.map((i) => norm(Object.assign({ id: uid() }, i)));
    const forServer = withId.map((i) => Object.assign({}, i));
    withId.forEach((i) => { delete i.receipt; });
    data = data.concat(withId);
    persistLocal();
    render();
    {
      try {
        await api('add', { items: forServer });
        setStatus('ok', 'Tersimpan di ' + connLabel() + ' · ' + data.length + ' catatan');
      } catch (e) {
        const ids = new Set(withId.map((i) => i.id));
        data = data.filter((d) => !ids.has(d.id));
        persistLocal();
        render();
        if (e.code === 'AUTH') updateBanner('reauth');
        setStatus('err', 'Gagal menyimpan: ' + e.message);
        throw e;
      }
    }
    return withId;
  }

  async function deleteItems(ids) {
    if (!connected()) { updateBanner('signin'); const e = new Error('Belum masuk ke Google Drive. Masuk dulu agar catatan tersimpan.'); e.code = 'AUTH'; throw e; }
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
    if (!connected()) { updateBanner('signin'); const e = new Error('Belum masuk ke Google Drive. Masuk dulu agar catatan tersimpan.'); e.code = 'AUTH'; throw e; }
    const backup = data.slice();
    data = data.map((d) => (d.id === item.id ? norm(Object.assign({}, d, item)) : d));
    persistLocal();
    render();
    if (connected()) {
      try { await api('update', { item: item }); } catch (e) { data = backup; persistLocal(); render(); throw e; }
    }
  }

  // ---------- jenis catatan & tab ----------
  function setHint() {
    const h = $('#hint-msg');
    h.textContent = '';
    const code = (t) => el('code', { text: t });
    if (entryType === 'income') {
      [document.createTextNode('Ketik pemasukan seperti ngobrol, misalnya:'), el('br'), code('gaji 8jt'), ' · ', code('freelance 1,5jt kemarin'), ' · ', code('dividen 250rb tgl 3'), el('br'), document.createTextNode('Beberapa sekaligus? Pisahkan dengan baris baru atau titik koma.')]
        .forEach((n) => h.appendChild(typeof n === 'string' ? document.createTextNode(n) : n));
    } else {
      [document.createTextNode('Ketik pengeluaran seperti ngobrol, misalnya:'), el('br'), code('makan siang 25rb'), ' · ', code('bensin 50.000 kemarin'), ' · ', code('beli saham 500rb'), el('br'), document.createTextNode('Beberapa sekaligus? Pisahkan dengan baris baru atau titik koma. Atau kirim foto struk. Pemasukan? Ganti ke "+ Masuk" atau awali dengan "gaji", "bonus", dll.')]
        .forEach((n) => h.appendChild(typeof n === 'string' ? document.createTextNode(n) : n));
    }
  }
  function updateEntryUI() {
    document.querySelectorAll('.type-toggle button').forEach((b) => b.classList.toggle('on', b.dataset.type === entryType));
    $('#catat-title').textContent = entryType === 'income' ? 'Catat pemasukan' : 'Catat pengeluaran';
    $('#chat-input').placeholder = entryType === 'income' ? 'contoh: gaji 8jt, freelance 1,5jt' : 'contoh: kopi 18rb, parkir 5000';
    $('#photo-label').hidden = entryType === 'income';
    setHint();
  }
  function fillCategoryFilter(type) {
    const sel = $('#f-cat');
    sel.textContent = '';
    sel.appendChild(el('option', { value: '', text: 'Semua kategori' }));
    L.catsFor(type).forEach((c) => sel.appendChild(el('option', { value: c.name, text: c.name })));
  }
  function setTab(t) {
    tab = t;
    store.set('et_tab', t);
    document.body.className = 'tab-' + t;
    document.querySelectorAll('.tabs button').forEach((b) => {
      const on = b.dataset.tab === t;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    if (t !== 'summary') { entryType = t; updateEntryUI(); fillCategoryFilter(t); $('#q').value = ''; }
    visible = 50;
    render();
  }

  // ---------- chat input ----------
  function summaryNode(items) {
    const ul = el('ul');
    items.forEach((i) => ul.appendChild(el('li', { text: sign(i.type) + i.desc + ' — ' + L.rupiah(i.amount) + ' · ' + i.category + ' · ' + i.date + (i.method ? ' · ' + i.method : '') })));
    return ul;
  }
  function countText(items) {
    const e = items.filter((i) => i.type === 'expense').length;
    const n = items.filter((i) => i.type === 'income').length;
    const parts = [];
    if (e) parts.push(e + ' pengeluaran');
    if (n) parts.push(n + ' pemasukan');
    return parts.join(' dan ');
  }

  async function handleText(text) {
    addMsg('user', text);
    const parsed = L.parseMessage(text, undefined, entryType === 'income' ? 'income' : undefined);
    const ok = parsed.filter((p) => p.entry && p.entry.amount > 0).map((p) => p.entry);
    const bad = parsed.filter((p) => !p.entry || !(p.entry.amount > 0)).map((p) => p.raw);

    if (bad.length) {
      addMsg('bot err', 'Nominal tidak ditemukan pada: ' + bad.map((b) => '"' + b + '"').join(', ') + '. Tulis angkanya, mis. 25rb atau 25.000.');
    }
    if (!ok.length) return;
    const switched = entryType === 'expense' && ok.some((o) => o.type === 'income');

    if ($('#autosave').checked) {
      try {
        const saved = await saveItems(ok);
        const undo = el('button', { class: 'link-btn undo', type: 'button', text: 'Batalkan' });
        const msg = addMsg('bot', [el('span', { text: 'Dicatat ' + countText(saved) + (switched ? ' (terdeteksi pemasukan)' : '') + ':' }), undo, summaryNode(saved)]);
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
      const mk = (label, input, full) => el('label', { class: full ? 'full' : '' }, [label, input]);
      const type = el('select');
      [['expense', 'Pengeluaran'], ['income', 'Pemasukan']].forEach((p) => { const o = el('option', { value: p[0], text: p[1] }); if (p[0] === d.type) o.selected = true; type.appendChild(o); });
      const date = el('input', { type: 'date', value: d.date });
      date.addEventListener('change', () => (d.date = date.value));
      const amt = el('input', { type: 'number', min: '1', inputmode: 'numeric', value: d.amount || '' });
      amt.addEventListener('input', () => { d.amount = Number(amt.value); wrap.classList.toggle('bad', !(d.amount > 0)); });
      const desc = el('input', { type: 'text', value: d.desc });
      desc.addEventListener('input', () => (d.desc = desc.value));
      const cat = el('select');
      L.catsFor(d.type).forEach((c) => { const o = el('option', { value: c.name, text: c.name }); if (c.name === d.category) o.selected = true; cat.appendChild(o); });
      cat.addEventListener('change', () => (d.category = cat.value));
      type.addEventListener('change', () => { d.type = type.value; d.category = L.categorize(d.desc, d.type); renderDrafts(); });
      const rm = el('button', { type: 'button', class: 'ghost rm', text: 'Hapus' });
      rm.addEventListener('click', () => { drafts = drafts.filter((x) => x.tid !== d.tid); renderDrafts(); });
      wrap.appendChild(mk('Deskripsi', desc, true));
      wrap.appendChild(mk('Jumlah (Rp)', amt));
      wrap.appendChild(mk('Tanggal', date));
      wrap.appendChild(mk('Jenis', type));
      wrap.appendChild(mk('Kategori', cat));
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
      const items = valid.map((d) => ({ type: d.type, date: d.date, desc: d.desc.trim(), amount: d.amount, category: d.category, method: d.method || '', source: d.source || 'chat', receipt: d.receipt }));
      const saved = await saveItems(items);
      drafts = drafts.filter((d) => !valid.includes(d));
      renderDrafts();
      addMsg('bot', [el('span', { text: 'Tersimpan ' + countText(saved) + ':' }), summaryNode(saved)]);
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
  function elapsedDays(range) {
    const days = Math.max(1, Math.round((range.end - range.start) / 864e5) + 1);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (mode === 'all') return days;
    if (today >= range.start && today <= range.end) return Math.max(1, Math.round((today - range.start) / 864e5) + 1);
    return days;
  }
  function setDelta(node, cur, prev, upIsGood) {
    node.className = '';
    if (prev === null || prev === undefined) { node.textContent = ''; return; }
    if (prev === 0) { node.textContent = cur > 0 ? 'Periode lalu kosong' : ''; return; }
    const pct = ((cur - prev) / prev) * 100;
    if (Math.abs(pct) < 0.5) { node.textContent = 'Sama seperti periode lalu'; return; }
    node.textContent = (pct > 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(0) + '% vs periode lalu';
    node.className = (pct > 0) === upIsGood ? 'pos' : 'neg';
  }

  function render() {
    const range = currentRange();
    const inPeriod = L.inRange(data, range);
    $('#period-label').textContent = L.periodLabel(mode, range);
    document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $('#prev').disabled = $('#next').disabled = mode === 'all';
    $('#today').hidden = mode === 'all';
    $('#view-summary').hidden = tab !== 'summary';
    $('#view-detail').hidden = tab === 'summary';
    if (tab === 'summary') renderSummary(range, inPeriod);
    else renderDetail(tab, range, inPeriod);
  }

  function themeColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => cs.getPropertyValue(n).trim();
    return { ink: g('--ink'), muted: g('--muted'), line: g('--line'), brand: g('--brand'), card: g('--card'), out: g('--out'), in: g('--in') };
  }
  const tickMoney = (v) => (v >= 1e6 ? v / 1e6 + ' jt' : v >= 1e3 ? v / 1e3 + ' rb' : v);
  function destroyChart(k) { if (charts[k]) { charts[k].destroy(); charts[k] = null; } }

  // ----- Ringkasan -----
  function renderSummary(range, inPeriod) {
    const th = themeColors();
    const exp = L.ofType(inPeriod, 'expense');
    const inc = L.ofType(inPeriod, 'income');
    const out = L.sum(exp), inn = L.sum(inc);
    const net = inn - out;
    const prevR = L.previousRange(mode, range);
    const prevItems = prevR ? L.inRange(data, prevR) : null;
    const prevOut = prevItems ? L.sum(L.ofType(prevItems, 'expense')) : null;
    const prevIn = prevItems ? L.sum(L.ofType(prevItems, 'income')) : null;

    $('#s-net').textContent = (net > 0 ? '+ ' : '') + L.rupiah(net);
    $('#s-net-sub').textContent = !inPeriod.length ? 'Belum ada catatan' : net >= 0 ? 'Surplus: pemasukan lebih besar dari pengeluaran' : 'Defisit: pengeluaran lebih besar dari pemasukan';
    $('#s-in').textContent = L.rupiah(inn);
    $('#s-out').textContent = L.rupiah(out);
    setDelta($('#s-in-d'), inn, prevIn, true);
    setDelta($('#s-out-d'), out, prevOut, false);
    $('#s-rate').textContent = inn > 0 ? Math.round((net / inn) * 100) + '%' : '–';
    $('#s-rate-d').textContent = inn > 0 ? 'dari pemasukan yang tersisa' : 'butuh data pemasukan';

    destroyChart('sum');
    if (window.Chart) {
      const r = mode === 'all' ? L.periodRange('all', anchor, data) : range;
      const bi = L.buckets(inc, mode, r);
      const bo = L.buckets(exp, mode, r);
      charts.sum = new Chart($('#chart-sum'), {
        type: 'bar',
        data: {
          labels: bi.map((b) => b.label),
          datasets: [
            { label: 'Pemasukan', data: bi.map((b) => b.total), backgroundColor: th.in, borderRadius: 4, maxBarThickness: 18 },
            { label: 'Pengeluaran', data: bo.map((b) => b.total), backgroundColor: th.out, borderRadius: 4, maxBarThickness: 18 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: th.muted, boxWidth: 10, boxHeight: 10 } }, tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + L.rupiah(c.parsed.y) } } },
          scales: {
            x: { ticks: { color: th.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: mode === 'month' ? 10 : 12 }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: th.muted, callback: tickMoney }, grid: { color: th.line } },
          },
        },
      });
    }

    const ul = $('#alerts-sum');
    ul.textContent = '';
    const add = (cls, text) => ul.appendChild(el('li', { class: cls, text: text }));
    if (!inPeriod.length) add('info', 'Belum ada data di periode ini.');
    else {
      if (inn === 0 && out > 0) add('warn', 'Belum ada pemasukan tercatat di periode ini. Catat di tab Pemasukan agar saldo akurat.');
      else if (net < 0) add('bad', 'Pengeluaran melebihi pemasukan sebesar ' + L.rupiah(-net) + '.');
      else if (inn > 0) {
        const rate = net / inn;
        if (rate >= 0.2) add('good', 'Surplus ' + L.rupiah(net) + ' — ' + Math.round(rate * 100) + '% dari pemasukan tersisa.');
        else add('warn', 'Rasio tabung baru ' + Math.round(rate * 100) + '% (sisa ' + L.rupiah(net) + '). Targetkan minimal 20%.');
      }
      const threshold = L.bigThreshold(data, Number(cfg.limit));
      const big = exp.filter((x) => x.amount >= threshold && x.category !== 'Investasi');
      if (big.length) add('warn', big.length + ' pengeluaran besar (di atas ' + L.rupiah(threshold) + ') — lihat tab Pengeluaran.');
      const invest = exp.filter((x) => x.category === 'Investasi');
      if (invest.length && inn > 0) add('info', 'Investasi periode ini ' + L.rupiah(L.sum(invest)) + ' (' + Math.round((L.sum(invest) / inn) * 100) + '% dari pemasukan).');
      if (prevOut !== null && prevOut > 0 && out > prevOut * 1.2) add('warn', 'Pengeluaran naik ' + Math.round(((out - prevOut) / prevOut) * 100) + '% dibanding periode sebelumnya.');
    }

    const rows = inPeriod.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id))).slice(0, 10);
    $('#sum-empty').hidden = rows.length > 0;
    renderRows($('#list-sum'), rows, Infinity, true);
  }

  // ----- Pengeluaran / Pemasukan -----
  function renderDetail(type, range, inPeriod) {
    const th = themeColors();
    const isOut = type === 'expense';
    const items = L.ofType(inPeriod, type);
    const total = L.sum(items);
    const prevR = L.previousRange(mode, range);
    const prevTotal = prevR ? L.sum(L.ofType(L.inRange(data, prevR), type)) : null;
    const cats = L.byCategory(items);
    const threshold = L.bigThreshold(data, Number(cfg.limit));

    $('#d-title').textContent = isOut ? 'Total pengeluaran' : 'Total pemasukan';
    $('#hist-title').textContent = isOut ? 'Riwayat pengeluaran' : 'Riwayat pemasukan';
    $('#k-top-label').textContent = isOut ? 'Kategori terbesar' : 'Sumber terbesar';
    $('#k-total').textContent = L.rupiah(total);
    setDelta($('#k-delta'), total, prevTotal, !isOut);
    $('#k-avg').textContent = L.rupiah(total / elapsedDays(range));
    $('#k-days').textContent = elapsedDays(range) + ' hari';
    $('#k-count').textContent = String(items.length);
    const biggest = items.reduce((m, x) => (x.amount > (m ? m.amount : 0) ? x : m), null);
    $('#k-max').textContent = biggest ? 'Terbesar ' + L.rupiah(biggest.amount) : '';
    $('#k-top').textContent = cats.length ? cats[0].category : '–';
    $('#k-topval').textContent = cats.length ? L.rupiah(cats[0].total) + ' (' + Math.round((cats[0].total / total) * 100) + '%)' : '';

    // grafik
    destroyChart('bar'); destroyChart('pie');
    const catList = $('#cat-list');
    catList.textContent = '';
    if (window.Chart) {
      const bk = L.buckets(items, mode, mode === 'all' ? L.periodRange('all', anchor, data) : range);
      charts.bar = new Chart($('#chart-bar'), {
        type: 'bar',
        data: { labels: bk.map((b) => b.label), datasets: [{ data: bk.map((b) => b.total), backgroundColor: isOut ? th.out : th.in, borderRadius: 5, maxBarThickness: 28 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => L.rupiah(c.parsed.y) } } },
          scales: {
            x: { ticks: { color: th.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: mode === 'month' ? 10 : 12 }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: th.muted, callback: tickMoney }, grid: { color: th.line } },
          },
        },
      });
      charts.pie = new Chart($('#chart-pie'), {
        type: 'doughnut',
        data: { labels: cats.map((c) => c.category), datasets: [{ data: cats.map((c) => c.total), backgroundColor: cats.map((c) => L.catColor(type, c.category)), borderColor: th.card, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.label + ': ' + L.rupiah(c.parsed) } } } },
      });
    }
    cats.forEach((c) => {
      catList.appendChild(el('li', {}, [
        el('span', { class: 'dot', style: 'background:' + L.catColor(type, c.category) }),
        el('span', { text: c.category }),
        el('span', { class: 'val', text: L.rupiah(c.total) }),
        el('span', { class: 'pct', text: Math.round((c.total / total) * 100) + '%' }),
      ]));
    });

    renderDetailAlerts(type, items, cats, total, prevR, prevTotal, threshold);

    // riwayat
    const q = $('#q').value.trim().toLowerCase();
    const fc = $('#f-cat').value;
    let rows = items.filter((x) => (!fc || x.category === fc) && (!q || (x.desc + ' ' + x.category).toLowerCase().includes(q)));
    rows = rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)));
    $('#table-empty').hidden = rows.length > 0;
    renderRows($('#list'), rows.slice(0, visible), isOut ? threshold : Infinity, false);
    $('#more').hidden = rows.length <= visible;
  }

  function renderDetailAlerts(type, items, cats, total, prevR, prevTotal, threshold) {
    const isOut = type === 'expense';
    const ul = $('#alerts');
    ul.textContent = '';
    $('#threshold-note').textContent = isOut ? 'Batas besar: ' + L.rupiah(threshold) + (cfg.limit ? ' (manual)' : ' (otomatis)') : '';
    const add = (cls, node) => { const li = el('li', { class: cls }, [node]); ul.appendChild(li); return li; };
    if (!items.length) { add('info', 'Belum ada data di periode ini.'); return; }

    if (isOut) {
      const big = items.filter((x) => x.amount >= threshold && x.category !== 'Investasi').sort((a, b) => b.amount - a.amount);
      if (big.length) {
        const bigTotal = L.sum(big);
        const li = add('bad', el('span', { text: big.length + ' pengeluaran besar (total ' + L.rupiah(bigTotal) + ', ' + Math.round((bigTotal / total) * 100) + '% dari periode ini):' }));
        const ol = el('ol');
        big.slice(0, 5).forEach((b) => ol.appendChild(el('li', { text: b.desc + ' — ' + L.rupiah(b.amount) + ' (' + b.category + ', ' + b.date + ')' })));
        li.appendChild(ol);
      } else {
        add('good', 'Tidak ada pengeluaran di atas batas ' + L.rupiah(threshold) + '. 👍');
      }
      if (cats.length > 1 && cats[0].category !== 'Investasi' && cats[0].total / total > 0.4) {
        add('warn', 'Kategori "' + cats[0].category + '" menguasai ' + Math.round((cats[0].total / total) * 100) + '% pengeluaran periode ini.');
      }
      if (prevR && prevTotal > 0) {
        const pct = ((total - prevTotal) / prevTotal) * 100;
        if (pct > 20) add('warn', 'Total naik ' + pct.toFixed(0) + '% dibanding periode sebelumnya (' + L.rupiah(prevTotal) + ').');
        const pm = {}; L.byCategory(L.ofType(L.inRange(data, prevR), 'expense')).forEach((c) => (pm[c.category] = c.total));
        cats.forEach((c) => {
          const p = pm[c.category] || 0;
          if (p > 0 && c.total > p * 1.5 && c.total - p >= 100000) add('warn', c.category + ' naik ' + Math.round(((c.total - p) / p) * 100) + '% (dari ' + L.rupiah(p) + ' ke ' + L.rupiah(c.total) + ').');
        });
      }
    } else {
      if (cats.length === 1) add('info', 'Semua pemasukan periode ini berasal dari satu sumber: ' + cats[0].category + '.');
      else if (cats.length > 1 && cats[0].total / total > 0.7) add('warn', 'Pemasukan sangat bergantung pada "' + cats[0].category + '" (' + Math.round((cats[0].total / total) * 100) + '%).');
      if (prevR && prevTotal > 0) {
        const pct = ((total - prevTotal) / prevTotal) * 100;
        if (pct < -20) add('warn', 'Pemasukan turun ' + Math.abs(pct).toFixed(0) + '% dibanding periode sebelumnya (' + L.rupiah(prevTotal) + ').');
        else if (pct > 10) add('good', 'Pemasukan naik ' + pct.toFixed(0) + '% dibanding periode sebelumnya.');
      }
      if (!ul.children.length) add('good', 'Pemasukan stabil, tidak ada hal yang perlu diperhatikan.');
    }
  }

  function renderRows(list, rows, threshold, showSign) {
    list.textContent = '';
    rows.forEach((x) => {
      const meta = el('div', { class: 'meta' }, [
        el('span', { text: x.date }),
        el('span', { class: 'chip' }, [el('i', { style: 'background:' + L.catColor(x.type, x.category) }), x.category]),
      ]);
      if (x.method) meta.appendChild(el('span', { text: x.method }));
      if (x.source === 'foto') meta.appendChild(el('span', { text: '📷' }));
      if (x.receipt) meta.appendChild(el('a', { href: x.receipt, target: '_blank', rel: 'noopener', text: 'bukti' }));
      if (x.type === 'expense' && x.category !== 'Investasi' && x.amount >= threshold) meta.appendChild(el('span', { class: 'badge', text: 'Besar' }));
      const edit = el('button', { type: 'button', text: 'Ubah' });
      edit.addEventListener('click', () => openEdit(x));
      list.appendChild(el('li', { class: 'tx' }, [
        el('div', {}, [el('div', { class: 'd', text: x.desc }), meta]),
        el('div', {}, [el('div', { class: 'amt ' + (x.type === 'income' ? 'in' : 'out'), text: (showSign ? sign(x.type) : '') + L.rupiah(x.amount) }), edit]),
      ]));
    });
  }

  // ---------- edit dialog ----------
  let editing = null;
  function fillEditCats(type, selected) {
    const cat = $('#e-cat');
    cat.textContent = '';
    L.catsFor(type).forEach((c) => { const o = el('option', { value: c.name, text: c.name }); if (c.name === selected) o.selected = true; cat.appendChild(o); });
  }
  function openEdit(x) {
    editing = x;
    $('#e-type').value = x.type;
    fillEditCats(x.type, x.category);
    $('#e-date').value = x.date;
    $('#e-desc').value = x.desc;
    $('#e-amount').value = x.amount;
    $('#e-method').value = x.method || '';
    $('#dlg-edit').showModal();
  }

  // ---------- events ----------
  function autosize(t) { t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; }

  function init() {
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
    document.body.className = 'tab-' + tab;
    document.querySelectorAll('.tabs button').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      b.addEventListener('click', () => setTab(b.dataset.tab));
    });
    fillCategoryFilter(tab === 'income' ? 'income' : 'expense');
    updateEntryUI();
    document.querySelectorAll('.type-toggle button').forEach((b) => b.addEventListener('click', () => { entryType = b.dataset.type; updateEntryUI(); $('#chat-input').focus(); }));

    $('#btn-theme').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('et_theme', next); } catch (e) { /* diblokir */ }
      applyTheme(next);
      render();
    });
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        let saved = null; try { saved = localStorage.getItem('et_theme'); } catch (err) { /* diblokir */ }
        if (!saved) { applyTheme(e.matches ? 'dark' : 'light'); render(); }
      });
    }

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
      updateAccountUI();
      $('#cfg-limit').value = cfg.limit || '';
      $('#dlg-settings').showModal();
    };
    $('#btn-settings').addEventListener('click', openSettings);
    $('#banner-google').addEventListener('click', () => googleSignIn());
    $('#acct-signin').addEventListener('click', async () => { if (await googleSignIn()) $('#dlg-settings').close(); });
    $('#acct-switch').addEventListener('click', async () => { if (await googleSignIn({ switchAccount: true })) $('#dlg-settings').close(); });
    $('#acct-signout').addEventListener('click', () => { googleSignOut(); $('#dlg-settings').close(); toast('Keluar dari akun Google'); });
    $('#cfg-close').addEventListener('click', () => $('#dlg-settings').close());
    $('#settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      cfg = Object.assign({}, cfg, { limit: Number($('#cfg-limit').value) || 0 });
      store.set('et_cfg', cfg);
      $('#dlg-settings').close();
      render();
    });

    $('#e-type').addEventListener('change', () => fillEditCats($('#e-type').value, L.categorize($('#e-desc').value, $('#e-type').value)));
    $('#e-close').addEventListener('click', () => $('#dlg-edit').close());
    $('#edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const item = { id: editing.id, type: $('#e-type').value, date: $('#e-date').value, desc: $('#e-desc').value.trim(), amount: Number($('#e-amount').value), category: $('#e-cat').value, method: $('#e-method').value, source: editing.source || 'chat' };
      $('#dlg-edit').close();
      try { await updateItem(item); toast('Perubahan disimpan'); } catch (err) { toast('Gagal mengubah: ' + err.message); }
    });
    $('#e-delete').addEventListener('click', async () => {
      if (!confirm('Hapus catatan ini?')) return;
      $('#dlg-edit').close();
      try { await deleteItems([editing.id]); toast('Catatan dihapus'); } catch (err) { toast('Gagal menghapus: ' + err.message); }
    });

    updateAccountUI();
    load();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
