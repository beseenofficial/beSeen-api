import app from '../../src/app';
import request from 'supertest';
import { Types } from 'mongoose';
import AuthSession from '../../src/models/AuthSession';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import registerAuraPurchase from '../../src/utils/aura/registerAuraPurchase';

vi.mock('../../src/utils/aura/registerAuraPurchase', () => ({ default: vi.fn() }));

const userId = new Types.ObjectId();

const sessionId = new Types.ObjectId();

const token = signAccessToken({ id: userId, role: 'user' }, sessionId);

const registerMock = vi.mocked(registerAuraPurchase);

const body = {
  tokenId: '42',
  buyerAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV',
  subjectAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
  transactionHash: 'a'.repeat(64),
};

describe('POST /v1/users/:username/aura/purchases', () => {
  beforeEach(() => {
    registerMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId } as never);
  });

  it('returns 202 while a valid client purchase waits for chain confirmation', async () => {
    registerMock.mockResolvedValue({
      ok: true,
      created: true,
      purchase: {
        tokenId: '42',
        buyerId: userId.toString(),
        subjectId: new Types.ObjectId().toString(),
        subjectUsername: 'subject_user',
        transactionHash: body.transactionHash,
        status: 'pending',
        confirmedAt: null,
      },
      conversation: null,
    });

    const response = await request(app)
      .post('/v1/users/subject_user/aura/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    expect(response.status).toBe(202);
    expect(response.body.result.purchase).toMatchObject({ tokenId: '42', status: 'pending' });
    expect(registerMock).toHaveBeenCalledWith(userId.toString(), 'subject_user', body);
  });

  it('rejects malformed token IDs before registration', async () => {
    const response = await request(app)
      .post('/v1/users/subject_user/aura/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...body, tokenId: '0' });

    expect(response.status).toBe(400);
    expect(registerMock).not.toHaveBeenCalled();
  });
});
