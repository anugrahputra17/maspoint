# Product Requirement Document (PRD)
## Project Name: LitePOS (Point of Sale untuk UMKM & Retail Low-Middle)
**Version:** 1.0  
**Author:** Senior POS Systems Architect  
**Target Audience:** AI Coding Agents / Developers (Optimized for Vibe Coding)

---

### 1. Executive Summary & Project Objective
LitePOS adalah aplikasi kasir (Point of Sale) berbasis Point of Sale / Progressive Web App (PWA) yang dirancang khusus untuk memenuhi kebutuhan operasional UMKM (Toko Kelontong, Retail Kecil, Warung, Kios, Toko Kelontong Mandiri) di segmen pasar *low-to-middle*. 

**Tujuan Utama:**
*   **Kecepatan Eksekusi:** Proses transaksi kasir harus instan (< 500ms per action) untuk menghindari antrean.
*   **Kemudahan Penggunaan (Intuitive UI):** Desain ramah pengguna, bahkan bagi yang gagap teknologi.
*   **Offline Resilience:** Tetap bisa bertransaksi meskipun koneksi internet terputus di tengah jalan.
*   **Low Spec Optimization:** Berjalan lancar di smartphone Android murah (RAM 2GB/3GB) atau tablet lawas.

---

### 2. Tech Stack & Architecture Guidelines (Context for Agent)
Aplikasi ini harus dibangun dengan arsitektur yang mendukung efisiensi tinggi:
*   **Frontend / Client:** Single Page Application (SPA) / PWA dengan framework modern (e.g., React, Vue, atau Svelte).
*   **Database Client-Side:** IndexedDB / LocalStorage untuk mekanisme caching produk dan antrean transaksi offline.
*   **Backend / Server:** API Server ringan (Node.js/Go/Python) dengan database relasional (PostgreSQL atau SQLite untuk setup minimalis).
*   **Format Mata Uang:** Khusus mata uang Rupiah (IDR), tanpa desimal, menggunakan pembulatan standar ke bawah/ke atas.

---

### 3. Core Database Schema & Relational Model
Agent wajib mengimplementasikan struktur tabel di bawah ini untuk memastikan integritas data:

```sql
-- 1. Users & Roles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255), -- Untuk login kasir cepat (6 digit)
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('owner', 'cashier')) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Product Categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Inventory
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    sku_barcode VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    cost_price INT NOT NULL, -- Harga Modal (Rupiah, bulat)
    selling_price INT NOT NULL, -- Harga Jual (Rupiah, bulat)
    stock INT NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 5, -- Batas alert stok tipis
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Cashier Shifts (Cash Control)
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    cash_start INT NOT NULL, -- Modal awal di laci kasir
    cash_end INT, -- Uang fisik akhir yang dihitung manual oleh kasir
    total_expected INT, -- Total kalkulasi sistem (cash_start + total penjualan tunai)
    total_actual INT, -- Uang fisik aktual yang dilaporkan
    status VARCHAR(20) CHECK (status IN ('open', 'closed')) DEFAULT 'open'
);

-- 5. Sales Transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    shift_id INT REFERENCES shifts(id) NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    total_items INT NOT NULL,
    subtotal INT NOT NULL,
    discount INT DEFAULT 0, -- Nominal diskon dalam rupiah
    tax INT DEFAULT 0, -- Nominal pajak dalam rupiah
    total_final INT NOT NULL, -- (subtotal - discount) + tax
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'qris', 'transfer')) NOT NULL,
    amount_paid INT NOT NULL, -- Uang yang dibayarkan konsumen
    amount_change INT NOT NULL, -- Uang kembalian
    is_voided BOOLEAN DEFAULT FALSE, -- Transaksi dibatalkan
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sales Transaction Items (Detail Belanja)
CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    cost_price INT NOT NULL, -- Snapshot harga modal saat transaksi terjadi
    selling_price INT NOT NULL, -- Snapshot harga jual saat transaksi terjadi
    subtotal INT NOT NULL -- quantity * selling_price
);
```

---

### 4. Functional Modules & Core Features

#### MODULE 1: AUTHENTICATION & SHIFT LOGIC
*   **Feature 1.1: Multi-Role Authorization**
    *   `owner`: Akses penuh ke dashboard, edit stok/harga, impor CSV, laporan penjualan, dan fungsi *Void* (pembatalan transaksi).
    *   `cashier`: Hanya bisa mengakses POS Checkout, melihat riwayat transaksi sendiri pada shift berjalan, dan melakukan tutup shift.
*   **Feature 1.2: Shift Control Sequence**
    *   Sebelum masuk ke halaman utama kasir, sistem wajib memeriksa status shift user.
    *   Jika belum ada shift yang buka (`status = 'open'`), kasir wajib mengisi form "Buka Shift" dengan input `cash_start` (Modal Awal). Tanpa ini, halaman checkout terkunci.

#### MODULE 2: INVENTORY & PRODUCT SCRATCHPAD
*   **Feature 2.1: Barcode-Ready Product Input**
    *   CRUD Produk harus mendukung pemindaian langsung. Jika input SKU difokuskan, sistem dapat menerima input dari hardware USB/Bluetooth Barcode Scanner (diakhiri karakter `Enter`).
*   **Feature 2.2: Low Stock Warning Indicator**
    *   Pada list produk (baik di manajemen data maupun di halaman kasir), jika `stock` <= `minimum_stock`, tampilkan badge warna merah menyala bertuliskan "Stok Menipis" atau "Habis".
