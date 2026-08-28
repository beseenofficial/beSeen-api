import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import Message from '../../src/models/Message';

const sender = new Types.ObjectId('000000000000000000000001');

const recipient = new Types.ObjectId('000000000000000000000002');

const messageInput = () => ({
  conversation: new Types.ObjectId('000000000000000000000003'),
  sequence: 1,
  clientMessageId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
  sender,
  recipient,
  senderKeyVersion: 1,
  recipientKeyVersion: 2,
  senderSigningPublicKey: Buffer.alloc(32, 1).toString('base64'),
  senderEncryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
  recipientEncryptionPublicKey: Buffer.alloc(32, 3).toString('base64'),
  contentCiphertext: Buffer.alloc(32, 4).toString('base64'),
  contentNonce: Buffer.alloc(24, 5).toString('base64'),
  senderEncryptedMessageKey: Buffer.alloc(80, 6).toString('base64'),
  recipientEncryptedMessageKey: Buffer.alloc(80, 7).toString('base64'),
  signature: Buffer.alloc(64, 8).toString('base64'),
});

describe('Message model', () => {
  it('accepts a complete opaque encrypted envelope', async () => {
    const message = new Message(messageInput());

    await expect(message.validate()).resolves.toBeUndefined();
    expect(message.replyToMessage).toBeNull();
    expect(message.encryptionVersion).toBe(1);
    expect(message.signatureVersion).toBe(1);
  });

  it('defines stable ordering and idempotency indexes', () => {
    expect(Message.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { conversation: 1, sequence: 1 },
          expect.objectContaining({ unique: true, name: 'messages_conversation_sequence_unique' }),
        ],
        [
          { sender: 1, clientMessageId: 1 },
          expect.objectContaining({ unique: true, name: 'messages_sender_client_id_unique' }),
        ],
        [{ recipient: 1 }, expect.objectContaining({ name: 'messages_recipient_count' })],
      ]),
    );
  });

  it('rejects invalid encrypted fields and self-messages', async () => {
    await expect(
      new Message({
        ...messageInput(),
        contentNonce: Buffer.alloc(23).toString('base64'),
      }).validate(),
    ).rejects.toBeDefined();
    await expect(new Message({ ...messageInput(), recipient: sender }).validate()).rejects.toThrow(
      'A message requires two different users',
    );
  });

  it('requires complete valid bounty terms when a signed message carries a bounty', async () => {
    await expect(
      new Message({
        ...messageInput(),
        bountyAssetCode: 'USDC',
        bountyAmount: '10',
        bountyDurationSeconds: 3_600,
      }).validate(),
    ).resolves.toBeUndefined();
    await expect(
      new Message({ ...messageInput(), bountyAssetCode: 'USDC' }).validate(),
    ).rejects.toThrow('All bounty terms must be supplied together');
  });

  it('throws instead of storing plaintext, private keys, or raw content keys', () => {
    expect(() => new Message({ ...messageInput(), plaintext: 'secret' })).toThrow();
    expect(() => new Message({ ...messageInput(), privateKey: 'secret' })).toThrow();
    expect(() => new Message({ ...messageInput(), contentKey: 'secret' })).toThrow();
  });
});
