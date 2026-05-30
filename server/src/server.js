require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const productRoutes = require('./routes/productRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const cashierRoutes = require('./routes/cashierRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const getAllowedOrigins = () => {
  const origins = [
    process.env.CLIENT_URL,
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
  ]
    .map((o) => o?.trim())
    .filter(Boolean);
  return [...new Set(origins)];
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    const allowed = getAllowedOrigins();
    if (allowed.length === 0) {
      console.warn('[CORS] CLIENT_URL belum diset — semua origin diizinkan sementara.');
      return callback(null, true);
    }
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin tidak diizinkan: ${origin}`));
  },
  credentials: true,
};

app.use(helmet({ crossOriginResourcePolicy: false })); // allow images to be loaded
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json());

// Serve uploaded product images as static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/cashiers', cashierRoutes);
app.use('/api/settings', settingsRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LitePOS API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
