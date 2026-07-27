import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import getBroadcastDrafts from '../../src/utils/broadcast/getBroadcastDrafts';

vi.mock('../../src/utils/broadcast/getBroadcastDrafts', () => ({ default: vi.fn() }));

const getBroadcastDraftsMock = vi.mocked(getBroadcastDrafts);
const creatorId = new Types.ObjectId();
const draftId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const accessToken = signAccessToken(
  { id: creatorId, role: 'user', accountType: 'creator' },
  sessionId,
);

describe('GET /v1/broadcasts/drafts', () => {
  beforeEach(() => {
    getBroadcastDraftsMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns resumable draft metadata and serializes timestamps', async () => {
    getBroadcastDraftsMock.mockResolvedValue({
      ok: true,
      drafts: {
        items: [
          {
            id: draftId.toString(),
            clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
            status: 'draft',
            audience: { type: 'all_active_users', count: 2 },
            progress: {
              uploadedCount: 1,
              remainingCount: 1,
              complete: false,
            },
            encryption: {
              version: 1,
              contentSuite: 'XCHACHA20-POLY1305-IETF',
              keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX',
            },
            creatorKey: {
              keyVersion: 1,
              encryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
            },
            createdAt: new Date('2026-07-27T12:00:00.000Z'),
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
    });

    const response = await request(app)
      .get('/v1/broadcasts/drafts')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.result.drafts.items[0]).toMatchObject({
      id: draftId.toString(),
      createdAt: '2026-07-27T12:00:00.000Z',
      progress: { uploadedCount: 1 },
    });
    expect(getBroadcastDraftsMock).toHaveBeenCalledWith(creatorId.toString(), {
      limit: 20,
    });
  });

  it('strictly rejects unknown pagination parameters', async () => {
    const response = await request(app)
      .get('/v1/broadcasts/drafts')
      .query({ unknown: 'value' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(getBroadcastDraftsMock).not.toHaveBeenCalled();
  });
});
