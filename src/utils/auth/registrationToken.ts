import { createHash, randomBytes } from 'node:crypto';

import { REGISTRATION_TOKEN_LENGTH_BYTES } from '../../constant/auth';

const generateRegistrationToken = (): string => {
  return randomBytes(REGISTRATION_TOKEN_LENGTH_BYTES).toString('base64url');
};

const hashRegistrationToken = (token: string): string => {
  return createHash('sha256').update(token, 'utf8').digest('hex');
};

export { generateRegistrationToken, hashRegistrationToken };
