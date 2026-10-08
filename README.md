# Catatan Keuangan

Web app gratis untuk mencatat pengeluaran dan pemasukan. Setiap pengguna **masuk dengan akun Google-nya sendiri**,
dan datanya tersimpan di spreadsheet di **Google Drive pengguna itu sendiri**. Tampilan web di-host gratis lewat GitHub Pages.

## Untuk pengguna (cukup 3 langkah)

1. Buka link aplikasi yang dibagikan.
2. Klik **Masuk dengan Google**, pilih akun, lalu **izinkan** akses Google Drive.
3. Selesai. Spreadsheet "Catatan Keuangan" otomatis dibuat di Drive Anda. Tinggal catat.

Aplikasi hanya meminta izin `drive.file`: ia hanya bisa melihat file yang **ia buat sendiri**, bukan seluruh isi Drive Anda.
Data tidak melewati server pihak lain; browser Anda langsung berbicara dengan Google.

## Fitur

- Tiga tab: **Ringkasan** (saldo, rasio tabung, pemasukan vs pengeluaran), **Pengeluaran**, **Pemasukan**
- Catat lewat chat: `makan siang 25rb`, `bensin 50.000 kemarin`, `gaji 8jt`, `beli saham 500rb`
- Catat lewat foto struk (dibaca di browser, foto bukti ikut tersimpan di Drive pengguna)
- Kategori otomatis. Pengeluaran: Makan & Minum, Transportasi, Kebutuhan Harian, Hiburan, Tagihan & Utilitas, Kesehatan, Pendidikan, Belanja, Donasi & Sosial, Investasi, Lainnya. Pemasukan: Gaji, Bonus & THR, Usaha & Freelance, Hasil Investasi, Hadiah & Transfer, Lainnya
- Metode pembayaran terdeteksi otomatis (Tokopedia, Shopee, GoPay, OVO, Dana, QRIS → E-wallet)
- Pantau per minggu / bulan / tahun / semua, dengan grafik dan perbandingan periode sebelumnya
- Peringatan pengeluaran besar (batas otomatis dari riwayat, bisa diatur manual; investasi tidak dihitung)
- Mode terang dan gelap

## Untuk pemilik aplikasi: aktifkan login Google (sekali saja, ±10 menit)

Login Google membutuhkan **OAuth Client ID** milik Anda. Nilainya bukan rahasia dan memang ditaruh di kode publik.

1. Buka <https://console.cloud.google.com/> dan buat proyek baru (mis. "Catatan Keuangan").
2. **APIs & Services → Library**: aktifkan **Google Sheets API** dan **Google Drive API**.
3. **Google Auth Platform** (atau "OAuth consent screen") → **Get started**:
   - App name: `Catatan Keuangan`, isi email dukungan dan email kontak.
   - Audience: **External**.
4. Menu **Data Access** → **Add or remove scopes**, tambahkan: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, dan `.../auth/drive.file`. Simpan.
5. Menu **Audience** (status publikasi):
   - **Testing**: hanya akun yang Anda daftarkan di *Test users* (maksimal 100) yang bisa masuk. Paling mudah untuk beberapa orang. Tambahkan email setiap teman di sini.
   - **In production** (*Publish app*): siapa saja yang punya link bisa masuk. Karena hanya memakai scope `drive.file` (non-sensitif), tidak perlu tinjauan keamanan, tetapi Google bisa menampilkan peringatan "aplikasi belum diverifikasi" sampai Anda mengajukan verifikasi.
6. Menu **Clients → Create client** → tipe **Web application**:
   - **Authorized JavaScript origins**: `https://mr-blacklotus.github.io` (tanpa garis miring di akhir dan tanpa nama repo).
   - Redirect URI tidak perlu diisi.
7. Salin **Client ID** (berakhiran `.apps.googleusercontent.com`), lalu tempel di `config.js`:

   ```js
   window.APP_CONFIG = {
     googleClientId: '1234567890-abc.apps.googleusercontent.com',
   };
   ```

   Commit perubahan itu. GitHub Pages akan memperbaruinya dalam 1-2 menit.

Selama `googleClientId` kosong, tombol "Masuk dengan Google" tidak muncul.

## Pengguna lama (Apps Script)

Versi awal aplikasi ini memakai Google Apps Script. Bila Anda masih memakainya, aplikasi tetap membaca data lama.
Untuk pindah, buka ⚙ → **Masuk dengan Google**; aplikasi menawarkan menyalin catatan yang sedang tampil ke Drive Anda.
Berkas `apps-script/Code.gs` hanya disimpan sebagai arsip dan tidak dibutuhkan pengguna baru.

## Catatan

- Pembacaan foto (OCR) bisa meleset, jadi hasilnya selalu ditampilkan untuk diperiksa sebelum disimpan.
- Tanpa login, aplikasi berjalan dalam mode lokal (data di browser) dan bisa disalin ke Drive saat Anda masuk.
- Sesi Google berlaku sekitar 1 jam. Jika berakhir, aplikasi menampilkan tombol **Sambungkan lagi**; catatan tidak hilang.
- Jangan mengubah nama tab `Pengeluaran` di spreadsheet; aplikasi mencarinya dengan nama itu.
