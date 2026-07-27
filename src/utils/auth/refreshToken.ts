import { createHash, randomBytes } from 'node:crypto';

import { REFRESH_TOKEN_LENGTH_BYTES } from '../../constant/auth';

const generateRefreshToken = (): string =>
  randomBytes(REFRESH_TOKEN_LENGTH_BYTES).toString('base64url');

const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export { generateRefreshToken, hashRefreshToken };
