import { createPublicKey, verify } from 'node:crypto';

import isBase64PublicKey from '../auth/isBase64PublicKey';
import isCanonicalBase64 from './isCanonicalBase64';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

const verifyEd25519Signature = (publicKey: string, message: string, signature: string): boolean => {
  if (
    !isBase64PublicKey(publicKey) ||
    !isCanonicalBase64(signature, { minBytes: 64, maxBytes: 64 })
  ) {
    return false;
  }

  try {
    const publicKeyObject = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKey, 'base64')]),
      format: 'der',
      type: 'spki',
    });

    return verify(
      null,
      Buffer.from(message, 'utf8'),
      publicKeyObject,
      Buffer.from(signature, 'base64'),
    );
  } catch {
    return false;
  }
};

export default verifyEd25519Signature;
