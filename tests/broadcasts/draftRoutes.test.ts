import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import createBroadcastDraft from '../../src/utils/broadcast/createBroadcastDraft';
import getBroadcastDraftRecipients from '../../src/utils/broadcast/getBroadcastDraftRecipients';

vi.mock('../../src/utils/broadcast/createBroadcastDraft', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/broadcast/getBroadcastDraftRecipients', () => ({ default: vi.fn() }));

const createDraftMock = vi.mocked(createBroadcastDraft);

const getRecipientsMock = vi.mocked(getBroadcastDraftRecipients);

const creatorId = new Types.ObjectId();

const draftId = new Types.ObjectId();

const recipientId = new Types.ObjectId();

const sessionId = new Types.ObjectId();

const accessToken = signAccessToken({ id: creatorId, role: 'user' }, sessionId);

const encryptionPublicKey = Buffer.alloc(32, 2).toString('base64');

describe('broadcast draft routes', () => {
  beforeEach(() => {
    createDraftMock.mockReset();
    getRecipientsMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a draft and returns the first recipient key page in one request', async () => {
    createDraftMock.mockResolvedValue({
      ok: true,
      created: true,
      draft: {
        id: draftId.toString(),
        clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
        status: 'draft',
        audience: { type: 'demo_all_users', count: 1 },
        encryption: {
          version: 1,
          contentSuite: 'XCHACHA20-POLY1305-IETF',
          keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX',
        },
        creatorKey: { keyVersion: 1, encryptionPublicKey },
        progress: { uploadedCount: 0, remainingCount: 1, complete: false },
        recipients: {
          items: [
            {
              userId: recipientId.toString(),
              username: 'member_user',
              keyVersion: 1,
              encryptionPublicKey,
              keyUploaded: false,
              encryptedBroadcastKey: null,
            },
          ],
          nextCursor: null,
          hasMore: false,
        },
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
        expiresAt: new Date('2026-08-03T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .post('/v1/broadcasts/drafts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365' });

    expect(response.status).toBe(201);
    expect(response.body.result.draft).toMatchObject({
      id: draftId.toString(),
      audience: { count: 1 },
      createdAt: '2026-07-27T12:00:00.000Z',
    });
  });

  it('strictly rejects plaintext, private keys, and client-supplied recipient lists', async () => {
    const response = await request(app)
      .post('/v1/broadcasts/drafts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
        plaintext: 'secret',
        privateKey: 'secret',
        recipients: [recipientId.toString()],
      });

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(createDraftMock).not.toHaveBeenCalled();
  });

  it('gets later recipient pages using an opaque ObjectId cursor', async () => {
    getRecipientsMock.mockResolvedValue({
      ok: true,
      draft: {
        id: draftId.toString(),
        clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
        status: 'draft',
        audienceType: 'demo_all_users',
        audienceCount: 1,
        progress: { uploadedCount: 0, remainingCount: 1, complete: false },
        expiresAt: new Date('2026-08-03T12:00:00.000Z'),
      },
      recipients: {
        items: [],
        nextCursor: null,
        hasMore: false,
      },
    });

    const response = await request(app)
      .get(`/v1/broadcasts/drafts/${draftId.toString()}/recipients`)
      .query({ cursor: recipientId.toString(), limit: 50 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(getRecipientsMock).toHaveBeenCalledWith(creatorId.toString(), draftId.toString(), {
      cursor: recipientId.toString(),
      limit: 50,
    });
  });
});
