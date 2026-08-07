import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import claimMessageBounty from '../../src/utils/messenger/claimMessageBounty';

vi.mock('../../src/utils/messenger/claimMessageBounty', () => ({ default: vi.fn() }));

const claimMessageBountyMock = vi.mocked(claimMessageBounty);
const userId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const bountyId = new Types.ObjectId();
const accessToken = signAccessToken({ id: userId, role: 'user' }, sessionId);
const timestamp = new Date('2026-08-07T12:00:00.000Z');

describe('POST /v1/messenger/bounties/:bountyId/claim', () => {
  beforeEach(() => {
    claimMessageBountyMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId } as never);
  });

  it('claims the demo bounty and serializes its dates', async () => {
    claimMessageBountyMock.mockResolvedValue({
      ok: true,
      claimedNow: true,
      bounty: {
        id: bountyId.toString(),
        assetCode: 'USDC',
        amount: '10',
        durationSeconds: 3_600,
        status: 'claimed',
        expiresAt: timestamp,
        replyMessageId: new Types.ObjectId().toString(),
        claimableAt: timestamp,
        claimedAt: timestamp,
      },
    });

    const response = await request(app)
      .post(`/v1/messenger/bounties/${bountyId.toString()}/claim`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject({
      claimedNow: true,
      bounty: { status: 'claimed', claimedAt: timestamp.toISOString() },
    });
    expect(claimMessageBountyMock).toHaveBeenCalledWith(
      userId.toString(),
      bountyId.toString(),
    );
  });

  it('maps a bounty that was never unlocked to a stable conflict', async () => {
    claimMessageBountyMock.mockResolvedValue({
      ok: false,
      reason: 'bounty_not_claimable',
    });

    const response = await request(app)
      .post(`/v1/messenger/bounties/${bountyId.toString()}/claim`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(409);
    expect(response.body.result.code).toBe('BOUNTY_NOT_CLAIMABLE');
  });
});
