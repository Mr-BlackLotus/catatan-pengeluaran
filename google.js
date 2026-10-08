/*
 * Penyimpanan ke Google Drive milik pengguna (tanpa Apps Script per-orang).
 *
 * Alur: pengguna "Masuk dengan Google" -> aplikasi mencari (atau membuat) spreadsheet
 * "Catatan Keuangan" di Drive pengguna -> membaca/menulis lewat Google Sheets API.
 * Izin yang diminta hanya `drive.file`: aplikasi hanya bisa melihat file yang ia buat sendiri,
 * bukan seluruh isi Drive. Data tidak pernah lewat server pihak lain.
 */
(function () {
  'use strict';

  const DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';
  const SCOPE = 'openid email profile ' + DRIVE_FILE;
  const FILE_NAME = 'Catatan Keuangan';
  const TAB = 'Pengeluaran';
  const SUMMARY = 'Ringkasan';
  const FOLDER_NAME = 'Struk Pengeluaran';
  const APP_KEY = 'catatanKeuangan';
  const HEADERS = ['ID', 'Tanggal', 'Kategori', 'Deskripsi', 'Jumlah (Rp)', 'Metode', 'Sumber', 'Dicatat Pada', 'Bukti Foto', 'Tipe'];
  const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
  const DRIVE = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

  class AuthError extends Error {
    constructor(msg) { super(msg); this.code = 'AUTH'; }
  }

  // ---------- penyimpanan lokal kecil (hanya id & nama, tidak ada token) ----------
  const lsGet = (k, d) => { try { const v = localStorage.getItem('et_g_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem('et_g_' + k, JSON.stringify(v)); } catch (e) { /* diblokir */ } };
  const lsDel = (k) => { try { localStorage.removeItem('et_g_' + k); } catch (e) { /* diblokir */ } };

  let accessToken = null;
  let expiresAt = 0;
  let profile = lsGet('profile', null);
  let ss = null; // { id, sheetId }
  let folderId = null;
  let tokenPromise = null;
  let ssPromise = null;

  const clientId = () => (window.APP_CONFIG && window.APP_CONFIG.googleClientId) || '';
  const configured = () => Boolean(clientId());
  const pad = (n) => String(n).padStart(2, '0');
  const enc = encodeURIComponent;

  // ---------- login ----------
  let gisPromise = null;
  function loadGis() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => { gisPromise = null; s.remove(); reject(new AuthError('Layanan Google tidak bisa dimuat. Cek koneksi internet.')); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }
  // dimuat lebih awal agar popup login langsung terbuka saat tombol ditekan (HP memblokir popup yang terlambat)
  function preload() { if (configured()) loadGis().catch(() => {}); }

  function requestToken(opts) {
    if (tokenPromise) return tokenPromise;
    opts = opts || {};
    tokenPromise = (async () => {
      if (!configured()) throw new AuthError('Login Google belum diaktifkan pada aplikasi ini.');
      await loadGis();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new AuthError('Waktu habis menunggu login Google.')), opts.timeout || 120000);
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId(),
          scope: SCOPE,
          callback: (resp) => {
            clearTimeout(timer);
            if (!resp || resp.error) return reject(new AuthError((resp && (resp.error_description || resp.error)) || 'Login Google gagal.'));
            if (!window.google.accounts.oauth2.hasGrantedAllScopes(resp, DRIVE_FILE)) {
              return reject(new AuthError('Izin Google Drive belum diberikan. Ulangi dan centang izin untuk Drive.'));
            }
            accessToken = resp.access_token;
            expiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
            resolve(accessToken);
          },
          error_callback: (err) => {
            clearTimeout(timer);
            const t = err && err.type;
            reject(new AuthError(t === 'popup_closed' ? 'Jendela login ditutup sebelum selesai.' : t === 'popup_failed_to_open' ? 'Jendela login diblokir browser. Izinkan pop-up lalu coba lagi.' : 'Login Google dibatalkan.'));
          },
        });
        const hint = profile && profile.email;
        const req = { prompt: opts.prompt || '' };
        if (hint && opts.prompt !== 'select_account') req.hint = hint;
        client.requestAccessToken(req);
      });
    })();
    const clear = () => { tokenPromise = null; };
    tokenPromise.then(clear, clear);
    return tokenPromise;
  }

  async function ensureToken() {
    if (accessToken && Date.now() < expiresAt - 60000) return accessToken;
    return requestToken({ prompt: '', timeout: 20000 });
  }

  // ---------- HTTP ----------
  async function gfetch(url, init, retry) {
    const token = await ensureToken();
    const res = await fetch(url, Object.assign({}, init, { headers: Object.assign({ Authorization: 'Bearer ' + token }, init && init.headers) }));
    if (res.status === 401 && retry !== false) {
      accessToken = null;
      return gfetch(url, init, false);
    }
    if (!res.ok) {
      let msg = 'Google membalas ' + res.status;
      try { const j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) { /* bukan JSON */ }
      const err = new Error(msg);
      err.status = res.status;
      if (res.status === 401) err.code = 'AUTH';
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  const send = (method, body) => ({ method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  async function loadProfile() {
    const p = await gfetch(USERINFO);
    profile = { name: p.name || p.given_name || p.email, given: p.given_name || p.name || p.email, email: p.email, picture: p.picture || '' };
    lsSet('profile', profile);
    return profile;
  }

  // ---------- spreadsheet pengguna ----------
  const SRC = TAB + '!A:J';
  const fCategory = (tipe) => '=IFERROR(QUERY(' + SRC + ',"select C, sum(E) where E is not null and J = \'' + tipe + '\' group by C order by sum(E) desc label C \'Kategori\', sum(E) \'Total (Rp)\'",1),"Belum ada data")';
  const fMonth = '=IFERROR(QUERY(' + SRC + ',"select year(B), month(B)+1, J, sum(E) where E is not null and J is not null group by year(B), month(B)+1, J order by year(B), month(B)+1, J label year(B) \'Tahun\', month(B)+1 \'Bulan\', J \'Tipe\', sum(E) \'Total (Rp)\'",1),"Belum ada data")';

  async function readMeta(id) {
    const m = await gfetch(SHEETS + '/' + id + '?fields=sheets.properties(sheetId,title)');
    const tab = (m.sheets || []).map((s) => s.properties).find((p) => p.title === TAB);
    if (!tab) {
      const e = new Error('Tab "' + TAB + '" tidak ditemukan di spreadsheet Catatan Keuangan Anda. Jangan ubah nama tab itu.');
      e.status = 'NOTAB';
      throw e;
    }
    return { id: id, sheetId: tab.sheetId };
  }

  async function findFile() {
    const q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and appProperties has { key='" + APP_KEY + "' and value='1' }";
    const r = await gfetch(DRIVE + '?q=' + enc(q) + '&orderBy=createdTime&pageSize=5&spaces=drive&fields=files(id,name)');
    return r.files && r.files[0] ? r.files[0].id : null;
  }

  async function setupTabs(id) {
    const meta = await gfetch(SHEETS + '/' + id + '?fields=sheets.properties(sheetId,title)');
    const sid = meta.sheets[0].properties.sheetId;
    const col = (c) => ({ sheetId: sid, startRowIndex: 1, startColumnIndex: c, endColumnIndex: c + 1 });
    const fmt = (c, type, pattern) => ({ repeatCell: { range: col(c), cell: { userEnteredFormat: { numberFormat: { type: type, pattern: pattern } } }, fields: 'userEnteredFormat.numberFormat' } });
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* abaikan */ }
    const requests = [
      { updateSheetProperties: { properties: { sheetId: sid, title: TAB, gridProperties: { frozenRowCount: 1 } }, fields: 'title,gridProperties.frozenRowCount' } },
      { addSheet: { properties: { title: SUMMARY } } },
      { repeatCell: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      } },
      fmt(1, 'DATE', 'yyyy-mm-dd'),
      fmt(4, 'NUMBER', '#,##0'),
      fmt(7, 'DATE_TIME', 'yyyy-mm-dd hh:mm:ss'),
      { updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 280 }, fields: 'pixelSize' } },
    ];
    if (tz) requests.push({ updateSpreadsheetProperties: { properties: { timeZone: tz }, fields: 'timeZone' } });
    await gfetch(SHEETS + '/' + id + ':batchUpdate', send('POST', { requests: requests }));
    await gfetch(SHEETS + '/' + id + '/values:batchUpdate', send('POST', {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: TAB + '!A1:J1', values: [HEADERS] },
        { range: SUMMARY + '!A1', values: [['Pengeluaran per Kategori']] },
        { range: SUMMARY + '!A2', values: [[fCategory('Pengeluaran')]] },
        { range: SUMMARY + '!D1', values: [['Pemasukan per Kategori']] },
        { range: SUMMARY + '!D2', values: [[fCategory('Pemasukan')]] },
        { range: SUMMARY + '!G1', values: [['Total per Bulan']] },
        { range: SUMMARY + '!G2', values: [[fMonth]] },
      ],
    }));
  }

  async function createSheet() {
    const f = await gfetch(DRIVE + '?fields=id', send('POST', {
      name: FILE_NAME,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      appProperties: { [APP_KEY]: '1' },
    }));
    await setupTabs(f.id);
    return readMeta(f.id);
  }

  async function doEnsureSheet() {
    const cached = lsGet('ss', null);
    if (cached && cached.id) {
      try {
        const d = await gfetch(DRIVE + '/' + cached.id + '?fields=id,trashed');
        if (!d.trashed) return await readMeta(cached.id);
      } catch (e) {
        if (e.status !== 404 && e.status !== 403) throw e; // file hilang / bukan milik akun ini: cari ulang
      }
    }
    const found = await findFile();
    return found ? readMeta(found) : createSheet();
  }

  function ensureSheet() {
    if (ss) return Promise.resolve(ss);
    if (!ssPromise) {
      ssPromise = doEnsureSheet().then((m) => { ss = m; lsSet('ss', { id: m.id }); return m; });
      const clear = () => { ssPromise = null; };
      ssPromise.then(clear, clear);
    }
    return ssPromise;
  }

  // ---------- konversi nilai ----------
  const dateToSerial = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
    if (!m) throw new Error('Format tanggal harus yyyy-mm-dd: ' + s);
    return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) + 25569;
  };
  const serialToYmd = (n) => {
    const d = new Date(Math.round((n - 25569) * 86400000));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  };
  const nowSerial = () => (Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000 + 25569;

  function rowFor(it, receiptUrl, stamp) {
    const amount = Number(it.amount);
    if (!it.id) throw new Error('ID wajib');
    if (!isFinite(amount) || amount <= 0) throw new Error('Jumlah tidak valid');
    return [
      String(it.id), dateToSerial(it.date), String(it.category || 'Lainnya'), String(it.desc || ''), amount,
      String(it.method || ''), String(it.source || 'chat'), stamp, receiptUrl || '', it.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    ];
  }

  const valuesUrl = (range, query) => SHEETS + '/' + ss.id + '/values/' + enc(range) + (query || '');

  async function readIds() {
    const r = await gfetch(valuesUrl(TAB + '!A2:A', '?valueRenderOption=UNFORMATTED_VALUE'));
    return (r.values || []).map((row) => (row && row[0] !== undefined ? String(row[0]) : ''));
  }

  // ---------- operasi data ----------
  async function list() {
    const r = await gfetch(valuesUrl(TAB + '!A2:J', '?valueRenderOption=UNFORMATTED_VALUE'));
    return (r.values || [])
      .filter((row) => row && row[0] !== undefined && row[0] !== '' && row[4] !== undefined && row[4] !== '')
      .map((row) => ({
        id: String(row[0]),
        date: typeof row[1] === 'number' ? serialToYmd(row[1]) : String(row[1] || ''),
        category: String(row[2] || 'Lainnya'),
        desc: String(row[3] || ''),
        amount: Number(row[4]),
        method: String(row[5] || ''),
        source: String(row[6] || ''),
        receipt: String(row[8] || ''),
        type: row[9] === 'Pemasukan' ? 'income' : 'expense',
      }));
  }

  async function ensureFolder() {
    if (folderId) return folderId;
    const q = "mimeType='application/vnd.google-apps.folder' and trashed=false and appProperties has { key='" + APP_KEY + "Folder' and value='1' }";
    const r = await gfetch(DRIVE + '?q=' + enc(q) + '&pageSize=1&spaces=drive&fields=files(id)');
    if (r.files && r.files[0]) { folderId = r.files[0].id; return folderId; }
    const f = await gfetch(DRIVE + '?fields=id', send('POST', { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', appProperties: { [APP_KEY + 'Folder']: '1' } }));
    folderId = f.id;
    return folderId;
  }

  async function uploadReceipt(it) {
    if (/^https?:\/\//i.test(String(it.receipt || ''))) return String(it.receipt); // tautan foto yang sudah ada (mis. hasil salin)
    const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(String(it.receipt || ''));
    if (!m) return '';
    try {
      const parent = await ensureFolder();
      const boundary = 'ck' + Math.random().toString(36).slice(2);
      const meta = { name: it.date + '_' + it.id + '.jpg', parents: [parent], mimeType: m[1] };
      const body = new Blob([
        '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) +
        '\r\n--' + boundary + '\r\nContent-Type: ' + m[1] + '\r\nContent-Transfer-Encoding: base64\r\n\r\n' + m[2] +
        '\r\n--' + boundary + '--',
      ]);
      const f = await gfetch(UPLOAD + '?uploadType=multipart&fields=id,webViewLink', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body });
      return f.webViewLink || 'https://drive.google.com/file/d/' + f.id + '/view';
    } catch (e) {
      if (e.code === 'AUTH') throw e;
      return ''; // gagal unggah foto tidak boleh menggagalkan pencatatan
    }
  }

  async function add(items) {
    if (!items.length) return 0;
    const existing = new Set(await readIds());
    const fresh = items.filter((it) => !existing.has(String(it.id)));
    if (!fresh.length) return 0;
    const stamp = nowSerial();
    const rows = [];
    for (const it of fresh) rows.push(rowFor(it, await uploadReceipt(it), stamp));
    await gfetch(valuesUrl(TAB + '!A1', '') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', send('POST', { values: rows }));
    return rows.length;
  }

  async function update(item) {
    const ids = await readIds();
    const idx = ids.indexOf(String(item.id));
    if (idx < 0) throw new Error('Data tidak ditemukan');
    const row = idx + 2;
    const old = await gfetch(valuesUrl(TAB + '!A' + row + ':J' + row, '?valueRenderOption=UNFORMATTED_VALUE'));
    const o = (old.values && old.values[0]) || [];
    const r = rowFor(item, o[8] || '', typeof o[7] === 'number' ? o[7] : nowSerial());
    await gfetch(valuesUrl(TAB + '!A' + row + ':J' + row, '?valueInputOption=RAW'), send('PUT', { values: [r] }));
    return 1;
  }

  async function remove(wanted) {
    const ids = await readIds();
    const set = new Set(wanted.map(String));
    const rows = [];
    ids.forEach((id, i) => { if (set.has(id)) rows.push(i + 2); });
    if (!rows.length) return 0;
    rows.sort((a, b) => b - a); // hapus dari bawah agar nomor baris tidak bergeser
    const requests = rows.map((r) => ({ deleteDimension: { range: { sheetId: ss.sheetId, dimension: 'ROWS', startIndex: r - 1, endIndex: r } } }));
    await gfetch(SHEETS + '/' + ss.id + ':batchUpdate', send('POST', { requests: requests }));
    return rows.length;
  }

  // ---------- antarmuka untuk app.js ----------
  async function call(action, payload) {
    payload = payload || {};
    await ensureToken();
    if (!profile) await loadProfile();
    await ensureSheet();
    switch (action) {
      case 'ping': return { ok: true };
      case 'list': return { ok: true, items: await list() };
      case 'add': return { ok: true, added: await add(payload.items || []) };
      case 'update': return { ok: true, updated: await update(payload.item) };
      case 'delete': return { ok: true, deleted: await remove(payload.ids || []) };
      default: throw new Error('Aksi tidak dikenal');
    }
  }

  async function signIn(opts) {
    opts = opts || {};
    if (opts.switchAccount) { accessToken = null; ss = null; folderId = null; profile = null; lsDel('ss'); lsDel('profile'); }
    await requestToken({ prompt: opts.switchAccount ? 'select_account' : '' });
    await loadProfile();
    await ensureSheet();
    lsSet('on', true);
    return profile;
  }

  function signOut() {
    accessToken = null; expiresAt = 0; ss = null; folderId = null; profile = null;
    ['ss', 'profile', 'on'].forEach(lsDel);
  }

  function spreadsheetUrl() {
    const id = (ss && ss.id) || (lsGet('ss', null) || {}).id;
    return id ? 'https://docs.google.com/spreadsheets/d/' + id + '/edit' : '';
  }

  window.GoogleBackend = {
    configured: configured,
    preload: preload,
    signIn: signIn,
    signOut: signOut,
    call: call,
    getProfile: () => profile,
    spreadsheetUrl: spreadsheetUrl,
    AuthError: AuthError,
    _internal: { dateToSerial: dateToSerial, serialToYmd: serialToYmd },
  };
})();
