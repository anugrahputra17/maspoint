# Deploy Backend LitePOS — Supabase + Choreo (Docker)

Panduan langkah demi langkah untuk deploy **backend** ke **Choreo Docker Service** dengan database **Supabase** (sudah selesai).

---

## Arsitektur (tahap ini)

```
[Browser] — nanti Vercel —→ Choreo (Docker / Express API)
                                    ↓
                             Supabase PostgreSQL
```

---

## Prasyarat

- [x] Database Supabase sudah jalan
- [x] `database/schema.sql` sudah dijalankan di Supabase SQL Editor
- [x] `database/seeds.sql` (opsional) untuk user demo
- [ ] Repo GitHub sudah berisi kode + config Docker di folder `server/`

---

## 1. Ambil connection string Supabase

1. Supabase Dashboard → **Project Settings** → **Database**
2. **Connection string** → mode **URI**
3. Pilih **Session pooler** (port `5432`) atau **Transaction pooler** (port `6543`)
4. Salin URL, contoh:

```text
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

5. Buat **JWT secret** acak (min. 32 karakter) untuk production

---

## 2. Push config Docker ke GitHub

Pastikan repo memiliki:

| File | Fungsi |
|------|--------|
| `server/Dockerfile` | Build image Node.js |
| `server/.dockerignore` | Exclude `node_modules`, `.env` |
| `server/.choreo/component.yaml` | Port & visibility endpoint Choreo |

```bash
git add server/Dockerfile server/.dockerignore server/.choreo/
git commit -m "chore: add Choreo Docker config for backend"
git push origin main
```

---

## 3. Buat Component di Choreo

1. Buka [Choreo Console](https://console.choreo.dev/) → **Create Component**
2. Pilih **Service**
3. Connect **GitHub repository** (repo `maspoint`)
4. **Build pack:** pilih **Dockerfile** (bukan Go/Java buildpack)
5. **Component directory / Docker context:** `server`
6. **Dockerfile path:** `Dockerfile` (relatif ke context `server`)
7. Branch: `main`
8. Create → tunggu **Build** selesai (3–5 menit pertama kali)

> Jika sudah ada component sample Go, buat **component baru** khusus LitePOS — jangan pakai template Go.

---

## 4. Configure & Deploy — Environment Variables

Di Choreo → component **LitePOS API** → **Deploy** → **Configure & Deploy** → **Environment Variables**:

| Key | Nilai | Catatan |
|-----|--------|---------|
| `NODE_ENV` | `production` | Wajib |
| `PORT` | `8080` | Harus sama dengan `component.yaml` |
| `DATABASE_URL` | URI Supabase | Dari langkah 1 |
| `DATABASE_SSL` | `true` | Supabase wajib SSL |
| `JWT_SECRET` | string acak panjang | Jangan pakai default dev |
| `CLIENT_URL` | *(kosongkan dulu)* | Isi setelah frontend Vercel live |

Klik **Deploy** ke environment **Development** dulu.

---

## 5. Verifikasi endpoint

Setelah deploy **Active**, buka tab **Endpoints** di Overview:

- Salin **Public URL**, contoh:
  `https://xxxxxxxx-dev.e1-us-east-azure.choreoapis.dev`

Tes di browser atau terminal:

```bash
curl https://YOUR-CHOREO-URL/api/health
```

Harus mengembalikan:

```json
{"status":"ok","message":"LitePOS API is running"}
```

Tes login (jika seeds sudah diimport):

```bash
curl -X POST https://YOUR-CHOREO-URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"owner\",\"password\":\"123456\"}"
```

---

## 6. Build Docker lokal (opsional, sebelum push)

Dari folder `server/`:

```bash
docker build -t litepos-api .
docker run --rm -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e DATABASE_URL="postgresql://..." \
  -e DATABASE_SSL=true \
  -e JWT_SECRET="local-test-secret-min-32-chars-long" \
  litepos-api
```

Buka: `http://localhost:8080/api/health`

---

## 7. Setelah backend live (langkah berikutnya)

Saat deploy frontend ke **Vercel**:

```env
VITE_API_URL=https://YOUR-CHOREO-URL/api
```

Lalu update di Choreo:

```env
CLIENT_URL=https://nama-app.vercel.app
```

Redeploy backend agar CORS mengizinkan origin Vercel.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Build gagal di Choreo | Pastikan context = `server`, Dockerfile ada, `package-lock.json` ter-commit |
| Container crash / restart | Cek logs Choreo → Observability; biasanya `DATABASE_URL` salah |
| `ECONNREFUSED` database | Pastikan Supabase project tidak paused; password URI sudah di-encode |
| SSL error PostgreSQL | Set `DATABASE_SSL=true` |
| CORS error dari browser | Set `CLIENT_URL` ke URL Vercel exact (https, tanpa `/` di akhir) |
| Port mismatch | `PORT=8080` di env **dan** `port: 8080` di `.choreo/component.yaml` |
| Upload gambar hilang | Folder `uploads` di container tidak persisten — normal untuk MVP |

---

## Checklist backend Choreo

- [ ] Build Choreo sukses (green)
- [ ] Deploy Development **Active**
- [ ] `/api/health` OK dari Public URL
- [ ] Login API mengembalikan token
- [ ] Transaksi test tersimpan di Supabase

Frontend Vercel → lihat bagian Vercel di [DEPLOY.md](./DEPLOY.md).
