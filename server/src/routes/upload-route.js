const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const { uploadMiddleware, uploadFile, deleteFile } = require('../controllers/UploadController');

const router = express.Router();

// All upload routes require admin
router.use(isLoggedIn, authorize('admin'));

router.post('/', uploadMiddleware, uploadFile);
router.delete('/:filename', deleteFile);

module.exports = router;
