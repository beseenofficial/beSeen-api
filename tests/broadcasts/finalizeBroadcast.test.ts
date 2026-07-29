import { generateKeyPairSync, sign } from 'node:crypto';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Broadcast from '../../src/models/Broadcast';
import BroadcastRecipient from '../../src/models/BroadcastRecipient';
import buildBroadcastRecipientKeysDigest from '../../src/utils/broadcast/buildBroadcastRecipientKeysDigest';
import buildBroadcastSignatureMessage from '../../src/utils/broadcast/buildBroadcastSignatureMessage';
import finalizeBroadcast from '../../src/utils/broadcast/finalizeBroadcast';

const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });
const sortedQueryResult = <T>(value: T) => ({
  sort: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('finalizeBroadcast', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies the complete encrypted manifest and atomically publishes it', async () => {
    const creatorId = new Types.ObjectId();
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const signingPublicKey = publicKey
      .export({ format: 'der', type: 'spki' })
      .subarray(-32)
      .toString('base64');
    const draft = new Broadcast({
      _id: new Types.ObjectId(),
      clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      creator: creatorId,
      audienceSnapshotCount: 1,
      encryptionVersion: 1,
      creatorKeyVersion: 1,
      creatorSigningPublicKey: signingPublicKey,
      creatorEncryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
    });
    const recipient = new BroadcastRecipient({
      broadcast: draft._id,
      recipient: new Types.ObjectId(),
      username: 'member_user',
      keyVersion: 1,
      encryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
      encryptedBroadcastKey: Buffer.alloc(80, 3).toString('base64'),
    });
    const unsignedBody = {
      contentCiphertext: Buffer.alloc(32, 4).toString('base64'),
      contentNonce: Buffer.alloc(24, 5).toString('base64'),
      creatorEncryptedBroadcastKey: Buffer.alloc(80, 6).toString('base64'),
    };
    const recipientKeysDigest = buildBroadcastRecipientKeysDigest([
      {
        recipientId: recipient.recipient.toString(),
        keyVersion: recipient.keyVersion,
        encryptionPublicKey: recipient.encryptionPublicKey,
        encryptedBroadcastKey: recipient.encryptedBroadcastKey!,
      },
    ]);
    const signatureMessage = buildBroadcastSignatureMessage({
      broadcastId: draft._id.toString(),
      clientBroadcastId: draft.clientBroadcastId,
      creatorId: creatorId.toString(),
      creatorKeyVersion: 1,
      encryptionVersion: 1,
      ...unsignedBody,
    audienceType: 'demo_all_users',
      audienceCount: 1,
      recipientKeysDigest,
    });
    const body = {
      ...unsignedBody,
      signature: sign(null, Buffer.from(signatureMessage), privateKey).toString('base64'),
    };
    vi.spyOn(Broadcast, 'findOne').mockReturnValue(queryResult(draft) as never);
    vi.spyOn(BroadcastRecipient, 'find').mockReturnValue(sortedQueryResult([recipient]) as never);
    const updateSpy = vi
      .spyOn(Broadcast, 'updateOne')
      .mockReturnValue(queryResult({ modifiedCount: 1 }) as never);

    const result = await finalizeBroadcast(creatorId.toString(), draft._id.toString(), body);

    expect(result).toMatchObject({
      ok: true,
      publishedNow: true,
      broadcast: {
        status: 'published',
        contentCiphertext: body.contentCiphertext,
        recipientKeysDigest,
      },
    });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ _id: draft._id, status: 'draft' }),
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'published',
          signature: body.signature,
          recipientKeysDigest,
        }),
      }),
      { runValidators: true },
    );
  });

  it('returns the remaining count without attempting publication', async () => {
    const creatorId = new Types.ObjectId();
    const draft = new Broadcast({
      _id: new Types.ObjectId(),
      clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      creator: creatorId,
      audienceSnapshotCount: 1,
      encryptionVersion: 1,
      creatorKeyVersion: 1,
      creatorSigningPublicKey: Buffer.alloc(32, 1).toString('base64'),
      creatorEncryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
    });
    const recipient = new BroadcastRecipient({
      broadcast: draft._id,
      recipient: new Types.ObjectId(),
      username: 'member_user',
      keyVersion: 1,
      encryptionPublicKey: Buffer.alloc(32, 3).toString('base64'),
    });
    vi.spyOn(Broadcast, 'findOne').mockReturnValue(queryResult(draft) as never);
    vi.spyOn(BroadcastRecipient, 'find').mockReturnValue(sortedQueryResult([recipient]) as never);
    const updateSpy = vi.spyOn(Broadcast, 'updateOne');

    const result = await finalizeBroadcast(creatorId.toString(), draft._id.toString(), {
      contentCiphertext: Buffer.alloc(32, 4).toString('base64'),
      contentNonce: Buffer.alloc(24, 5).toString('base64'),
      creatorEncryptedBroadcastKey: Buffer.alloc(80, 6).toString('base64'),
      signature: Buffer.alloc(64, 7).toString('base64'),
    });

    expect(result).toEqual({
      ok: false,
      reason: 'recipient_keys_incomplete',
      remainingCount: 1,
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
