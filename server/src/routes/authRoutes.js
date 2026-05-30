const express = require('express');
const router = express.Router();
const { login, pinLogin } = require('../controllers/authController');

router.post('/login', login);
router.post('/pin-login', pinLogin);

module.exports = router;
