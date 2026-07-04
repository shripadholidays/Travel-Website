const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ResponseHandler = require('../utils/response-handler');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE_MB = 10;

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
        cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF, SVG`));
    },
});

// POST /api/v1/upload  — single file
exports.uploadMiddleware = upload.single('file');

exports.uploadFile = (req, res) => {
    if (!req.file) {
        return ResponseHandler.fail(res, 400, 'No file provided');
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;
    return ResponseHandler.success(res, { url, filename: req.file.filename }, 'File uploaded successfully');
};

// DELETE /api/v1/upload/:filename
exports.deleteFile = (req, res) => {
    const { filename } = req.params;
    // Prevent directory traversal
    if (filename.includes('/') || filename.includes('..')) {
        return ResponseHandler.fail(res, 400, 'Invalid filename');
    }
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return ResponseHandler.fail(res, 404, 'File not found');
    }
    fs.unlinkSync(filePath);
    return ResponseHandler.success(res, null, 'File deleted');
};
