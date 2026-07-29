import { describe, expect, it } from 'vitest';

import buildBroadcastRecipientKeysDigest from '../../src/utils/broadcast/buildBroadcastRecipientKeysDigest';
import buildBroadcastSignatureMessage from '../../src/utils/broadcast/buildBroadcastSignatureMessage';

describe('broadcast manifest canonicalization', () => {
  it('produces the same recipient digest regardless of input order', () => {
    const entries = [
      {
        recipientId: '507f1f77bcf86cd799439012',
        keyVersion: 1,
        encryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
        encryptedBroadcastKey: Buffer.alloc(80, 2).toString('base64'),
      },
      {
        recipientId: '507f1f77bcf86cd799439011',
        keyVersion: 2,
        encryptionPublicKey: Buffer.alloc(32, 3).toString('base64'),
        encryptedBroadcastKey: Buffer.alloc(80, 4).toString('base64'),
      },
    ];

    expect(buildBroadcastRecipientKeysDigest(entries)).toBe(
      buildBroadcastRecipientKeysDigest([...entries].reverse()),
    );
    expect(buildBroadcastRecipientKeysDigest(entries)).toMatch(/^[a-f\d]{64}$/);
  });

  it('builds a versioned newline-delimited signature message', () => {
    const message = buildBroadcastSignatureMessage({
      broadcastId: '507f1f77bcf86cd799439099',
      clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      creatorId: '507f1f77bcf86cd799439010',
      creatorKeyVersion: 1,
      encryptionVersion: 1,
      contentNonce: Buffer.alloc(24, 1).toString('base64'),
      contentCiphertext: Buffer.alloc(32, 2).toString('base64'),
      creatorEncryptedBroadcastKey: Buffer.alloc(80, 3).toString('base64'),
      audienceType: 'demo_all_users',
      audienceCount: 2,
      recipientKeysDigest: 'a'.repeat(64),
    });

    expect(message).toContain('BeSeen Encrypted Broadcast\nSignature Version: 1');
    expect(message).toContain('Content Suite: XCHACHA20-POLY1305-IETF');
    expect(message).toContain(`Recipient Keys Digest: ${'a'.repeat(64)}`);
  });
});
