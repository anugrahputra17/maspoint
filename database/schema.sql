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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    cost_price INT NOT NULL, -- Snapshot harga modal saat transaksi terjadi (diisi backend)
    selling_price INT NOT NULL, -- Snapshot harga jual saat transaksi terjadi
    subtotal INT NOT NULL -- quantity * selling_price
);

-- 7. System Settings
CREATE TABLE system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL
);
