const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif|mp4|webm|mov/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = /image\/(jpeg|jpg|png|webp|gif)|video\/(mp4|webm|quicktime)/.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('File type not supported'));
    }
});

module.exports = upload;
