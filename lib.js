/* Logika murni (parser chat, parser struk, periode, statistik). Dipakai di browser dan Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Lib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EXPENSE_CATEGORIES = [
    { name: 'Makan & Minum', color: '#f97316', words: ['makan', 'minum', 'kopi', 'sarapan', 'lunch', 'dinner', 'nasi', 'ayam', 'bakso', 'mie', 'soto', 'warteg', 'resto', 'restoran', 'cafe', 'kafe', 'gofood', 'grabfood', 'shopeefood', 'boba', 'jajan', 'snack', 'camilan', 'roti', 'es teh', 'teh', 'jus', 'martabak', 'sate', 'pizza', 'burger', 'kfc', 'mcd', 'starbucks', 'warung', 'kantin', 'catering', 'seblak', 'gorengan'] },
    { name: 'Transportasi', color: '#3b82f6', words: ['bensin', 'pertalite', 'pertamax', 'solar', 'parkir', 'tol', 'ojek', 'gojek', 'grab', 'gocar', 'goride', 'maxim', 'krl', 'mrt', 'lrt', 'transjakarta', 'busway', 'kereta', 'tiket pesawat', 'travel', 'taksi', 'taxi', 'bluebird', 'servis motor', 'servis mobil', 'ganti oli', 'oli', 'ban'] },
    { name: 'Kebutuhan Harian', color: '#22c55e', words: ['sabun', 'shampo', 'sampo', 'odol', 'deterjen', 'beras', 'minyak goreng', 'telur', 'galon', 'gas elpiji', 'elpiji', 'indomaret', 'alfamart', 'supermarket', 'belanja bulanan', 'belanja dapur', 'tisu', 'pasar', 'sayur', 'buah', 'gula', 'garam', 'popok', 'susu', 'pembersih', 'pewangi', 'sembako', 'laundry', 'cukur'] },
    { name: 'Hiburan', color: '#a855f7', words: ['nonton', 'bioskop', 'netflix', 'spotify', 'game', 'steam', 'konser', 'karaoke', 'liburan', 'wisata', 'youtube', 'disney', 'hbo', 'vidio', 'top up', 'topup', 'diamond', 'main', 'hotel', 'villa', 'tiket masuk', 'rekreasi', 'hobi'] },
    { name: 'Tagihan & Utilitas', color: '#eab308', words: ['listrik', 'pln', 'token listrik', 'air pdam', 'pdam', 'wifi', 'internet', 'indihome', 'pulsa', 'paket data', 'kos', 'kontrakan', 'sewa', 'cicilan', 'angsuran', 'pajak', 'pbb', 'stnk', 'asuransi', 'tagihan', 'iuran', 'langganan', 'kartu kredit'] },
    { name: 'Kesehatan', color: '#ef4444', words: ['obat', 'apotek', 'dokter', 'klinik', 'rumah sakit', 'rs ', 'vitamin', 'bpjs', 'gym', 'fitness', 'medical', 'cek lab', 'periksa', 'dentist', 'dokter gigi', 'masker'] },
    { name: 'Pendidikan', color: '#6366f1', words: ['buku', 'kursus', 'sekolah', 'spp', 'kuliah', 'les', 'udemy', 'coursera', 'seminar', 'alat tulis', 'atk', 'fotokopi', 'print', 'ukt', 'bimbel'] },
    { name: 'Belanja', color: '#ec4899', weak: ['shopee', 'tokopedia', 'tokped', 'lazada', 'tiktok shop'], words: ['baju', 'sepatu', 'tas', 'gadget', 'elektronik', 'kaos', 'celana', 'jaket', 'hp', 'laptop', 'headset', 'charger', 'skincare', 'kosmetik', 'parfum', 'furniture', 'perabot', 'aksesoris', 'kado'] },
    { name: 'Donasi & Sosial', color: '#06b6d4', words: ['sedekah', 'zakat', 'infaq', 'infak', 'donasi', 'hadiah', 'arisan', 'sumbangan', 'amal', 'kondangan', 'angpao', 'traktir', 'patungan'] },
    { name: 'Investasi', color: '#0f766e', words: ['investasi', 'saham', 'reksadana', 'reksa dana', 'emas', 'antam', 'tabungan emas', 'crypto', 'kripto', 'bitcoin', 'btc', 'bibit', 'ajaib', 'bareksa', 'stockbit', 'pluang', 'indodax', 'tokocrypto', 'deposito', 'obligasi', 'sbn', 'sukuk', 'ori', 'rdn', 'dca', 'p2p', 'dana pensiun', 'top up rdn'] },
    { name: 'Lainnya', color: '#94a3b8', words: [] },
  ];

  const INCOME_CATEGORIES = [
    { name: 'Gaji', color: '#16a34a', words: ['gaji', 'gajian', 'salary', 'payroll', 'upah', 'slip gaji'] },
    { name: 'Bonus & THR', color: '#f59e0b', words: ['bonus', 'thr', 'insentif', 'tunjangan', 'lembur', 'reward'] },
    { name: 'Usaha & Freelance', color: '#8b5cf6', words: ['freelance', 'proyek', 'project', 'honor', 'honorarium', 'fee', 'komisi', 'jualan', 'penjualan', 'hasil jual', 'jual', 'usaha', 'omzet', 'order', 'endorse', 'ads'] },
    { name: 'Hasil Investasi', color: '#0d9488', words: ['dividen', 'bunga', 'bunga deposito', 'kupon', 'return', 'bagi hasil', 'cuan', 'profit', 'capital gain', 'sewa masuk', 'royalti'] },
    { name: 'Hadiah & Transfer', color: '#ec4899', words: ['hadiah', 'transfer masuk', 'kiriman', 'uang saku', 'angpao', 'warisan', 'cashback', 'refund', 'pengembalian', 'diterima', 'terima', 'ditransfer', 'patungan'] },
    { name: 'Lainnya', color: '#94a3b8', words: [] },
  ];

  // dipakai oleh versi lama / kompatibilitas
  const CATEGORIES = EXPENSE_CATEGORIES;
  const catsFor = (type) => (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);
  const catColor = (type, name) => {
    const list = catsFor(type);
    return (list.find((c) => c.name === name) || list[list.length - 1]).color;
  };

  const MONTHS = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
  const MONTH_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseYmd = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return new Date(+m[1], +m[2] - 1, +m[3]);
  };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  function categorize(text, type) {
    const list = catsFor(type);
    const t = ' ' + String(text).toLowerCase() + ' ';
    let best = null;
    let bestLen = 0;
    for (const c of list) {
      for (const w of c.words) {
        if (w.length > bestLen && t.indexOf(w.length <= 3 ? ' ' + w.trim() + ' ' : w) !== -1) {
          best = c.name;
          bestLen = w.length;
        }
      }
    }
    if (!best) {
      // nama marketplace hanya menentukan kategori bila tidak ada kata lain yang cocok
      for (const c of list) {
        if (c.weak && c.weak.some((w) => t.indexOf(w) !== -1)) { best = c.name; break; }
      }
    }
    return best || 'Lainnya';
  }

  const INCOME_RE = /(^\s*\+)|\b(gaji|gajian|salary|payroll|bonus|thr|dividen|pemasukan|income|honor|honorarium|komisi|cashback|refund|freelance|insentif|uang saku|diterima|terima|hasil jual|penjualan|omzet|bagi hasil|transfer masuk)\b/i;
  /** Kembalikan 'income' bila teks jelas pemasukan, selain itu 'expense' */
  function detectType(text) {
    return INCOME_RE.test(String(text)) ? 'income' : 'expense';
  }

  function detectMethod(text) {
    const t = text.toLowerCase();
    // Tokopedia & Shopee dianggap e-wallet
    if (/\b(shopee\w*|tokopedia|tokped|gopay|ovo|dana|linkaja|qris|e-?wallet)\b/.test(t)) return 'E-wallet';
    if (/\b(transfer|tf)\b/.test(t)) return 'Transfer';
    if (/\b(cash|tunai)\b/.test(t)) return 'Tunai';
    if (/\b(kartu|debit|kredit|cc)\b/.test(t)) return 'Kartu';
    return '';
  }

  function toInt(str) {
    let s = String(str).trim();
    // buang desimal 1-2 digit di belakang (",00" / ".50"), pertahankan pemisah ribuan (3 digit)
    s = s.replace(/[.,]\d{1,2}$/, '');
    s = s.replace(/[.,]/g, '');
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  }

  /** Cari tanggal dalam teks. Mengembalikan {date, rest} */
  function extractDate(text, base) {
    base = base || new Date();
    let s = text;
    let m;
    const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());

    if ((m = /\bkemarin\s+lusa\b/i.exec(s))) return { date: addDays(today, -2), rest: s.replace(m[0], ' ') };
    if ((m = /\b(\d{1,2})\s*hari\s*(?:yang\s*)?lalu\b/i.exec(s))) return { date: addDays(today, -Number(m[1])), rest: s.replace(m[0], ' ') };
    if ((m = /\b(kemarin|kmrn)\b/i.exec(s))) return { date: addDays(today, -1), rest: s.replace(m[0], ' ') };
    if ((m = /\b(hari\s+ini|barusan|tadi\s+(?:pagi|siang|sore|malam)|tadi)\b/i.exec(s))) return { date: today, rest: s.replace(m[0], ' ') };

    // 5 oktober (2026)
    const monthNames = MONTHS.concat(MONTH_ABBR, MONTH_EN).join('|');
    const re = new RegExp('\\b(\\d{1,2})\\s+(' + monthNames + ')\\.?(?:\\s+(\\d{4}))?\\b', 'i');
    if ((m = re.exec(s))) {
      const name = m[2].toLowerCase();
      let mi = MONTHS.indexOf(name);
      if (mi < 0) mi = MONTH_ABBR.indexOf(name);
      if (mi < 0) mi = MONTH_EN.indexOf(name);
      const y = m[3] ? Number(m[3]) : today.getFullYear();
      let d = new Date(y, mi, Number(m[1]));
      if (!m[3] && d > today) d = new Date(y - 1, mi, Number(m[1]));
      if (d.getMonth() === mi) return { date: d, rest: s.replace(m[0], ' ') };
    }
    // 2026-10-05
    if ((m = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(s))) {
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      if (d.getMonth() === +m[2] - 1) return { date: d, rest: s.replace(m[0], ' ') };
    }
    // 05/10/2026, 5-10-26, 5/10
    if ((m = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/.exec(s))) {
      let y = m[3] ? Number(m[3]) : today.getFullYear();
      if (y < 100) y += 2000;
      let d = new Date(y, +m[2] - 1, +m[1]);
      if (!m[3] && d > today) d = new Date(y - 1, +m[2] - 1, +m[1]);
      if (d.getMonth() === +m[2] - 1 && +m[2] >= 1 && +m[2] <= 12) return { date: d, rest: s.replace(m[0], ' ') };
    }
    // tgl 5
    if ((m = /\b(?:tgl|tanggal)\.?\s*(\d{1,2})\b/i.exec(s))) {
      let d = new Date(today.getFullYear(), today.getMonth(), Number(m[1]));
      if (d > today) d = new Date(today.getFullYear(), today.getMonth() - 1, Number(m[1]));
      return { date: d, rest: s.replace(m[0], ' ') };
    }
    return { date: today, rest: s };
  }

  /** Cari nominal. Mengembalikan {amount, rest} */
  function extractAmount(text) {
    const s = text;
    let m;
    if ((m = /(\d+(?:[.,]\d+)?)\s*(jt|juta)\b/i.exec(s))) {
      return { amount: Math.round(parseFloat(m[1].replace(',', '.')) * 1e6), rest: s.replace(m[0], ' ') };
    }
    if ((m = /(\d+(?:[.,]\d+)?)\s*(rb|ribu|k)\b/i.exec(s))) {
      const raw = m[1];
      const val = /^\d{1,3}(?:\.\d{3})+$/.test(raw) ? parseInt(raw.replace(/\./g, ''), 10) : parseFloat(raw.replace(',', '.')) * 1e3;
      return { amount: Math.round(val), rest: s.replace(m[0], ' ') };
    }
    if ((m = /rp\.?\s*([\d.,]+)/i.exec(s))) {
      const n = toInt(m[1].replace(/[.,]+$/, ''));
      if (n) return { amount: n, rest: s.replace(m[0], ' ') };
    }
    if ((m = /\b\d{1,3}(?:[.,]\d{3})+\b/.exec(s))) {
      const n = toInt(m[0]);
      if (n) return { amount: n, rest: s.replace(m[0], ' ') };
    }
    if ((m = /\b\d{4,}\b/.exec(s))) {
      return { amount: parseInt(m[0], 10), rest: s.replace(m[0], ' ') };
    }
    return { amount: null, rest: s };
  }

  function cleanDesc(s) {
    let t = s
      .replace(/\b(sebesar|seharga|senilai|habis|rp|idr|rupiah|sebanyak)\b/gi, ' ')
      .replace(/[,:;]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    t = t.replace(/^(tadi|pagi|siang|sore|malam)\s+/i, '').trim();
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /**
   * Parse satu baris chat -> entri.
   * forceType = 'income' memaksa pemasukan; selain itu tipe dideteksi dari kata kunci (default pengeluaran).
   */
  function parseEntry(line, base, forceType) {
    const raw = line.trim();
    if (!raw) return null;
    const type = forceType === 'income' ? 'income' : detectType(raw);
    const original = raw.replace(/^\+\s*/, '');
    const method = detectMethod(original);
    const d = extractDate(original, base);
    const a = extractAmount(d.rest);
    const desc = cleanDesc(a.rest) || original;
    return {
      type: type,
      date: ymd(d.date),
      desc: desc,
      amount: a.amount,
      category: categorize(original, type),
      method: method,
      source: 'chat',
    };
  }

  /** Parse pesan (boleh banyak baris, dipisah newline atau titik koma) */
  function parseMessage(text, base, forceType) {
    return String(text)
      .split(/[\n;]+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({ raw: l, entry: parseEntry(l, base, forceType) }));
  }

  /** Parse teks hasil OCR struk -> entri (selalu pengeluaran) */
  function parseReceipt(text, base) {
    base = base || new Date();
    const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const numRe = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{4,}(?:[.,]\d{1,2})?/g;
    const lineNums = (l) => (l.match(numRe) || []).map(toInt).filter((n) => n && n >= 500 && n < 1e9);

    const skipRe = /(kembali|change|tunai|cash|diskon|discount|ppn|pajak|tax|poin|point)/i;
    let amount = null;
    const tiers = [/grand\s*total/i, /total\s*(?:bayar|belanja|tagihan)/i, /^total\b|\btotal\b/i, /tagihan|amount\s*due|jumlah|netto/i, /bayar/i];
    for (const tier of tiers) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (tier.test(lines[i]) && !skipRe.test(lines[i])) {
          let nums = lineNums(lines[i]);
          if (!nums.length && lines[i + 1]) nums = lineNums(lines[i + 1]);
          if (nums.length) { amount = Math.max.apply(null, nums); break; }
        }
      }
      if (amount) break;
    }
    if (!amount) {
      const all = [];
      lines.forEach((l) => { if (!skipRe.test(l)) all.push.apply(all, lineNums(l)); });
      if (all.length) amount = Math.max.apply(null, all);
    }

    // tanggal
    let date = null;
    let m;
    const joined = lines.join(' ');
    if ((m = /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/.exec(joined))) {
      date = new Date(+m[1], +m[2] - 1, +m[3]);
    } else if ((m = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/.exec(joined))) {
      let y = +m[3]; if (y < 100) y += 2000;
      date = new Date(y, +m[2] - 1, +m[1]);
    } else {
      const monthNames = MONTHS.concat(MONTH_ABBR, MONTH_EN).join('|');
      const re = new RegExp('\\b(\\d{1,2})[\\s\\-]+(' + monthNames + ')[a-z]*[\\s\\-,]+(\\d{2,4})\\b', 'i');
      if ((m = re.exec(joined))) {
        const name = m[2].toLowerCase();
        let mi = MONTHS.indexOf(name); if (mi < 0) mi = MONTH_ABBR.indexOf(name); if (mi < 0) mi = MONTH_EN.indexOf(name);
        let y = +m[3]; if (y < 100) y += 2000;
        if (mi >= 0) date = new Date(y, mi, +m[1]);
      }
    }
    const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    if (!date || isNaN(date) || date > addDays(today, 1) || date < new Date(today.getFullYear() - 3, 0, 1)) date = today;

    // nama toko: baris pertama yang berisi huruf dan bukan angka semata
    let merchant = '';
    for (const l of lines.slice(0, 6)) {
      const letters = (l.match(/[A-Za-z]/g) || []).length;
      if (letters >= 3 && letters / l.length > 0.5 && !/(struk|receipt|invoice|nota|jl\.|jalan|telp|tel:)/i.test(l)) { merchant = l; break; }
    }
    merchant = merchant.replace(/[^\w\s&.'\-]/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      type: 'expense',
      date: ymd(date),
      desc: merchant ? 'Struk: ' + merchant : 'Struk belanja',
      amount: amount,
      category: categorize(text, 'expense'),
      method: detectMethod(text),
      source: 'foto',
    };
  }

  // ----- periode & statistik -----
  function startOfWeek(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = (x.getDay() + 6) % 7; // Senin = 0
    return addDays(x, -dow);
  }

  function periodRange(mode, anchor, data) {
    const a = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    if (mode === 'week') { const s = startOfWeek(a); return { start: s, end: addDays(s, 6) }; }
    if (mode === 'month') return { start: new Date(a.getFullYear(), a.getMonth(), 1), end: new Date(a.getFullYear(), a.getMonth() + 1, 0) };
    if (mode === 'year') return { start: new Date(a.getFullYear(), 0, 1), end: new Date(a.getFullYear(), 11, 31) };
    if (mode === 'custom') return { start: a, end: a };
    const ds = (data || []).map((x) => x.date).sort();
    if (!ds.length) return { start: a, end: a };
    return { start: parseYmd(ds[0]), end: parseYmd(ds[ds.length - 1]) };
  }

  function shiftAnchor(mode, anchor, dir) {
    if (mode === 'week') return addDays(anchor, 7 * dir);
    if (mode === 'month') return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
    if (mode === 'year') return new Date(anchor.getFullYear() + dir, 0, 1);
    return anchor;
  }

  function previousRange(mode, range) {
    if (mode === 'all' || mode === 'custom') return null;
    const days = Math.round((range.end - range.start) / 864e5) + 1;
    if (mode === 'month') {
      const s = new Date(range.start.getFullYear(), range.start.getMonth() - 1, 1);
      return { start: s, end: new Date(s.getFullYear(), s.getMonth() + 1, 0) };
    }
    if (mode === 'year') return { start: new Date(range.start.getFullYear() - 1, 0, 1), end: new Date(range.start.getFullYear() - 1, 11, 31) };
    return { start: addDays(range.start, -days), end: addDays(range.start, -1) };
  }

  function inRange(items, range) {
    const s = ymd(range.start), e = ymd(range.end);
    return items.filter((x) => x.date >= s && x.date <= e);
  }

  function ofType(items, type) {
    return items.filter((x) => (x.type === 'income' ? 'income' : 'expense') === type);
  }

  function sum(items) { return items.reduce((t, x) => t + x.amount, 0); }

  function byCategory(items) {
    const map = {};
    items.forEach((x) => { map[x.category] = (map[x.category] || 0) + x.amount; });
    return Object.keys(map).map((k) => ({ category: k, total: map[k] })).sort((a, b) => b.total - a.total);
  }

  const METHOD_COLORS = { 'Tunai': '#22c55e', 'Transfer': '#3b82f6', 'E-wallet': '#a855f7', 'Kartu': '#f59e0b', 'Tidak diisi': '#94a3b8' };
  function byMethod(items) {
    const map = {}, cnt = {};
    items.forEach((x) => { const k = x.method || 'Tidak diisi'; map[k] = (map[k] || 0) + x.amount; cnt[k] = (cnt[k] || 0) + 1; });
    const total = items.reduce((t, x) => t + x.amount, 0);
    return Object.keys(map).map((k) => ({ method: k, total: map[k], count: cnt[k], pct: total ? (map[k] / total) * 100 : 0, color: METHOD_COLORS[k] || '#64748b' })).sort((a, b) => b.total - a.total);
  }
  const fmtPct = (p) => (p > 0 && p < 1 ? '<1' : p < 10 && p % 1 ? p.toFixed(1).replace('.', ',') : String(Math.round(p))) + '%';

  /** Bucket untuk grafik batang: harian (minggu/bulan) atau bulanan (tahun/semua) */
  function buckets(items, mode, range) {
    const out = [];
    if (mode === 'week' || mode === 'month') {
      for (let d = new Date(range.start); d <= range.end; d = addDays(d, 1)) out.push({ key: ymd(d), label: String(d.getDate()), total: 0 });
      const idx = {}; out.forEach((b, i) => (idx[b.key] = i));
      items.forEach((x) => { if (idx[x.date] !== undefined) out[idx[x.date]].total += x.amount; });
      if (mode === 'week') {
        const dn = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
        out.forEach((b, i) => (b.label = dn[i] + ' ' + b.label));
      }
    } else {
      let y = range.start.getFullYear(), m = range.start.getMonth();
      const ey = range.end.getFullYear(), em = range.end.getMonth();
      while (y < ey || (y === ey && m <= em)) {
        out.push({ key: y + '-' + pad(m + 1), label: MONTH_ABBR[m].charAt(0).toUpperCase() + MONTH_ABBR[m].slice(1) + (mode === 'all' ? " '" + String(y).slice(2) : ''), total: 0 });
        m++; if (m > 11) { m = 0; y++; }
      }
      const idx = {}; out.forEach((b, i) => (idx[b.key] = i));
      items.forEach((x) => { const k = x.date.slice(0, 7); if (idx[k] !== undefined) out[idx[k]].total += x.amount; });
    }
    return out;
  }

  /** Batas "pengeluaran besar": otomatis dari riwayat pengeluaran, kecuali diisi manual */
  function bigThreshold(all, manual) {
    if (manual && manual > 0) return manual;
    // investasi bukan pemborosan, jadi tidak ikut menentukan batas "besar"
    const a = ofType(all, 'expense').filter((x) => x.category !== 'Investasi').map((x) => x.amount).sort((p, q) => p - q);
    if (a.length < 8) return 500000;
    const mean = a.reduce((t, v) => t + v, 0) / a.length;
    const sd = Math.sqrt(a.reduce((t, v) => t + (v - mean) * (v - mean), 0) / a.length);
    const med = a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
    return Math.max(Math.round(Math.max(med * 3, mean + sd) / 1000) * 1000, 50000);
  }

  function rupiah(n) {
    const v = Math.round(n);
    return (v < 0 ? '-Rp ' : 'Rp ') + Math.abs(v).toLocaleString('id-ID');
  }

  function periodLabel(mode, range) {
    const f = (d) => d.getDate() + ' ' + MONTH_ABBR[d.getMonth()] + ' ' + d.getFullYear();
    if (mode === 'month') return MONTHS[range.start.getMonth()].replace(/^./, (c) => c.toUpperCase()) + ' ' + range.start.getFullYear();
    if (mode === 'year') return 'Tahun ' + range.start.getFullYear();
    if (mode === 'all') return 'Semua waktu';
    return f(range.start) + ' – ' + f(range.end);
  }


  // ---------- tanya jawab (mesin pertanyaan lokal, tanpa server) ----------
  const CONCEPTS = {
    jajan: ['jajan', 'snack', 'camilan', 'cemilan', 'cemil', 'gorengan', 'boba', 'kopi', 'kue', 'roti', 'bolen', 'martabak', 'seblak', 'cilok', 'batagor', 'siomay', 'pentol', 'donat', 'cokelat', 'coklat', 'permen', 'es krim', 'ice cream', 'es teh', 'jus', 'minuman', 'dessert', 'cireng', 'risol', 'bakwan', 'pisang goreng', 'kebab', 'takoyaki'],
    makanan: ['makan', 'nasi', 'ayam', 'bakso', 'mie', 'soto', 'warteg', 'sarapan', 'lunch', 'dinner', 'gofood', 'grabfood', 'shopeefood', 'resto', 'warung', 'kantin', 'catering'],
    ngopi: ['kopi', 'cafe', 'kafe', 'starbucks', 'latte'],
  };
  const CAT_ALIAS = [
    ['Makan & Minum', ['makan & minum', 'makan dan minum', 'makan minum', 'makanan', 'konsumsi']],
    ['Transportasi', ['transportasi', 'transport', 'ongkos']],
    ['Kebutuhan Harian', ['kebutuhan harian', 'kebutuhan']],
    ['Hiburan', ['hiburan']],
    ['Tagihan & Utilitas', ['tagihan', 'utilitas']],
    ['Kesehatan', ['kesehatan']],
    ['Pendidikan', ['pendidikan']],
    ['Belanja', ['belanja']],
    ['Donasi & Sosial', ['donasi', 'sosial']],
    ['Investasi', ['investasi']],
  ];
  const STOP = new Set(('berapa brp banyak total jumlah pengeluaran pengeluarannya pemasukan pemasukannya pendapatan saya aku ku untuk buat dalam selama pada di ke dari dan yang apa saja aja kah ya nih dong tolong coba lihat tampilkan daftar rekap rincian rata rata paling terbesar tertinggi terkecil termahal kali kategori persentase presentase porsi metode pembayaran pakai memakai menggunakan via lewat bayar cara wallet transaksi catatan uang duit habis keluar masuk dikeluarkan sebulan setahun seminggu sehari bulan minggu tahun hari ini itu kemarin lalu terakhir lagi sih adalah ada tiap per sejak semua seluruh keseluruhan gaji saldo sisa selisih tabung punya aku untuk buat mana kapan').split(' '));

  const isQuestion = (text) => {
    const t = String(text || '').toLowerCase();
    if (/\?\s*$/.test(t) || /\b(berapa|brp|apa saja|apa aja|kapan|mana)\b/.test(t)) return true;
    if (extractAmount(t).amount) return false;
    return /\b(total|jumlah|rata-rata|rata2|rata rata|terbesar|terkecil|tertinggi|termahal|paling|rekap|rincian|daftar|tampilkan|lihat|saldo|sisa uang)\b/.test(t);
  };

  function resolvePeriod(t, now) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const R = (a, b, label, rm) => ({ start: ymd(a), end: ymd(b), label: label, rest: rm });
    const monthName = (d) => MONTHS[d.getMonth()].replace(/^./, (c) => c.toUpperCase()) + ' ' + d.getFullYear();
    let m;
    if ((m = /\b(\d+)\s*(hari|minggu|bulan)\s*(terakhir|belakangan|lalu|kebelakang)\b/.exec(t))) {
      const n = Number(m[1]); const u = m[2];
      const start = u === 'hari' ? addDays(today, -(n - 1)) : u === 'minggu' ? addDays(today, -(n * 7 - 1)) : new Date(today.getFullYear(), today.getMonth() - n, today.getDate() + 1);
      return R(start, today, n + ' ' + u + ' terakhir', m[0]);
    }
    if (/\bhari ini\b/.test(t)) return R(today, today, 'hari ini', 'hari ini');
    if (/\bkemarin\b/.test(t)) { const y = addDays(today, -1); return R(y, y, 'kemarin', 'kemarin'); }
    if (/\bminggu (lalu|kemarin)\b/.test(t)) { const s = addDays(startOfWeek(today), -7); return R(s, addDays(s, 6), 'minggu lalu', 'minggu lalu'); }
    if (/\b(minggu ini|seminggu)\b/.test(t)) { const s = startOfWeek(today); return R(s, addDays(s, 6), 'minggu ini', 'minggu ini'); }
    if (/\b(tahun lalu|tahun kemarin)\b/.test(t)) { const y = today.getFullYear() - 1; return R(new Date(y, 0, 1), new Date(y, 11, 31), 'tahun ' + y, 'tahun lalu'); }
    if (/\b(tahun ini|setahun|1 tahun|satu tahun)\b/.test(t)) { const y = today.getFullYear(); return R(new Date(y, 0, 1), new Date(y, 11, 31), 'tahun ' + y, 'tahun ini'); }
    if (/\bbulan (lalu|kemarin)\b/.test(t)) { const d = new Date(today.getFullYear(), today.getMonth() - 1, 1); return R(d, new Date(d.getFullYear(), d.getMonth() + 1, 0), monthName(d), 'bulan lalu'); }
    if (/\b(bulan ini|sebulan|1 bulan|satu bulan)\b/.test(t)) { const d = new Date(today.getFullYear(), today.getMonth(), 1); return R(d, new Date(d.getFullYear(), d.getMonth() + 1, 0), monthName(d), 'bulan ini'); }
    for (let i = 0; i < 12; i++) {
      const re = new RegExp('\\b(?:bulan )?(' + MONTHS[i] + '|' + MONTH_ABBR[i] + ')(?: (\\d{4}))?\\b');
      if ((m = re.exec(t))) {
        let y = m[2] ? Number(m[2]) : today.getFullYear();
        if (!m[2] && i > today.getMonth()) y -= 1; // bulan di depan = tahun lalu
        const d = new Date(y, i, 1);
        return R(d, new Date(y, i + 1, 0), monthName(d), m[0]);
      }
    }
    if (/\b(semua|seluruh|keseluruhan|sejak awal|selama ini|sampai sekarang|all time)\b/.test(t)) return { start: '0000-01-01', end: '9999-12-31', label: 'semua waktu', rest: 'semua' };
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return R(d, new Date(d.getFullYear(), d.getMonth() + 1, 0), monthName(d) + ' (bulan ini)', '', true);
  }

  const fmtDay = (s) => { const d = parseYmd(s); return pad(d.getDate()) + ' ' + MONTH_ABBR[d.getMonth()].replace(/^./, (c) => c.toUpperCase()) + ' ' + d.getFullYear(); };

  function answer(text, data, now) {
    now = now || new Date();
    const raw = String(text || '');
    let t = raw.toLowerCase().replace(/[?!,]/g, ' ').replace(/\s+/g, ' ').trim();
    const per = resolvePeriod(t, now);
    t = t.replace(per.rest || '@@', ' ');

    // jenis
    const wantNet = /\b(saldo|sisa uang|sisa duit|selisih|tabungan bersih|berapa tabung)\b/.test(t);
    const type = /\b(pemasukan|pendapatan|income|gaji|penghasilan|uang masuk)\b/.test(t) ? 'income' : 'expense';
    const typeWord = type === 'income' ? 'pemasukan' : 'pengeluaran';

    // aksi
    let act = 'total';
    if (/\b(rata-rata|rata2|rata rata)\b/.test(t)) act = 'avg';
    else if (/\b(terbesar|termahal|tertinggi|paling (mahal|besar|banyak habis))\b/.test(t) && !/\bkategori\b/.test(t)) act = 'top';
    else if (/\b(berapa kali|jumlah transaksi|berapa transaksi|berapa catatan)\b/.test(t)) act = 'count';
    else if (/\b(metode|pembayaran|cara bayar)\b/.test(t)) act = 'methods';
    else if (/\b(per kategori|rincian|rekap|breakdown|kategori)\b/.test(t) || /\bpaling (banyak|boros)\b/.test(t) || /\bterboros\b/.test(t)) act = 'cats';
    else if (/\b(daftar|apa saja|apa aja|list|tampilkan|lihat)\b/.test(t)) act = 'list';

    // filter kategori / kata kunci
    const pool = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    let category = null;
    if (type === 'expense') {
      for (const [name, aliases] of CAT_ALIAS) {
        const hit = aliases.find((a) => t.includes(a));
        if (hit) { category = name; t = t.replace(hit, ' '); break; }
      }
    } else {
      for (const c of INCOME_CATEGORIES) { if (c.name !== 'Lainnya' && t.includes(c.name.toLowerCase())) { category = c.name; t = t.replace(c.name.toLowerCase(), ' '); break; } }
    }
    // metode pembayaran tertentu (mis. "pakai e-wallet")
    let method = null;
    if (act !== 'methods') {
      const MW = [['E-wallet', /\b(e-wallet|ewallet|e wallet|gopay|ovo|dana|shopeepay|linkaja|qris)\b/], ['Tunai', /\b(tunai|cash)\b/], ['Transfer', /\b(transfer)\b/], ['Kartu', /\b(kartu|debit|kredit)\b/]];
      for (const [name, re] of MW) { const mm = re.exec(t); if (mm) { method = name; t = t.replace(mm[0], ' '); break; } }
    }
    const tokens = t.replace(/[^a-z0-9& ]/g, ' ').split(' ').filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
    const groups = tokens.map((w) => CONCEPTS[w] || [w]);

    const inPeriod = data.filter((x) => x.date >= per.start && x.date <= per.end);
    const matchTok = (x, words) => { const h = (x.desc + ' ' + x.category + ' ' + (x.method || '')).toLowerCase(); return words.some((w) => h.includes(w)); };
    const base = inPeriod.filter((x) => (x.type === 'income' ? 'income' : 'expense') === type);
    const rows = base.filter((x) => (!method || x.method === method) && (!category || x.category === category) && groups.every((g) => matchTok(x, g)));

    const subject = [typeWord, category ? 'kategori ' + category : '', method ? 'via ' + method : '', tokens.join(' ')].filter(Boolean).join(' ');
    const when = per.label + (per.label.indexOf('(') < 0 && per.start !== per.end && per.start > '0001' ? ' (' + fmtDay(per.start) + ' – ' + fmtDay(per.end) + ')' : '');
    const lines = [];
    const sorted = rows.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const listRows = (arr, n) => arr.slice(0, n).map((x) => '• ' + fmtDay(x.date).slice(0, 6) + ' · ' + x.desc + ' · ' + rupiah(x.amount));
    const note = tokens.length && tokens.some((w) => CONCEPTS[w]) ? 'Dihitung dari catatan yang deskripsinya mengandung kata seperti: ' + [].concat(...tokens.filter((w) => CONCEPTS[w]).map((w) => CONCEPTS[w])).slice(0, 12).join(', ') + ', dll.' : '';

    if (wantNet) {
      const inc = sum(inPeriod.filter((x) => x.type === 'income'));
      const exp = sum(inPeriod.filter((x) => x.type !== 'income'));
      return { text: ['Saldo ' + when + ': ' + rupiah(inc - exp) + '.', 'Pemasukan ' + rupiah(inc) + ', pengeluaran ' + rupiah(exp) + '.'].join('\n'), count: inPeriod.length };
    }
    if (!rows.length) {
      const other = tokens.length || category ? 'Tidak ada ' + subject + ' pada ' + when + '.' : 'Belum ada ' + typeWord + ' pada ' + when + '.';
      return { text: other + (data.length ? ' Coba periode lain, mis. "bulan lalu" atau "tahun ini".' : ' Belum ada catatan sama sekali. Masuk dengan Google dan catat dulu.'), count: 0 };
    }
    const total = sum(rows);
    const days = per.start > '0001' ? Math.round((parseYmd(per.end) - parseYmd(per.start)) / 864e5) + 1 : 0;
    if (act === 'avg') {
      const spanDays = days && per.end >= ymd(now) && per.start <= ymd(now) ? Math.round((parseYmd(ymd(now)) - parseYmd(per.start)) / 864e5) + 1 : days;
      lines.push('Rata-rata ' + subject + ' ' + when + ':');
      lines.push('• per transaksi: ' + rupiah(total / rows.length));
      if (spanDays) lines.push('• per hari: ' + rupiah(total / spanDays) + ' (' + spanDays + ' hari)');
      lines.push('Total ' + rupiah(total) + ' dari ' + rows.length + ' transaksi.');
    } else if (act === 'top') {
      const top = rows.slice().sort((a, b) => b.amount - a.amount);
      lines.push(subject.replace(/^./, (c) => c.toUpperCase()) + ' terbesar ' + when + ':');
      lines.push(...listRows(top, 5));
    } else if (act === 'count') {
      lines.push('Ada ' + rows.length + ' transaksi ' + subject + ' pada ' + when + ', total ' + rupiah(total) + '.');
    } else if (act === 'methods') {
      lines.push('Metode pembayaran ' + subject + ' ' + when + ' (total ' + rupiah(total) + '):');
      byMethod(rows).forEach((m) => lines.push('• ' + m.method + ': ' + rupiah(m.total) + ' (' + fmtPct(m.pct) + ', ' + m.count + ' transaksi)'));
    } else if (act === 'cats') {
      const cats = byCategory(rows);
      lines.push('Rincian ' + subject + ' ' + when + ' (total ' + rupiah(total) + '):');
      cats.slice(0, 8).forEach((c) => lines.push('• ' + c.category + ': ' + rupiah(c.total) + ' (' + Math.round((c.total / total) * 100) + '%)'));
    } else if (act === 'list') {
      lines.push(subject.replace(/^./, (c) => c.toUpperCase()) + ' ' + when + ' — ' + rows.length + ' transaksi, total ' + rupiah(total) + ':');
      lines.push(...listRows(sorted, 10));
      if (rows.length > 10) lines.push('…dan ' + (rows.length - 10) + ' lainnya.');
    } else {
      lines.push('Total ' + subject + ' ' + when + ': ' + rupiah(total) + ' dari ' + rows.length + ' transaksi.');
      lines.push(...listRows(sorted, 6));
      if (rows.length > 6) lines.push('…dan ' + (rows.length - 6) + ' lainnya.');
    }
    if (note) lines.push(note);
    return { text: lines.join('\n'), count: rows.length, total: total };
  }

  return {
    CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, catsFor, catColor,
    categorize, detectType, detectMethod, parseEntry, parseMessage, parseReceipt, extractDate, extractAmount,
    periodRange, shiftAnchor, previousRange, inRange, ofType, sum, byCategory, byMethod, fmtPct, buckets, bigThreshold,
    rupiah, periodLabel, ymd, parseYmd, addDays, isQuestion, answer,
  };
});
