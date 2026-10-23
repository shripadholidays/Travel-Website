const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const can = require('../middlewares/can');
const { PERMISSIONS } = require('../config/permissions');
const { uploadMiddleware, uploadFile, deleteFile } = require('../controllers/UploadController');

const router = express.Router();

// Anyone who edits the catalog, the site content or articles may upload images
router.use(isLoggedIn, can(PERMISSIONS.CATALOG, PERMISSIONS.CONTENT, PERMISSIONS.ARTICLES, PERMISSIONS.SETTINGS));

router.post('/', uploadMiddleware, uploadFile);
router.delete('/:filename', can(PERMISSIONS.CATALOG, PERMISSIONS.CONTENT), deleteFile);

module.exports = router;
