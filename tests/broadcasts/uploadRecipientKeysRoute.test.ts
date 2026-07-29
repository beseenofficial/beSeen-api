import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import uploadBroadcastRecipientKeys from '../../src/utils/broadcast/uploadBroadcastRecipientKeys';

vi.mock('../../src/utils/broadcast/uploadBroadcastRecipientKeys', () => ({ default: vi.fn() }));

const uploadKeysMock = vi.mocked(uploadBroadcastRecipientKeys);
const creatorId = new Types.ObjectId();
const draftId = new Types.ObjectId();
const recipientId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const accessToken = signAccessToken(
  { id: creatorId, role: 'user' },
  sessionId,
);
const validBody = () => ({
  keys: [
    {
      recipientId: recipientId.toString(),
      keyVersion: 1,
      encryptedBroadcastKey: Buffer.alloc(80, 1).toString('base64'),
    },
  ],
});

describe('PUT /v1/broadcasts/drafts/:draftId/recipient-keys', () => {
  beforeEach(() => {
    uploadKeysMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a ciphertext-only batch and returns upload progress', async () => {
    const body = validBody();
    uploadKeysMock.mockResolvedValue({
      ok: true,
      progress: {
        acceptedCount: 1,
        uploadedCount: 1,
        audienceCount: 1,
        remainingCount: 0,
        complete: true,
      },
    });

    const response = await request(app)
      .put(`/v1/broadcasts/drafts/${draftId.toString()}/recipient-keys`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body.result.progress).toEqual(
      expect.objectContaining({ uploadedCount: 1, complete: true }),
    );
    expect(uploadKeysMock).toHaveBeenCalledWith(creatorId.toString(), draftId.toString(), body);
  });

  it('rejects malformed wrapped keys, duplicate recipients, and secret fields', async () => {
    const key = validBody().keys[0]!;
    const response = await request(app)
      .put(`/v1/broadcasts/drafts/${draftId.toString()}/recipient-keys`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        keys: [key, key],
        plaintext: 'secret',
        privateKey: 'secret',
      });

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(uploadKeysMock).not.toHaveBeenCalled();
  });

  it('returns a stable conflict when a recipient is outside the snapshot', async () => {
    uploadKeysMock.mockResolvedValue({ ok: false, reason: 'recipient_not_in_audience' });

    const response = await request(app)
      .put(`/v1/broadcasts/drafts/${draftId.toString()}/recipient-keys`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validBody());

    expect(response.status).toBe(409);
    expect(response.body.result.code).toBe('RECIPIENT_NOT_IN_AUDIENCE');
  });
});
