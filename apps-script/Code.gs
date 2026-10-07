/**
 * Backend Catatan Keuangan — Google Apps Script
 * Menyimpan & membaca pengeluaran dan pemasukan di Google Sheets milik Anda.
 *
 * LANGKAH PASANG (lihat README.md):
 * 1. Buka editor Apps Script, tempel seluruh file ini (ganti isi lama).
 * 2. Ganti TOKEN di bawah dengan kode rahasia buatan Anda sendiri.
 * 3. Jalankan fungsi `setup` sekali (beri izin akses).
 * 4. Deploy -> Deployment baru -> Aplikasi web
 *    (Jalankan sebagai: Saya | Siapa yang punya akses: Siapa saja) -> salin URL /exec.
 *    Jika hanya memperbarui kode: Deploy -> Kelola deployment -> ikon pensil -> Versi: Versi baru -> Deploy
 *    (URL tidak berubah).
 */

const SPREADSHEET_ID = '19u4pnYkWr3-W_SZEMvU2B5rLIuvA-4XFrQvwjqFtzyU';
const SHEET_NAME = 'Pengeluaran';
const SUMMARY_SHEET = 'Ringkasan';
const TOKEN = 'GANTI_DENGAN_KODE_RAHASIA_ANDA';

const RECEIPT_FOLDER = 'Struk Pengeluaran';
const HEADERS = ['ID', 'Tanggal', 'Kategori', 'Deskripsi', 'Jumlah (Rp)', 'Metode', 'Sumber', 'Dicatat Pada', 'Bukti Foto', 'Tipe'];
const TIPE_COL = 10; // kolom J: "Pengeluaran" atau "Pemasukan"

function setup() {
  const sh = getSheet_();
  buildSummary_();
  SpreadsheetApp.flush();
  return 'OK: sheet "' + sh.getName() + '" siap.';
}

function styleHeader_(range) {
  range.setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    styleHeader_(sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]));
    sh.setFrozenRows(1);
    sh.getRange('B:B').setNumberFormat('yyyy-mm-dd');
    sh.getRange('E:E').setNumberFormat('#,##0');
    sh.getRange('H:H').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sh.setColumnWidths(1, 1, 110);
    sh.setColumnWidths(2, 1, 100);
    sh.setColumnWidths(3, 1, 150);
    sh.setColumnWidths(4, 1, 280);
    sh.setColumnWidths(5, 1, 120);
    sh.setColumnWidths(6, 2, 100);
    sh.setColumnWidths(8, 1, 160);
    sh.setColumnWidths(10, 1, 100);
  }
  ensureTipe_(sh);
  return sh;
}

// Migrasi: sheet lama (tanpa kolom Tipe) otomatis ditambah kolom Tipe, data lama dianggap Pengeluaran.
function ensureTipe_(sh) {
  if (sh.getRange(1, TIPE_COL).getValue() === 'Tipe') return;
  styleHeader_(sh.getRange(1, TIPE_COL).setValue('Tipe'));
  const last = sh.getLastRow();
  if (last >= 2) {
    const ids = sh.getRange(2, 1, last - 1, 1).getValues();
    const tipe = ids.map(function (r) { return [r[0] === '' ? '' : 'Pengeluaran']; });
    sh.getRange(2, TIPE_COL, last - 1, 1).setValues(tipe);
  }
}

