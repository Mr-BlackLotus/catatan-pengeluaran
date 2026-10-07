# Catatan Keuangan

Web app gratis untuk mencatat pengeluaran dan pemasukan. Data disimpan di Google Sheets milik Anda,
tampilan web di-host gratis lewat GitHub Pages.

- Tiga tab: **Ringkasan** (saldo, rasio tabung, pemasukan vs pengeluaran), **Pengeluaran**, **Pemasukan**
- Catat lewat chat: `makan siang 25rb`, `bensin 50.000 kemarin`, `gaji 8jt`, `beli saham 500rb`
- Catat lewat foto struk (dibaca di browser, foto bukti ikut tersimpan di Drive)
- Kategori otomatis. Pengeluaran: Makan & Minum, Transportasi, Kebutuhan Harian, Hiburan, Tagihan & Utilitas, Kesehatan, Pendidikan, Belanja, Donasi & Sosial, Investasi, Lainnya. Pemasukan: Gaji, Bonus & THR, Usaha & Freelance, Hasil Investasi, Hadiah & Transfer, Lainnya
- Metode pembayaran terdeteksi otomatis (Tokopedia, Shopee, GoPay, OVO, Dana, QRIS → E-wallet)
- Pantau per minggu / bulan / tahun / semua, dengan grafik dan perbandingan periode sebelumnya
- Peringatan pengeluaran besar (batas otomatis dari riwayat, bisa diatur manual; investasi tidak dihitung)
- Mode terang dan gelap (tombol di pojok kanan atas)

## Pasang (sekali saja, ±5 menit)

### 1. Backend di Google Sheets
1. Buka editor Apps Script (spreadsheet → **Ekstensi → Apps Script**).
2. Hapus isi editor, tempel seluruh isi `apps-script/Code.gs`.
3. Ganti `TOKEN` di baris atas dengan kode rahasia buatan Anda (campuran huruf dan angka, minimal 16 karakter).
4. Pilih fungsi **setup** → **Run** → izinkan akses (membuat sheet `Pengeluaran` dan `Ringkasan`).
5. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone**. Salin **Web app URL** (berakhiran `/exec`).

> Memperbarui `Code.gs` yang sudah pernah di-deploy: tempel kode baru, atur ulang `TOKEN`, jalankan `setup`,
> lalu **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy**. URL tidak berubah.
> Sheet lama otomatis mendapat kolom `Tipe`; data lama dianggap pengeluaran.

### 2. Web
Buka situs GitHub Pages Anda → ikon ⚙ → isi **URL Web App** dan **TOKEN** → **Tes koneksi** → Simpan.

## Keamanan
Situs ini publik, tetapi data hanya bisa dibaca/ditulis oleh yang punya TOKEN. TOKEN disimpan di browser Anda
(tidak ada di kode GitHub). Jangan membagikan URL Web App bersama TOKEN-nya.

## Catatan
- Pembacaan foto (OCR) bisa meleset, jadi hasilnya selalu ditampilkan untuk diperiksa sebelum disimpan.
- Tanpa koneksi ke Drive, aplikasi berjalan dalam mode lokal (data di browser) dan bisa dikirim ke Sheets nanti.