*   **Feature 2.3: CSV Bulk Processing**
    *   Menyediakan fungsi unggah file `.csv` dengan kolom: `sku_barcode, nama_produk, id_kategori, harga_modal, harga_jual, stok, stok_minimum`. Jika SKU sudah ada, sistem akan melakukan *update* (upsert).

#### MODULE 3: THE CHECKOUT INTERFACE & CORE ENGINE
*   **Feature 3.1: Ultra-Fast Search & Cart Actions**
    *   Pencarian produk wajib menggunakan pencarian *fuzzy match* berbasis memori (client-side cache). Ketikan pengguna harus menyaring daftar produk secara real-time (< 100ms).
    *   *Scan to Add:* Jika kasir melakukan scan barcode produk di halaman transaksi, sistem otomatis mencari produk tersebut dan menambahkannya ke keranjang belanja dengan qty = +1. Jika produk sudah ada di keranjang, tambahkan qty-nya.
*   **Feature 3.2: Cashier Shortcuts (Quick Cash)**
    *   Saat metode pembayaran `cash` dipilih, sediakan tombol shortcut nominal uang cepat berbasis pecahan mata uang Indonesia: `Uang Pas`, `2.000`, `5.000`, `10.000`, `20.000`, `50.000`, `100.000`.
    *   Sistem secara real-time menampilkan `amount_change` (Uang Kembalian): `amount_paid - total_final`. Jika `amount_paid` < `total_final`, tombol "Selesai Transaksi" dinonaktifkan (disabled).
*   **Feature 3.3: QRIS Capture Logging**
    *   Untuk metode pembayaran `qris`, tampilkan gambar QR Code statis toko (diunggah oleh Owner di pengaturan). Kasir secara manual menekan tombol "Konfirmasi Sukses" setelah memastikan dana masuk ke mutasi rekening/aplikasi e-wallet mereka.

#### MODULE 4: CASHIER CLOSE SHIFT (Z-REPORT)
*   **Feature 4.1: Blind Close Mechanism**
    *   Saat menutup kasir, kasir diminta menghitung fisik uang di laci dan menginputnya ke field `cash_end`. Kasir *tidak boleh* melihat angka perkiraan sistem (`total_expected`) sebelum mereka melakukan submit untuk mencegah manipulasi.
    *   Setelah disubmit, sistem akan menerbitkan laporan selisih: `selisih = cash_end - total_expected`.

#### MODULE 5: ANALYTICS & OWNER DASHBOARD
*   **Feature 5.1: Real-time Profitability Engine**
    *   Menampilkan metrik utama di halaman Owner:
        *   Omset / Total Penjualan Kotor (`SUM(total_final)`)
        *   Keuntungan Bersih / Profit (`SUM(item.selling_price - item.cost_price) * item.quantity`)
    *   Menampilkan grafik line chart atau bar chart berisi tren penjualan 7 hari terakhir.
*   **Feature 5.2: Void/Cancel Transaction Logs**
    *   Setiap pembatalan transaksi (*Void*) wajib meminta konfirmasi PIN/Password Owner. Jika disetujui, status transaksi menjadi `is_voided = TRUE` dan kuantitas barang otomatis dikembalikan (`stock = stock + item.quantity`).

---

### 5. UI/UX Workflow Specifications
*   **Device Responsiveness:** Prioritaskan layout 2 kolom untuk layar Tablet/Desktop (Kiri: Katalog produk, Kanan: Keranjang & Pembayaran). Untuk layar Smartphone, gunakan sistem tab switcher antara "Katalog Produk" dan "Keranjang Belanja (%d items)".
*   **Accessibility:** Tombol tambah/kurang kuantitas di keranjang belanja harus berukuran minimal `44px x 44px` agar mudah ditekan oleh jempol pengguna di layar sentuh.

---

### 6. Edge Cases & Exception Handling Rules (Crucial for AI Agent)
1.  **Stok Kosong (Zero Stock Exception):** Jika produk memiliki `stock = 0`, sistem harus memunculkan notifikasi *toast error* dan menolak produk tersebut masuk ke keranjang, kecuali opsi "Izinkan Stok Minus" diaktifkan pada sistem.
2.  **Kondisi Offline (Network Outage):** Jika transaksi gagal dikirim ke backend karena gangguan internet, simpan objek data transaksi utuh ke dalam antrean `IndexedDB`. Tampilkan indikator "1 Transaksi Tertunda (Belum Sinkron)". Jalankan fungsi background sync secara otomatis setiap 30 detik untuk mencoba mengirim ulang data ketika internet kembali online.
3.  **Invoice Number Concurrency:** Format Nomor Invoice wajib independen per hari untuk menghindari bentrok: `INV/YYYYMMDD/[4-digit-urut]` (Contoh: `INV/20260529/0023`). Gunakan locking mechanism pada database saat generate nomor urut agar tidak terjadi duplikasi nomor nota jika dua kasir menekan tombol bayar bersamaan.

---

### 7. Non-Functional Performance Metrics
*   **Response Time:** Saringan katalog produk harus instan saat mengetik huruf demi huruf.
*   **Printer Standard:** Output cetak nota harus berupa layout teks minimalis tanpa gambar berat, dioptimalkan untuk ukuran kertas Thermal 58mm dengan format font monospace (Standard ESC/POS layout).
