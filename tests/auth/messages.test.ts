import { describe, expect, it } from 'vitest';

import buildKeyDerivationMessage from '../../src/utils/auth/buildKeyDerivationMessage';
import buildRegistrationMessage from '../../src/utils/auth/buildRegistrationMessage';
import generateAuthNonce from '../../src/utils/auth/generateAuthNonce';
import isBase64PublicKey from '../../src/utils/auth/isBase64PublicKey';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const SIGNING_PUBLIC_KEY = Buffer.alloc(32, 1).toString('base64');
const ENCRYPTION_PUBLIC_KEY = Buffer.alloc(32, 2).toString('base64');
const NONCE = 'n'.repeat(43);

describe('authentication messages', () => {
  it('builds the frozen version 1 key derivation message', () => {
    const message = buildKeyDerivationMessage({
      walletAddress: WALLET_ADDRESS.toLowerCase(),
      network: 'public',
    });

    expect(message).toBe(
      [
        'BeSeen Key Derivation',
        'Version: 1',
        'Domain: beseen.app',
        'Network: PUBLIC',
        `Account: ${WALLET_ADDRESS}`,
        'Purpose: Derive BeSeen identity and private communication keys.',
      ].join('\n'),
    );
  });

  it('builds a canonical registration key-binding message', () => {
    const issuedAt = new Date('2026-07-27T12:00:00.000Z');
    const expiresAt = new Date('2026-07-27T12:05:00.000Z');

    const message = buildRegistrationMessage({
      domain: 'BESEEN.APP',
      network: 'public',
      walletAddress: WALLET_ADDRESS,
      signingPublicKey: SIGNING_PUBLIC_KEY,
      encryptionPublicKey: ENCRYPTION_PUBLIC_KEY,
      nonce: NONCE,
      issuedAt,
      expiresAt,
    });

    expect(message).toBe(
      [
        'BeSeen Registration',
        'Version: 1',
        'Domain: beseen.app',
        'Network: PUBLIC',
        `Account: ${WALLET_ADDRESS}`,
        'Key Derivation Version: 1',
        `Signing Public Key (Ed25519): ${SIGNING_PUBLIC_KEY}`,
        `Encryption Public Key (X25519): ${ENCRYPTION_PUBLIC_KEY}`,
        `Nonce: ${NONCE}`,
        'Issued At: 2026-07-27T12:00:00.000Z',
        'Expiration Time: 2026-07-27T12:05:00.000Z',
      ].join('\n'),
    );
  });

  it('rejects an invalid Stellar checksum', () => {
    expect(() =>
      buildKeyDerivationMessage({
        walletAddress: `G${'A'.repeat(55)}`,
        network: 'public',
      }),
    ).toThrow('Invalid Stellar G address');
  });

  it('rejects malformed public keys and expiration times', () => {
    const input = {
      domain: 'beseen.app',
      network: 'public' as const,
      walletAddress: WALLET_ADDRESS,
      signingPublicKey: 'invalid',
      encryptionPublicKey: ENCRYPTION_PUBLIC_KEY,
      nonce: NONCE,
      issuedAt: new Date('2026-07-27T12:00:00.000Z'),
      expiresAt: new Date('2026-07-27T12:05:00.000Z'),
    };

    expect(() => buildRegistrationMessage(input)).toThrow('Invalid Ed25519 signing public key');

    expect(() =>
      buildRegistrationMessage({
        ...input,
        signingPublicKey: SIGNING_PUBLIC_KEY,
        expiresAt: input.issuedAt,
      }),
    ).toThrow('Challenge expiration must be after its issue time');
  });

  it('generates canonical 32-byte base64url nonces', () => {
    const firstNonce = generateAuthNonce();
    const secondNonce = generateAuthNonce();

    expect(firstNonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(firstNonce, 'base64url')).toHaveLength(32);
    expect(firstNonce).not.toBe(secondNonce);
  });

  it('only accepts canonical base64-encoded 32-byte public keys', () => {
    expect(isBase64PublicKey(SIGNING_PUBLIC_KEY)).toBe(true);
    expect(isBase64PublicKey(Buffer.alloc(31).toString('base64'))).toBe(false);
    expect(isBase64PublicKey(SIGNING_PUBLIC_KEY.replace(/=$/, ''))).toBe(false);
  });
});
