import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import finalizeBroadcast from '../../src/utils/broadcast/finalizeBroadcast';

vi.mock('../../src/utils/broadcast/finalizeBroadcast', () => ({ default: vi.fn() }));

const finalizeBroadcastMock = vi.mocked(finalizeBroadcast);

const creatorId = new Types.ObjectId();

const draftId = new Types.ObjectId();

const sessionId = new Types.ObjectId();

const accessToken = signAccessToken({ id: creatorId, role: 'user' }, sessionId);

const validBody = () => ({
  contentCiphertext: Buffer.alloc(32, 1).toString('base64'),
  contentNonce: Buffer.alloc(24, 2).toString('base64'),
  creatorEncryptedBroadcastKey: Buffer.alloc(80, 3).toString('base64'),
  signature: Buffer.alloc(64, 4).toString('base64'),
});

describe('POST /v1/broadcasts/drafts/:draftId/finalize', () => {
  beforeEach(() => {
    finalizeBroadcastMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes a strictly encrypted envelope', async () => {
    const body = validBody();
    finalizeBroadcastMock.mockResolvedValue({
      ok: true,
      publishedNow: true,
      broadcast: {
        id: draftId.toString(),
        clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
        creatorId: creatorId.toString(),
        status: 'published',
        audience: { type: 'demo_all_users', count: 1 },
        encryptionVersion: 1,
        ...body,
        recipientKeysDigest: 'a'.repeat(64),
        publishedAt: new Date('2026-07-27T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .post(`/v1/broadcasts/drafts/${draftId.toString()}/finalize`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body.result.broadcast).toMatchObject({
      status: 'published',
      publishedAt: '2026-07-27T12:00:00.000Z',
    });
    expect(finalizeBroadcastMock).toHaveBeenCalledWith(
      creatorId.toString(),
      draftId.toString(),
      body,
    );
  });

  it('rejects plaintext, private keys, and raw content keys', async () => {
    const response = await request(app)
      .post(`/v1/broadcasts/drafts/${draftId.toString()}/finalize`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...validBody(),
        plaintext: 'secret',
        privateKey: 'secret',
        contentKey: Buffer.alloc(32, 5).toString('base64'),
      });

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(finalizeBroadcastMock).not.toHaveBeenCalled();
  });

  it('returns remaining recipient progress when finalization is premature', async () => {
    finalizeBroadcastMock.mockResolvedValue({
      ok: false,
      reason: 'recipient_keys_incomplete',
      remainingCount: 2,
    });

    const response = await request(app)
      .post(`/v1/broadcasts/drafts/${draftId.toString()}/finalize`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validBody());

    expect(response.status).toBe(409);
    expect(response.body.result).toEqual({
      code: 'RECIPIENT_KEYS_INCOMPLETE',
      remainingCount: 2,
    });
  });
});
