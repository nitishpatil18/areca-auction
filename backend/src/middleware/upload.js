import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { badRequest } from '../utils/httpError.js';

const UPLOAD_ROOT = process.env.UPLOAD_DIR || '/app/uploads';
const LOTS_DIR = path.join(UPLOAD_ROOT, 'lots');

// ensure upload dir exists
fs.mkdirSync(LOTS_DIR, { recursive: true });

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 2 * 1024 * 1024;     // 2mb
const MAX_FILES_PER_REQUEST = 5;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(badRequest(`Unsupported file type: ${file.mimetype}. Use JPEG, PNG, or WebP.`), false);
  }
  cb(null, true);
}

export const lotImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: MAX_FILES_PER_REQUEST,
  },
}).array('images', MAX_FILES_PER_REQUEST);

export { LOTS_DIR, UPLOAD_ROOT };
