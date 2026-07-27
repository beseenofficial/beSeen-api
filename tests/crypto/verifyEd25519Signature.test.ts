import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import verifyEd25519Signature from '../../src/utils/crypto/verifyEd25519Signature';

describe('verifyEd25519Signature', () => {
  it('verifies raw Ed25519 public keys and rejects changed encrypted envelopes', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const rawPublicKey = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
    const message = 'BeSeen encrypted envelope';
    const signature = sign(null, Buffer.from(message), privateKey);

    expect(
      verifyEd25519Signature(
        rawPublicKey.toString('base64'),
        message,
        signature.toString('base64'),
      ),
    ).toBe(true);
    expect(
      verifyEd25519Signature(
        rawPublicKey.toString('base64'),
        `${message} changed`,
        signature.toString('base64'),
      ),
    ).toBe(false);
  });
});
