import multer from 'multer';
import type { RequestHandler } from 'express';

import env from '../env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.R2_MAX_AVATAR_BYTES,
    files: 1,
    fields: 5,
    parts: 6,
  },
});

const avatarUpload: RequestHandler = (req, res, next) => {
  upload.single('avatar')(req, res, (error: unknown) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).j({
        status: 'error',
        message: 'Avatar file is too large',
        result: { code: 'AVATAR_TOO_LARGE', maxBytes: env.R2_MAX_AVATAR_BYTES },
      });
    }

    return res.status(400).j({
      status: 'error',
      message: 'Invalid avatar upload',
      result: { code: 'INVALID_AVATAR' },
    });
  });
};

export default avatarUpload;
