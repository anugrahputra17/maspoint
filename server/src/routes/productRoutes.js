const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { getAllProducts, restockProduct, createProduct, updateProduct, deleteProduct, uploadProductImage, importProductsCsv } = require('../controllers/productController');

// Multer configuration for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/products'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `product-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file gambar (JPG, PNG, WebP) yang diizinkan.'));
  }
});

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      return cb(null, true);
    }
    cb(new Error('Hanya file CSV yang diizinkan.'));
  },
});

router.get('/', verifyToken, getAllProducts);
router.post('/import-csv', verifyToken, requireRole(['owner']), csvUpload.single('file'), importProductsCsv);
router.post('/', verifyToken, requireRole(['owner']), createProduct);
router.put('/:id', verifyToken, requireRole(['owner']), updateProduct);
router.delete('/:id', verifyToken, requireRole(['owner']), deleteProduct);
router.post('/:id/restock', verifyToken, requireRole(['owner']), restockProduct);
router.post('/:id/upload-image', verifyToken, requireRole(['owner']), upload.single('image'), uploadProductImage);

module.exports = router;
