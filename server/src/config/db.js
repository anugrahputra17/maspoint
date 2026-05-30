const { Pool } = require('pg');

const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  (process.env.DATABASE_URL && /supabase\.com/i.test(process.env.DATABASE_URL)) ||
  (process.env.NODE_ENV === 'production' && Boolean(process.env.DATABASE_URL));

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'litepos',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    };

const pool = new Pool(poolConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
