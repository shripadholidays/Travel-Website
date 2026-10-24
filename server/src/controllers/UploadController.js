const multer = require('multer');
const ResponseHandler = require('../utils/response-handler');
const config = require('../config');
const { saveFile, deleteFile } = require('../services/storage');
const { compressImage } = require('../services/image-compress');
const logger = require('../utils/logger');

// SVG is left out on purpose: it can carry scripts. GIFs keep their first frame.
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];
const MAX_SIZE_MB = config.storage.maxUploadMb;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Unsupported file type. Use a JPEG, PNG, WebP or GIF image.'));
    },
});

// POST /api/v1/upload  — single file
exports.uploadMiddleware = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) return next();
        const message = err.code === 'LIMIT_FILE_SIZE' ? `That image is over ${MAX_SIZE_MB} MB. Please use a smaller one.` : err.message;
        return ResponseHandler.fail(res, 400, message);
    });
};

exports.uploadFile = async (req, res) => {
    if (!req.file) {
        return ResponseHandler.fail(res, 400, 'No file provided');
    }
    const image = await compressImage(req.file.buffer);
    if (!image) {
        return ResponseHandler.fail(res, 400, 'That file is not a readable image.');
    }
    try {
        const { url, key } = await saveFile({ ...image, folder: 'images', req });
        return ResponseHandler.success(res, { url, filename: key }, 'File uploaded successfully');
    } catch (err) {
        logger.error('Upload failed', { error: err.message });
        return ResponseHandler.fail(res, 502, 'Could not store the image. Please try again.');
    }
};

// DELETE /api/v1/upload/:folder/:filename
exports.deleteFile = async (req, res) => {
    const removed = await deleteFile(`${req.params.folder}/${req.params.filename}`).catch(() => false);
    if (!removed) {
        return ResponseHandler.fail(res, 404, 'File not found');
    }
    return ResponseHandler.success(res, null, 'File deleted');
};
