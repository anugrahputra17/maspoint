const dns = require('dns');
const { Pool } = require('pg');

// Supabase direct host (db.*.supabase.co) sering resolve ke IPv6.
// Choreo/container cloud sering tidak bisa IPv6 → ENETUNREACH.
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const databaseUrl = process.env.DATABASE_URL?.trim();

if (databaseUrl && !/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  console.error(
    '[DB] DATABASE_URL harus URI lengkap, contoh: postgresql://postgres.[ref]:[pass]@....pooler.supabase.com:6543/postgres'
  );
}

const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  (databaseUrl && /supabase\.com/i.test(databaseUrl)) ||
  (process.env.NODE_ENV === 'production' && Boolean(databaseUrl));

const poolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'litepos',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
