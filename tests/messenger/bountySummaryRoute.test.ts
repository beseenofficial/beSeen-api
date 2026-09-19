import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import getAvailableBountySummary from '../../src/utils/messenger/getAvailableBountySummary';

vi.mock('../../src/utils/messenger/getAvailableBountySummary', () => ({ default: vi.fn() }));

const getAvailableBountySummaryMock = vi.mocked(getAvailableBountySummary);
const userId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const otherUserId = new Types.ObjectId();
const accessToken = signAccessToken({ id: userId, role: 'user' }, sessionId);

describe('GET /v1/messenger/bounties/summary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getAvailableBountySummaryMock.mockReset();
  });

  it('returns the authenticated user summary and ignores query-string user IDs', async () => {
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId } as never);
    getAvailableBountySummaryMock.mockResolvedValue({
      unclaimedCount: 3,
      updatedAt: new Date('2026-09-19T12:00:00.000Z'),
    });

    const response = await request(app)
      .get(`/v1/messenger/bounties/summary?userId=${otherUserId.toString()}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      message: 'Available bounty summary retrieved',
      result: {
        unclaimedCount: 3,
        updatedAt: '2026-09-19T12:00:00.000Z',
      },
    });
    expect(getAvailableBountySummaryMock).toHaveBeenCalledWith(userId.toString());
  });

  it('rejects unauthenticated requests without querying bounty data', async () => {
    const response = await request(app).get('/v1/messenger/bounties/summary');

    expect(response.status).toBe(401);
    expect(response.body.result.code).toBe('UNAUTHORIZED');
    expect(getAvailableBountySummaryMock).not.toHaveBeenCalled();
  });
});
