# Panduan Deploy DuitIn (Bahasa Indonesia)

## Kenapa muncul "This page doesn't exist" di Vercel?

Deployment Vercel Anda berstatus **Ready**, tetapi halaman 404 karena
**Vercel Drop hanya meng-upload file apa adanya TANPA proses build**.
Aplikasi DuitIn adalah proyek **Next.js** yang wajib di-build dulu
(`next build`) supaya halaman & API jalan. Solusinya: deploy lewat
**GitHub** (atau CLI), bukan drag-and-drop.

Proyek sudah disiapkan agar lulus build di Vercel:

- `postinstall: prisma generate` (client Prisma dibuat otomatis saat install)
- Database memakai **driver adapter libsql** → bisa SQLite file (lokal/VPS)
  maupun **Turso** (serverless/Vercel) hanya dengan mengganti `DATABASE_URL`
- Production build sudah diuji lulus (`next build` ✓)

---

## Cara A — Vercel + Turso (gratis, direkomendasikan)

### 1. Buat database Turso (2 menit)

```bash
# install CLI: https://docs.turso.tech/cli/introduction
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup          # daftar gratis (bisa login GitHub)
turso db create duitin     # buat database
turso db show duitin --url # → DATABASE_URL
turso db tokens create duitin  # → DATABASE_AUTH_TOKEN
```

### 2. Buat tabel di Turso (SEKARANG OPSIONAL)

> Kabar baik: aplikasi versi terbaru **membuat tabelnya sendiri**
> secara otomatis pada request pertama (auto-migration), jadi
> langkah ini boleh dilewati. Tetap disarankan untuk verifikasi.

```bash
# di folder proyek, jalankan dua perintah ini:

# a) buat file SQL dari schema Prisma (offline, tanpa koneksi)
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > turso-schema.sql

# b) kirim ke Turso (ganti "duitin" dengan nama db Anda)
turso db shell duitin < turso-schema.sql
```

**Verifikasi** — daftar tabel harus muncul (User, Wallet, Category, dst.):

```bash
turso db shell duitin "SELECT name FROM sqlite_master WHERE type='table';"
```

### 3. Upload kode ke GitHub

```bash
# di folder proyek (yang sudah ada file .env.example & DEPLOY-ID.md ini)
git init && git add -A && git commit -m "DuitIn siap deploy"
git branch -M main
git remote add origin https://github.com/USERNAME/duitin.git
git push -u origin main
```

> Hapus dulu `node_modules` dan `.next` jika ikut ter-zip, atau biarkan —
> sudah dikecualikan lewat `.gitignore`.

### 4. Import ke Vercel

1. vercel.com → **Add New… → Project → Import** repo GitHub Anda
2. Framework Preset terdeteksi otomatis: **Next.js** (jangan ubah)
3. Buka **Environment Variables**, tambahkan:
   - `DATABASE_URL` = `libsql://duitin-xxx.turso.io`
   - `DATABASE_AUTH_TOKEN` = token dari langkah 1
4. **Deploy** → tunggu build selesai (~1–2 menit)
5. Buka URL `https://duitin-xxx.vercel.app` → aplikasi tampil ✓

### 5. Verifikasi

- `https://domain-anda/.well-known/assetlinks.json` → JSON fingerprint ✓
- Catat transaksi → refresh → data tersimpan (database Turso) ✓

---

## Cara B — Railway / Render (tanpa ubah apa pun)

Kalau tidak mau repot dengan Turso: hosting dengan **disk persisten**
menjalankan SQLite file langsung.

1. Push ke GitHub (langkah 2 di atas)
2. railway.app → **New Project → Deploy from GitHub repo**
3. Add **Volume** (mis. mount di `/data`), set variable:
   - `DATABASE_URL` = `file:/data/custom.db`
4. Deploy → domain `xxx.up.railway.app` langsung jalan

---

## Setelah live — kaitkan ke APK & Play Store

1. **Tes di HP**: buka domain via Chrome → "Tambahkan ke layar utama" (PWA)
2. **Rebuild APK/AAB** agar TWA membuka domain Anda:

   ```bash
   # edit "host" di twa/twa-manifest.json → domain Anda, lalu:
   cd twa
   bubblewrap update && bubblewrap build
   ```

   Kemudian pasang ulang `DuitIn-vX.X.X.apk` di HP.

3. **Play Store**: upload `DuitIn-vX.X.X-release.aab` (panduan lengkap ada
   di `Panduan-Publish-Duitin-PlayStore.pdf`).


## Troubleshooting umum (WSL / Windows)

| Pesan error | Penyebab & solusi |
|---|---|
| `ENOENT ... package.json` | `npm install` dijalankan di folder salah. Masuk dulu ke folder proyek: `cd duitin`, cek `ls` — `package.json` harus terlihat. |
| `Cannot find module '@prisma/fetch-engine'` saat `npm install` | Pohon paket npm rusak/terpotong. Jalankan: `rm -rf node_modules package-lock.json` lalu `npm cache clean --force` lalu `npm install` lagi. Zip resmi ini sudah menyertakan `package-lock.json` yang teruji — pastikan file itu ada. |
| Masih gagal di `/mnt/c/...` | NTFS via WSL kadang bermasalah dengan symlink. Pindahkan proyek ke filesystem WSL: `cp -r duitin ~/duitin && cd ~/duitin` lalu `npm install` di sana. |
| Prisma menawarkan versi 8 | Jawab **N**. Proyek ini memakai Prisma 6; dengan `package-lock.json` npx otomatis memakai versi lokal. |
| `P1012: the URL must start with the protocol 'file:'` | Anda menjalankan `npx prisma db push` dengan `DATABASE_URL=libsql://...`. Prisma CLI memang tidak mendukung itu — gunakan cara 2 langkah di atas (`prisma migrate diff` + `turso db shell < file.sql`). |
| `ConnectionFailed ... ./db/custom.db: 14` saat build | Folder `db/` tidak ada (zip tidak memuat file database). Zip resmi kini menyertakan `db/.gitkeep` agar foldernya terbentuk. Perbaikan cepat di folder lama: `mkdir -p db` lalu build ulang. |
| `The URL "undefined" is not valid` (URL_INVALID) | Sudah diperbaiki di kode versi terbaru (adapter v7 kini diberi objek konfigurasi, bukan instance client). Pastikan memakai zip terbaru; `.env` lokal pun tidak lagi wajib. |

## Catatan fitur AI

Fitur **Asisten AI** membutuhkan kredensial Z.ai (variabel `ZAI_API_KEY`).
Tanpa kredensial tersebut: aplikasi **tetap berfungsi normal** — pencatatan
via teks memakai parser lokal (regex), hanya jawaban chat AI yang nonaktif.
