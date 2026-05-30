const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const { getSettings, updateSettings, uploadQrisImage } = require('../controllers/settingsController');

const settingsUploadDir = path.join(__dirname, '../../uploads/settings');
if (!fs.existsSync(settingsUploadDir)) {
  fs.mkdirSync(settingsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, settingsUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `qris-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file gambar (JPG, PNG, WebP) yang diizinkan.'));
  },
});

router.get('/', verifyToken, checkRole(['owner']), getSettings);
router.put('/', verifyToken, checkRole(['owner']), updateSettings);
router.post('/qris-image', verifyToken, checkRole(['owner']), upload.single('image'), uploadQrisImage);

module.exports = router;
