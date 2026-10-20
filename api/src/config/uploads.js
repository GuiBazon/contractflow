const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_ROOT = path.resolve(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

const SUBDIRS = {
  OCR: 'ocr',
  DOCS: 'docs',
};

// RNF16 - formatos permitidos
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function ensureUploadDirs() {
  for (const dir of Object.values(SUBDIRS)) {
    const full = path.join(UPLOAD_ROOT, dir);
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true });
    }
  }
}

ensureUploadDirs();

// Nome de arquivo controlado: uuid + extensao validada (evita path traversal e nomes maliciosos)
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const extensions = { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg','.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] };
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    return cb(Object.assign(new Error('Formato de arquivo não permitido (use PDF, JPEG, PNG ou WebP)'), { status: 400 }));
  }
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(Object.assign(new Error('Extensão de arquivo não permitida'), { status: 400 }));
  }
  if (!extensions[file.mimetype].includes(ext)) return cb(Object.assign(new Error('Extensão e formato do arquivo não correspondem'), { status: 400 }));
  file.safeExt = ext;
  cb(null, true);
}

function storageFor(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, subdir)),
    filename: (req, file, cb) => {
      const name = crypto.randomUUID() + file.safeExt;
      cb(null, name);
    },
  });
}

function buildUploader(subdir, fieldName) {
  return multer({
    storage: storageFor(subdir),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }).single(fieldName);
}

// Erros de entrada têm status 400/413; falhas internas não expõem caminhos.
function uploadSizeHandler(err, req, res, next) {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Arquivo muito grande (máximo 10MB)' });
    }
    const status = err.status || (err.name === 'MulterError' ? 400 : 500);
    if (status >= 500) console.error('erro ao receber arquivo:', err.code || err.name);
    return res.status(status).json({ message: status >= 500 ? 'Erro ao receber arquivo' : err.message });
  }
  next();
}

module.exports = {
  UPLOAD_ROOT,
  SUBDIRS,
  ALLOWED_MIMES,
  MAX_FILE_SIZE,
  ensureUploadDirs,
  buildUploader,
  uploadSizeHandler,
};
