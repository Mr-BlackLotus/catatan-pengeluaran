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

  return {
    CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, catsFor, catColor,
    categorize, detectType, detectMethod, parseEntry, parseMessage, parseReceipt, extractDate, extractAmount,
    periodRange, shiftAnchor, previousRange, inRange, ofType, sum, byCategory, buckets, bigThreshold,
    rupiah, periodLabel, ymd, parseYmd, addDays,
  };
});
