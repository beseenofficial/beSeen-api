import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import Broadcast from '../../src/models/Broadcast';
import BroadcastRecipient from '../../src/models/BroadcastRecipient';
import createBroadcastDraft from '../../src/utils/broadcast/createBroadcastDraft';
import resolveBroadcastAudience from '../../src/utils/broadcast/resolveBroadcastAudience';
import getBroadcastDraftRecipients from '../../src/utils/broadcast/getBroadcastDraftRecipients';

vi.mock('../../src/utils/broadcast/getBroadcastDraftRecipients', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/broadcast/resolveBroadcastAudience', () => ({ default: vi.fn() }));

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });

const getRecipientsMock = vi.mocked(getBroadcastDraftRecipients);

const resolveAudienceMock = vi.mocked(resolveBroadcastAudience);

describe('createBroadcastDraft', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getRecipientsMock.mockReset();
    resolveAudienceMock.mockReset();
  });

  it('snapshots all resolved recipients and returns the first public-key page', async () => {
    const creator = new User({
      _id: new Types.ObjectId(),
      walletAddress: WALLET_ADDRESS,
      username: 'creator_user',
    });

    const creatorKey = new UserKey({
      user: creator._id,
      derivationVersion: 1,
      signingPublicKey: Buffer.alloc(32, 1).toString('base64'),
      encryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
    });

    const audience = [
      {
        recipientId: new Types.ObjectId().toString(),
        username: 'member_user',
        keyVersion: 1,
        encryptionPublicKey: Buffer.alloc(32, 3).toString('base64'),
        accessMode: 'token' as const,
        tokenId: new Types.ObjectId().toString(),
      },
    ];
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(creator) as never);
    vi.spyOn(Broadcast, 'findOne').mockReturnValue(queryResult(null) as never);
    vi.spyOn(UserKey, 'findOne').mockReturnValue(queryResult(creatorKey) as never);
    resolveAudienceMock.mockResolvedValue(audience);
    const insertManySpy = vi.spyOn(BroadcastRecipient, 'insertMany').mockResolvedValue([]);
    vi.spyOn(Broadcast.prototype, 'save').mockImplementation(async function saveDraft() {
      this.createdAt = new Date('2026-07-27T12:00:00.000Z');
      return this;
    });
    getRecipientsMock.mockResolvedValue({
      ok: true,
      draft: {
        id: '507f1f77bcf86cd799439099',
        clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
        status: 'draft',
        audienceType: 'token_holders',
        audienceCount: 1,
        progress: { uploadedCount: 0, remainingCount: 1, complete: false },
        expiresAt: new Date('2026-08-03T12:00:00.000Z'),
      },
      recipients: {
        items: [
          {
            userId: audience[0]!.recipientId,
            username: audience[0]!.username,
            keyVersion: 1,
            encryptionPublicKey: audience[0]!.encryptionPublicKey,
            keyUploaded: false,
            encryptedBroadcastKey: null,
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
    });

    const result = await createBroadcastDraft(creator._id.toString(), {
      clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
    });

    expect(result).toMatchObject({
      ok: true,
      created: true,
      draft: {
        audience: { type: 'token_holders', count: 1 },
        creatorKey: {
          keyVersion: 1,
          encryptionPublicKey: creatorKey.encryptionPublicKey,
        },
        encryption: {
          contentSuite: 'XCHACHA20-POLY1305-IETF',
          keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX',
        },
        progress: { uploadedCount: 0, remainingCount: 1, complete: false },
      },
    });
    expect(insertManySpy).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          recipient: audience[0]!.recipientId,
          encryptionPublicKey: audience[0]!.encryptionPublicKey,
          accessMode: 'token',
          tokenId: audience[0]!.tokenId,
        }),
      ],
      { ordered: true },
    );
  });

  it('allows every active user type and rejects only unavailable users', async () => {
    const userId = new Types.ObjectId();
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(null) as never);

    await expect(
      createBroadcastDraft(userId.toString(), {
        clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      }),
    ).resolves.toEqual({ ok: false, reason: 'user_unavailable' });
    expect(resolveAudienceMock).not.toHaveBeenCalled();
  });
});
