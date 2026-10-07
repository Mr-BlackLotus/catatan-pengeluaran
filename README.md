# Catatan Pengeluaran

Web app gratis untuk mencatat pengeluaran. Data disimpan di Google Sheets milik Anda,
tampilan web di-host gratis lewat GitHub Pages.

- Catat lewat chat: `makan siang 25rb`, `bensin 50.000 kemarin`, `netflix 54000 tgl 3`
- Catat lewat foto struk (dibaca langsung di browser, foto bukti ikut tersimpan di Drive)
- Otomatis dikelompokkan: Makan & Minum, Transportasi, Kebutuhan Harian, Hiburan, Tagihan & Utilitas, Kesehatan, Pendidikan, Belanja, Donasi & Sosial, Lainnya
- Pantau per minggu / bulan / tahun / semua, dengan grafik dan perbandingan periode sebelumnya
- Peringatan pengeluaran besar (batas otomatis dari riwayat, bisa diatur manual)

## Pasang (sekali saja, ±5 menit)

### 1. Backend di Google Sheets
1. Buka spreadsheet Anda → **Ekstensi → Apps Script**.
2. Hapus isi editor, tempel seluruh isi `apps-script/Code.gs`.
3. Ganti `TOKEN` di baris atas dengan kode rahasia buatan Anda (campuran huruf dan angka, minimal 16 karakter).
4. Pilih fungsi **setup** → **Jalankan** → izinkan akses (akan membuat sheet `Pengeluaran` dan `Ringkasan`).
5. **Deploy → Deployment baru → Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Siapa yang memiliki akses: **Siapa saja**
   - Salin **URL Aplikasi Web** (berakhiran `/exec`).

> Setiap kali Anda mengubah `Code.gs`, buat **deployment baru** (atau "Kelola deployment → versi baru") agar perubahan berlaku.

### 2. Web
Buka situs GitHub Pages Anda → ikon ⚙ → isi **URL Web App** dan **TOKEN** → Simpan.
Status di atas akan berubah menjadi "Terhubung ke Google Sheets".

## Keamanan
Situs ini publik, tetapi data hanya bisa dibaca/ditulis oleh yang punya TOKEN. TOKEN disimpan di browser Anda
(tidak ada di kode GitHub). Jangan membagikan URL Web App bersama TOKEN-nya.

## Catatan
- Pembacaan foto (OCR) bisa meleset, jadi hasilnya selalu ditampilkan untuk diperiksa sebelum disimpan.
- Tanpa koneksi ke Drive, aplikasi berjalan dalam mode lokal (data di browser) dan bisa dikirim ke Sheets nanti.
