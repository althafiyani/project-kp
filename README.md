# Virtual Photobooth MyCard

Aplikasi photobooth virtual berbasis [Next.js](https://nextjs.org) + PostgreSQL.
Vendor membuat event lewat dashboard, tamu membuka link/QR Code event untuk berfoto, memilih frame, dan merekam pesan suara.

## Kebutuhan

| Perangkat | Versi | Catatan |
| --- | --- | --- |
| Node.js | 20.6 atau lebih baru | Skrip `migrate` memakai `node --env-file` |
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

## 4. Menjalankan

```bash
npm run dev
```
