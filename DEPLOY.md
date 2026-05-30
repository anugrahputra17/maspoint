# Deploy LitePOS — Vercel (Frontend) + Render (Backend)

## Apakah perlu GitHub Actions?

| Kebutuhan | GitHub Actions? |
|-----------|-----------------|
| **Auto-deploy** frontend ke Vercel | **Tidak** — connect repo di Vercel, deploy otomatis tiap push |
| **Auto-deploy** backend ke Render | **Tidak** — connect repo di Render, deploy otomatis tiap push |
| **Lint / test** sebelum merge | **Opsional** — workflow `.github/workflows/ci.yml` sudah disiapkan |

**Kesimpulan:** untuk deploy saja, cukup push ke GitHub + hubungkan Vercel & Render. GitHub Actions hanya berguna sebagai **quality gate** (CI), bukan untuk menggantikan deploy platform.

---

## Arsitektur

```
[Browser] → Vercel (React/Vite)  →  Render Web Service (Express API)
                                        ↓
                                 Render PostgreSQL
```

---

## 1. Persiapan GitHub

```bash
git init
git add .
git commit -m "chore: prepare deployment configs"
git branch -M main
git remote add origin https://github.com/USERNAME/maspoint.git
git push -u origin main
```

Pastikan **tidak** commit file `server/.env` (sudah di `.gitignore`).

---

## 2. Database (Render PostgreSQL)

1. Deploy Blueprint dari `render.yaml` **atau** buat manual:
   - **PostgreSQL** → plan Free → catat **Internal/External Database URL**
2. Buka **psql** atau GUI (TablePlus, DBeaver) ke database Render
3. Jalankan berurutan:
   - `database/schema.sql`
   - `database/seeds.sql` (opsional, data demo)

---

## 3. Backend — Render

### Opsi A: Blueprint (`render.yaml`)

1. Render → **New** → **Blueprint**
2. Connect repo GitHub
3. Set environment variable **`CLIENT_URL`** = URL Vercel Anda (setelah langkah 4)
   - Contoh: `https://litepos.vercel.app`
4. Deploy

### Opsi B: Web Service manual

| Setting | Nilai |
|---------|--------|
| Root Directory | `server` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

**Environment Variables:**

| Key | Nilai |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | dari Render Postgres |
| `JWT_SECRET` | string acak panjang (min. 32 karakter) |
| `CLIENT_URL` | URL Vercel (tanpa slash di akhir) |

**URL API:** `https://litepos-api.onrender.com` (sesuaikan nama service)

Tes: `GET https://YOUR-API.onrender.com/api/health` → `{ "status": "ok" }`

### Catatan upload gambar

Folder `server/uploads` di Render **tidak persisten** (hilang saat redeploy). Untuk production jangka panjang, pertimbangkan S3/Cloudinary. Untuk MVP, upload gambar/QRIS bisa tetap dipakai sampai redeploy.

---

## 4. Frontend — Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import repo GitHub
2. **Root Directory:** `client`
3. Framework: **Vite** (terdeteksi otomatis dari `client/vercel.json`)
4. **Environment Variables** (Production + Preview):

| Key | Nilai |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-API.onrender.com/api` |

> Penting: `VITE_API_URL` **harus** diakhiri `/api`.

5. Deploy

`vercel.json` sudah mengatur **SPA rewrite** (semua route → `index.html`).

### Preview deployment

Untuk branch preview, tambahkan juga `CLIENT_URL` di Render atau gunakan `CORS_ORIGINS`:

```env
CORS_ORIGINS=https://litepos.vercel.app,https://litepos-git-feature-xxx.vercel.app
```

---

## 5. Urutan deploy yang disarankan

1. Deploy **PostgreSQL** + jalankan schema
2. Deploy **backend** Render → dapat URL API
3. Set `VITE_API_URL` di Vercel → deploy **frontend**
4. Set `CLIENT_URL` di Render ke URL Vercel → **manual redeploy** backend (agar CORS aktif)

---

## 6. GitHub Actions (opsional)

Workflow: `.github/workflows/ci.yml`

- **client:** `npm ci` → `lint` → `build`
- **server:** `npm ci` → `npm test`

Aktif otomatis saat push/PR ke `main` / `master`. Tidak meng-deploy ke Vercel/Render.

---

## 7. Checklist setelah live

- [ ] Login owner/kasir berhasil
- [ ] `/api/health` OK
- [ ] Transaksi kasir tersimpan
- [ ] Gambar produk/QRIS load (jika pakai upload)
- [ ] Tidak ada error CORS di browser console

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| CORS error | Pastikan `CLIENT_URL` di Render = origin Vercel persis (https, tanpa `/`) |
| API 404 di Vercel | Normal — API hanya di Render. Cek `VITE_API_URL` |
| DB connection error | Pastikan `DATABASE_URL` benar; Render Postgres butuh SSL (sudah di `db.js`) |
| Build Vercel gagal | Pastikan Root Directory = `client` |
| Render sleep (free) | Request pertama lambat ~30–60 detik |
