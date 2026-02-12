import multer from 'multer';
import { AppError } from '../middleware/error.middleware.js';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF, DOCX, and TXT files are allowed'));
    }
  },
});
