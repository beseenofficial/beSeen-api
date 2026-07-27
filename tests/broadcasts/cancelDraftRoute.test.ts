import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import cancelBroadcastDraft from '../../src/utils/broadcast/cancelBroadcastDraft';

vi.mock('../../src/utils/broadcast/cancelBroadcastDraft', () => ({ default: vi.fn() }));

const cancelDraftMock = vi.mocked(cancelBroadcastDraft);
const creatorId = new Types.ObjectId();
const draftId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const accessToken = signAccessToken(
  { id: creatorId, role: 'user', accountType: 'creator' },
  sessionId,
);

describe('DELETE /v1/broadcasts/drafts/:draftId', () => {
  beforeEach(() => {
    cancelDraftMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cancels an owned draft and reports removed encrypted rows', async () => {
    cancelDraftMock.mockResolvedValue({
      ok: true,
      canceledNow: true,
      canceledAt: new Date('2026-07-27T12:00:00.000Z'),
      removedRecipientCount: 3,
    });

    const response = await request(app)
      .delete(`/v1/broadcasts/drafts/${draftId.toString()}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.result.draft).toEqual({
      id: draftId.toString(),
      status: 'canceled',
      canceledAt: '2026-07-27T12:00:00.000Z',
      removedRecipientCount: 3,
    });
  });

  it('refuses to cancel a published broadcast', async () => {
    cancelDraftMock.mockResolvedValue({ ok: false, reason: 'published_broadcast' });

    const response = await request(app)
      .delete(`/v1/broadcasts/drafts/${draftId.toString()}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(409);
    expect(response.body.result.code).toBe('BROADCAST_ALREADY_PUBLISHED');
  });
});
