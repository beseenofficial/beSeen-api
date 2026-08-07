import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import verifyEd25519Signature from '../../src/utils/crypto/verifyEd25519Signature';
import buildMessageSignatureMessage from '../../src/utils/messenger/buildMessageSignatureMessage';

const manifestInput = () => ({
  conversationId: '507F1F77BCF86CD799439011',
  clientMessageId: '2F2B1762-F0F5-4B1B-8ACD-70AFCF043365',
  senderId: '507F1F77BCF86CD799439012',
  recipientId: '507F1F77BCF86CD799439013',
  encryptionVersion: 1,
  senderKeyVersion: 1,
  recipientKeyVersion: 2,
  senderSigningPublicKey: Buffer.alloc(32, 1).toString('base64'),
  senderEncryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
  recipientEncryptionPublicKey: Buffer.alloc(32, 3).toString('base64'),
  contentCiphertext: Buffer.alloc(32, 4).toString('base64'),
  contentNonce: Buffer.alloc(24, 5).toString('base64'),
  senderEncryptedMessageKey: Buffer.alloc(80, 6).toString('base64'),
  recipientEncryptedMessageKey: Buffer.alloc(80, 7).toString('base64'),
  replyToMessageId: null,
});

describe('message manifest canonicalization', () => {
  it('builds a deterministic versioned manifest and normalizes identifiers', () => {
    const message = buildMessageSignatureMessage(manifestInput());

    expect(message).toContain('BeSeen Encrypted Direct Message\nSignature Version: 1');
    expect(message).toContain('Content Suite: XCHACHA20-POLY1305-IETF');
    expect(message).toContain('Conversation ID: 507f1f77bcf86cd799439011');
    expect(message).toContain('Reply To Message ID: none');
    expect(message).toContain('Bounty Asset Code: none');
    expect(message).toBe(buildMessageSignatureMessage(manifestInput()));
  });

  it('binds every security-sensitive envelope field to the signature', () => {
    const input = manifestInput();
    const original = buildMessageSignatureMessage(input);
    const mutations = [
      { ...input, conversationId: `${input.conversationId}changed` },
      { ...input, clientMessageId: `${input.clientMessageId}changed` },
      { ...input, senderId: `${input.senderId}changed` },
      { ...input, recipientId: `${input.recipientId}changed` },
      { ...input, encryptionVersion: 2 },
      { ...input, senderKeyVersion: 2 },
      { ...input, recipientKeyVersion: 3 },
      { ...input, senderSigningPublicKey: `${input.senderSigningPublicKey}changed` },
      { ...input, senderEncryptionPublicKey: `${input.senderEncryptionPublicKey}changed` },
      { ...input, recipientEncryptionPublicKey: `${input.recipientEncryptionPublicKey}changed` },
      { ...input, contentCiphertext: `${input.contentCiphertext}changed` },
      { ...input, contentNonce: `${input.contentNonce}changed` },
      { ...input, senderEncryptedMessageKey: `${input.senderEncryptedMessageKey}changed` },
      { ...input, recipientEncryptedMessageKey: `${input.recipientEncryptedMessageKey}changed` },
      { ...input, replyToMessageId: '507f1f77bcf86cd799439014' },
      { ...input, bounty: { assetCode: 'USDC', amount: '10', durationSeconds: 3_600 } },
    ];

    for (const mutation of mutations) {
      const changed = buildMessageSignatureMessage(mutation);

      expect(changed).not.toBe(original);
    }
  });

  it('can be verified with the sender Ed25519 public key', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const rawPublicKey = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
    const message = buildMessageSignatureMessage({
      ...manifestInput(),
      senderSigningPublicKey: rawPublicKey.toString('base64'),
    });
    const signature = sign(null, Buffer.from(message, 'utf8'), privateKey).toString('base64');

    expect(verifyEd25519Signature(rawPublicKey.toString('base64'), message, signature)).toBe(true);
    expect(
      verifyEd25519Signature(rawPublicKey.toString('base64'), `${message}\nchanged`, signature),
    ).toBe(false);
  });
});
