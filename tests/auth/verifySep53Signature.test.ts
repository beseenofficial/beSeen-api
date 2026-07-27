import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';

import isBase64Sep53Signature from '../../src/utils/auth/isBase64Sep53Signature';
import {
  generateRegistrationToken,
  hashRegistrationToken,
} from '../../src/utils/auth/registrationToken';
import verifySep53Signature from '../../src/utils/stellar/verifySep53Signature';

describe('SEP-53 signature verification', () => {
  it('verifies a real Stellar SDK message signature', () => {
    const keypair = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7));
    const message = 'BeSeen registration verification test';
    const signature = keypair.signMessage(message).toString('base64');

    expect(isBase64Sep53Signature(signature)).toBe(true);
    expect(verifySep53Signature(keypair.publicKey(), message, signature)).toBe(true);
    expect(verifySep53Signature(keypair.publicKey(), `${message}!`, signature)).toBe(false);
  });

  it('rejects malformed 64-byte signature encodings', () => {
    expect(isBase64Sep53Signature(Buffer.alloc(64).toString('base64'))).toBe(true);
    expect(isBase64Sep53Signature(Buffer.alloc(63).toString('base64'))).toBe(false);
    expect(isBase64Sep53Signature('not-base64')).toBe(false);
  });

  it('generates opaque registration tokens and stores only stable hashes', () => {
    const token = generateRegistrationToken();
    const secondToken = generateRegistrationToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token).not.toBe(secondToken);
    expect(hashRegistrationToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRegistrationToken(token)).toBe(hashRegistrationToken(token));
    expect(hashRegistrationToken(token)).not.toContain(token);
  });
});