function buildSummary_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SUMMARY_SHEET);
  if (!sh) sh = ss.insertSheet(SUMMARY_SHEET);
  sh.clear();
  const src = SHEET_NAME + '!A:J'; // huruf kolom di QUERY mengikuti range: A=ID, B=Tanggal, C=Kategori, E=Jumlah, J=Tipe

  sh.getRange('A1').setValue('Pengeluaran per Kategori').setFontWeight('bold');
  sh.getRange('A2').setFormula(
    `=IFERROR(QUERY(${src},"select C, sum(E) where E is not null and J = 'Pengeluaran' group by C order by sum(E) desc label C 'Kategori', sum(E) 'Total (Rp)'",1),"Belum ada data")`
  );
  sh.getRange('D1').setValue('Pemasukan per Kategori').setFontWeight('bold');
  sh.getRange('D2').setFormula(
    `=IFERROR(QUERY(${src},"select C, sum(E) where E is not null and J = 'Pemasukan' group by C order by sum(E) desc label C 'Kategori', sum(E) 'Total (Rp)'",1),"Belum ada data")`
  );
  sh.getRange('G1').setValue('Total per Bulan').setFontWeight('bold');
  sh.getRange('G2').setFormula(
    `=IFERROR(QUERY(${src},"select year(B), month(B)+1, J, sum(E) where E is not null and J is not null group by year(B), month(B)+1, J order by year(B), month(B)+1, J label year(B) 'Tahun', month(B)+1 'Bulan', J 'Tipe', sum(E) 'Total (Rp)'",1),"Belum ada data")`
  );
  sh.setColumnWidths(1, 1, 170);
  sh.setColumnWidths(4, 1, 170);
  sh.getRange('B:B').setNumberFormat('#,##0');
  sh.getRange('E:E').setNumberFormat('#,##0');
  sh.getRange('J:J').setNumberFormat('#,##0');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return json_({ ok: true, message: 'Catatan Keuangan aktif. Gunakan aplikasi web untuk mengakses data.' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Permintaan tidak valid' });
  }
  if (!req || req.token !== TOKEN) return json_({ ok: false, error: 'Token salah' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getSheet_();
    switch (req.action) {
      case 'ping': return json_({ ok: true });
      case 'list': return json_({ ok: true, items: list_(sh) });
      case 'add': return json_({ ok: true, added: add_(sh, req.items || []) });
      case 'update': return json_({ ok: true, updated: update_(sh, req.item) });
      case 'delete': return json_({ ok: true, deleted: delete_(sh, req.ids || []) });
      default: return json_({ ok: false, error: 'Aksi tidak dikenal' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function tz_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSpreadsheetTimeZone();
}

function toDate_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) throw new Error('Format tanggal harus yyyy-mm-dd: ' + s);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

function list_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const tz = tz_();
  const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  return rows
    .filter(function (r) { return r[0] !== '' && r[4] !== ''; })
    .map(function (r) {
      return {
        id: String(r[0]),
        date: r[1] instanceof Date ? Utilities.formatDate(r[1], tz, 'yyyy-MM-dd') : String(r[1]),
        category: String(r[2]),
        desc: String(r[3]),
        amount: Number(r[4]),
        method: String(r[5] || ''),
        source: String(r[6] || ''),
        receipt: String(r[8] || ''),
        type: r[9] === 'Pemasukan' ? 'income' : 'expense',
      };
    });
}

function saveReceipt_(it) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(String(it.receipt || ''));
  if (!m) return '';
  const folders = DriveApp.getFoldersByName(RECEIPT_FOLDER);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(RECEIPT_FOLDER);
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], it.date + '_' + it.id + '.jpg');
  return folder.createFile(blob).getUrl();
}

function rowFor_(it, receiptUrl) {
  const amount = Number(it.amount);
  if (!it.id) throw new Error('ID wajib');
  if (!isFinite(amount) || amount <= 0) throw new Error('Jumlah tidak valid');
  return [
    String(it.id),
    toDate_(it.date),
    String(it.category || 'Lainnya'),
    String(it.desc || ''),
    amount,
    String(it.method || ''),
    String(it.source || 'chat'),
    new Date(),
    receiptUrl || '',
    it.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
  ];
}

function add_(sh, items) {
  if (!items.length) return 0;
  const existing = {};
  list_(sh).forEach(function (x) { existing[x.id] = true; });
  const rows = items.filter(function (it) { return !existing[it.id]; }).map(function (it) {
    return rowFor_(it, saveReceipt_(it));
  });
  if (!rows.length) return 0;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
  return rows.length;
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function update_(sh, it) {
  const row = findRow_(sh, it.id);
  if (row < 0) throw new Error('Data tidak ditemukan');
  const old = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  const r = rowFor_(it, old[8]);
  r[7] = old[7] || r[7];
  sh.getRange(row, 1, 1, HEADERS.length).setValues([r]);
  return 1;
}

function delete_(sh, ids) {
  let n = 0;
  ids.forEach(function (id) {
    const row = findRow_(sh, id);
    if (row > 0) { sh.deleteRow(row); n++; }
  });
  return n;
}
