# Deploy Frontend LitePOS — Vercel

Backend sudah di **Choreo** + database **Supabase**. Panduan ini untuk deploy **React/Vite** ke **Vercel**.

---

## URL API Choreo Anda

Dari Choreo → **Endpoints** → **Public**, salin URL dasar (tanpa path `/api`):

```text
https://0319cc41-dc56-488f-a7fc-d7a9579bc499-dev.e1-us-east-azure.choreoapis.dev/default/server/v1.0
```

**Environment variable untuk Vercel** (wajib diakhiri `/api`):

```env
VITE_API_URL=https://0319cc41-dc56-488f-a7fc-d7a9579bc499-dev.e1-us-east-azure.choreoapis.dev/default/server/v1.0/api
```

Tes backend sebelum deploy frontend:

```text
https://0319cc41-dc56-488f-a7fc-d7a9579bc499-dev.e1-us-east-azure.choreoapis.dev/default/server/v1.0/api/health
```

Harus JSON: `{"status":"ok",...}`

> Jika URL Public Choreo Anda berbeda, ganti host/path di `VITE_API_URL` sesuai endpoint di dashboard.

---

## 1. Push repo ke GitHub

Pastikan folder `client/` dan `client/vercel.json` sudah ter-commit:

```bash
git add client/
git commit -m "chore: prepare Vercel frontend deploy"
git push origin main
```

---

## 2. Buat project di Vercel

1. Buka [vercel.com](https://vercel.com) → login → **Add New…** → **Project**
2. **Import** repository GitHub `maspoint` (atau nama repo Anda)
3. Di **Configure Project**, set:

| Setting | Nilai |
|---------|--------|
| **Framework Preset** | Vite |
| **Root Directory** | `client` ← klik **Edit**, pilih folder `client` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `dist` (default) |
| **Install Command** | `npm ci` |

4. Buka **Environment Variables** → tambahkan:

| Name | Value | Environment |
|------|--------|-------------|
| `VITE_API_URL` | `https://0319cc41-dc56-488f-a7fc-d7a9579bc499-dev.e1-us-east-azure.choreoapis.dev/default/server/v1.0/api` | Production, Preview, Development |

5. Klik **Deploy**

Build pertama ~1–2 menit. URL production: `https://nama-proyek.vercel.app`

---

## 3. Update CORS di Choreo (penting)

Setelah dapat URL Vercel, buka **Choreo** → component **LitePOS REST API** → **Deploy** → **Configure & Deploy** → **Environment Variables**:

| Key | Nilai |
|-----|--------|
| `CLIENT_URL` | `https://maspoint.vercel.app` |

**Disarankan pakai `https://` penuh.** Jika hanya `maspoint.vercel.app`, server akan menormalisasi ke `https://` (setelah redeploy kode terbaru). Tanpa slash di akhir.

**Redeploy** backend di Choreo (Development) agar CORS aktif.

Opsional — untuk preview branch Vercel:

```env
CORS_ORIGINS=https://nama-proyek.vercel.app,https://nama-proyek-git-main-username.vercel.app
```

---

## 4. Verifikasi setelah live

- [ ] Buka URL Vercel → halaman **Login** tampil
- [ ] Login `owner` / password dari seeds (atau user Anda)
- [ ] Tidak ada error **CORS** di DevTools → Network
- [ ] Kasir / laporan owner bisa load data
- [ ] Gambar produk/QRIS (jika ada upload) — URL mengarah ke Choreo + path `/uploads/...`

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Build Vercel gagal | Root Directory harus **`client`**; cek log build |
| API `404` / HTML di response API | `VITE_API_URL` salah — harus include path Choreo `/default/server/v1.0/api` |
| CORS blocked | Set `CLIENT_URL` di Choreo = URL Vercel exact, lalu redeploy backend |
| Login gagal, network error | Buka `VITE_API_URL` tanpa `/auth` → harus base API; cek `/api/health` di browser |
| Route 404 saat refresh `/kasir` | `client/vercel.json` sudah ada rewrite SPA — redeploy |
| Env tidak kebaca | `VITE_*` hanya dibaca saat **build** — ubah env di Vercel lalu **Redeploy** |

---

## Redeploy setelah ubah env

Di Vercel → **Deployments** → ⋮ pada deployment terbaru → **Redeploy**  
(atau push commit baru ke `main`)

---

## Ringkasan arsitektur

```
Browser → Vercel (React)
            ↓  VITE_API_URL
         Choreo (Docker API) → Supabase PostgreSQL
```

Langkah berikutnya opsional: custom domain di Vercel + Production environment di Choreo.
