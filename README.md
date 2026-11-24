# Virtual Photobooth MyCard

Aplikasi photobooth virtual berbasis [Next.js](https://nextjs.org) + PostgreSQL.
Vendor membuat event lewat dashboard, tamu membuka link/QR Code event untuk berfoto, memilih frame, dan merekam pesan suara.

## Kebutuhan

| Perangkat | Versi | Catatan |
| --- | --- | --- |
| Node.js | 20.6 atau lebih baru | Skrip `migrate` dan `seed` memakai `node --env-file` |
| PostgreSQL | 13 atau lebih baru | Skema memakai `gen_random_uuid()` |
| npm | bawaan Node.js | |

## 1. Instalasi

```bash
npm install
```

## 2. Konfigurasi `.env.local`

Buat file `.env.local` di root proyek (file ini sudah di-ignore git, jangan di-commit):

```env
DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@localhost:5432/photobooth
JWT_SECRET=isi-dengan-string-acak-minimal-32-karakter
APP_URL=https://localhost:3000
```

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | Alamat koneksi PostgreSQL |
| `JWT_SECRET` | Ya | Kunci penanda sesi login. Minimal 16 karakter, sebaiknya 32+ karakter acak |
| `APP_URL` | Tidak | Alamat cadangan untuk link event dan isi QR Code. Urutan yang dipakai: (1) alamat yang sedang dipakai browser kalau itu alamat publik, (2) `.tunnel-url` dari `npm run tunnel`, (3) `APP_URL`. Dengan `npm run tunnel` variabel ini boleh dikosongkan |

Cara membuat `JWT_SECRET` acak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Migrasi database

### 3.1 Buat database (sekali saja)

Pilih salah satu.

Lewat `psql`:

```bash
psql -U postgres -f sql/create_db.sql
```

Atau lewat klien SQL (DataGrip, DBeaver, SQLTools di VS Code, dll.): konek ke database `postgres`, lalu jalankan baris ini sendirian:

```sql
CREATE DATABASE photobooth;
```

### 3.2 Jalankan migrasi

```bash
npm run migrate
```

Skrip [scripts/migrate.mjs](scripts/migrate.mjs) menjalankan semua file `sql/migrations/*.sql` yang belum pernah dijalankan, berurutan menurut nama file. Riwayatnya dicatat di tabel `schema_migrations`, jadi **aman dijalankan berulang kali**. Setiap file berjalan dalam satu transaksi: jika gagal, perubahan file itu dibatalkan dan proses berhenti.

Contoh keluaran:

```
applied: 001_init.sql
1 migrasi dijalankan.
```

Menjalankannya lagi:

```
Tidak ada migrasi baru.
```

Tabel yang dibuat: `users`, `events`, `frames`, `submissions`, `upload_logs`.

### 3.3 Menambah migrasi baru

Buat file baru di `sql/migrations/` dengan nomor urut berikutnya, lalu jalankan `npm run migrate`:

```
sql/migrations/002_nama_perubahan.sql
```

Jangan mengedit file migrasi yang sudah pernah dijalankan; buat file baru.

> **Catatan:** [sql/schema.sql](sql/schema.sql) adalah skema lengkap untuk dijalankan manual. Pakai **salah satu**: `npm run migrate` **atau** `schema.sql`. Menjalankan keduanya akan gagal karena tabel sudah ada.

## 4. Mengisi data awal

### 4.1 Seeder demo (development)

```bash
npm run seed
```

Skrip [scripts/seed.mjs](scripts/seed.mjs) mengisi:

- akun vendor demo: `demo@photobooth.test` / `demo12345`
- satu event aktif: **Pesta Pernikahan Demo** (slug `pernikahan-demo`)

Seeder memakai `ON CONFLICT DO NOTHING`, jadi **aman dijalankan berulang kali** dan data yang sudah ada tidak diubah.

Seeder **menolak berjalan** jika `NODE_ENV=production`, supaya akun demo dengan password yang diketahui publik tidak masuk ke server produksi.

### 4.2 Membuat akun vendor sungguhan

Untuk produksi, atau jika tidak ingin memakai akun demo:

```bash
node --env-file=.env.local scripts/create-vendor.mjs
```

Skrip akan menanyakan nama, email, dan password (minimal 8 karakter).

### 4.3 Urutan lengkap dari nol

```bash
npm install
psql -U postgres -f sql/create_db.sql
npm run migrate
npm run seed
```

## 5. Menjalankan dengan HTTPS

HTTPS penting di proyek ini karena:

- Browser hanya mengizinkan akses **kamera dan mikrofon** di halaman HTTPS (atau `localhost`). Tamu yang membuka link event dari HP lewat `http://192.168.x.x:3000` tidak akan bisa memakai kamera.
- Cookie login (`pb_session`) diberi flag `secure` saat `NODE_ENV=production`, sehingga di produksi login hanya bekerja lewat HTTPS.

Pilih salah satu cara di bawah sesuai kebutuhan.

### Opsi A: Development lokal dengan HTTPS bawaan Next.js

```bash
npx next dev --experimental-https
```

Next.js membuat sertifikat lokal otomatis dan menyimpannya di folder `certificates/` (sudah ada di `.gitignore`). Buka [https://localhost:3000](https://localhost:3000).

Jika browser memperingatkan sertifikat tidak tepercaya, pasang root CA lokal dengan [mkcert](https://github.com/FiloSottile/mkcert):

```bash
mkcert -install
```

Untuk memakai sertifikat sendiri:

```bash
npx next dev --experimental-https --experimental-https-key ./certificates/localhost-key.pem --experimental-https-cert ./certificates/localhost.pem
```

Keterbatasan: sertifikat ini hanya dipercaya di komputer ini. HP tamu akan menampilkan peringatan sertifikat dan kamera tidak bisa dipakai. Untuk tes dari HP, pakai Opsi B.

Jika mengakses dari alamat lain (IP LAN), daftarkan di `allowedDevOrigins` pada [next.config.mjs](next.config.mjs).

### Opsi B: Tunnel Cloudflare (HTTPS tepercaya, cocok untuk tes dengan HP)

Tidak perlu sertifikat sendiri. Jalankan app seperti biasa, lalu buka tunnel di terminal lain:

```bash
npm run dev
```

```bash
npm run tunnel
```

`npm run tunnel` menjalankan cloudflared (lokasi bawaan `C:\Program Files (x86)\cloudflared\cloudflared.exe`, ubah lewat variabel `CLOUDFLARED_PATH` kalau beda), lalu mencatat alamat acak `https://xxxx.trycloudflare.com` ke file `.tunnel-url`. Link event dan QR Code di dashboard otomatis memakai alamat itu, jadi **tidak perlu mengisi `APP_URL` dan tidak perlu restart server** setiap alamat berubah. Domain `*.trycloudflare.com` sudah terdaftar di `allowedDevOrigins`. File `.tunnel-url` dihapus sendiri saat tunnel dihentikan (Ctrl + C).

Kalau lebih suka menjalankan cloudflared sendiri (`cloudflared tunnel --url http://localhost:3000`), buka dashboard lewat alamat tunnel itu, atau isi `APP_URL`.

### Opsi C: Produksi di server sendiri (reverse proxy)

Jalankan Next.js di belakang reverse proxy yang menangani HTTPS dan sertifikat. Contoh dengan [Caddy](https://caddyserver.com), yang mengurus sertifikat Let's Encrypt otomatis:

1. Arahkan DNS domain (mis. `photobooth.contoh.com`) ke IP server, dan buka port 80 dan 443.
2. Siapkan `.env.local` di server:

   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/photobooth
   JWT_SECRET=string-acak-panjang
   APP_URL=https://photobooth.contoh.com
   ```

3. Build, migrasi, dan jalankan:

   ```bash
   npm ci
   npm run migrate
   npm run build
   npm run start
   ```

   Jangan jalankan `npm run seed` di produksi. Buat akun lewat `scripts/create-vendor.mjs`.

4. `Caddyfile`:

   ```
   photobooth.contoh.com {
       reverse_proxy localhost:3000
   }
   ```

   ```bash
   caddy run --config Caddyfile
   ```

Proxy lain (nginx, dll.) juga bisa, asalkan meneruskan header `Host`, `X-Forwarded-Host`, dan `X-Forwarded-Proto: https`. [lib/url.js](lib/url.js) memakainya untuk membentuk alamat.

Catatan produksi: foto, frame, dan audio disimpan di folder `uploads/` di disk server ([lib/storage.js](lib/storage.js)). Backup folder itu bersama database. Jika deploy ke Vercel, disknya sementara, sehingga isi `lib/storage.js` harus diganti memakai Vercel Blob.

## 6. Alamat penting

| Alamat | Fungsi |
| --- | --- |
| `/login` | Login vendor |
| `/dashboard` | Dashboard vendor: kelola event, frame, pesan pembuka |
| `/event/[slug]` | Halaman tamu untuk satu event, contoh `/event/pernikahan-demo` |

## 7. Perintah ringkas

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server development (HTTP) |
| `npx next dev --experimental-https` | Server development (HTTPS) |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run migrate` | Jalankan migrasi database yang belum diterapkan |
| `npm run seed` | Isi data demo (hanya non-produksi) |
| `npm run lint` | Cek kode dengan ESLint |

## 8. Masalah umum

| Gejala | Penyebab dan solusi |
| --- | --- |
| `JWT_SECRET belum diisi` | Isi `JWT_SECRET` (minimal 16 karakter) di `.env.local`, lalu restart server |
| `password authentication failed` / `ECONNREFUSED` saat migrate | Periksa `DATABASE_URL` dan pastikan PostgreSQL berjalan |
| `database "photobooth" does not exist` | Jalankan langkah 3.1 terlebih dahulu |
| `relation "users" already exists` | `schema.sql` sudah pernah dijalankan manual. Hapus tabelnya lalu pakai `npm run migrate`, atau lanjutkan tanpa migrasi |
| `Seed demo tidak boleh dijalankan di production` | `NODE_ENV=production` aktif. Pakai `create-vendor.mjs` |
| Login berhasil tetapi langsung keluar lagi di produksi | Situs diakses lewat HTTP. Cookie `secure` hanya dikirim lewat HTTPS |
| Kamera/mikrofon tidak bisa dipakai di HP | Halaman dibuka lewat HTTP biasa. Pakai HTTPS (Opsi B atau C) |
| QR Code mengarah ke alamat yang salah | Jalankan `npm run tunnel` (alamat ikut otomatis), atau buka dashboard lewat alamat HTTPS yang dipakai tamu, atau isi `APP_URL` lalu restart server |
