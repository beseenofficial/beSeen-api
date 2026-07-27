import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import verifyRegistrationChallenge from '../../src/utils/auth/verifyRegistrationChallenge';

vi.mock('../../src/utils/auth/verifyRegistrationChallenge', () => ({
  default: vi.fn(),
}));

const validBody = () => ({
  challengeId: '507F1F77BCF86CD799439011',
  signature: Buffer.alloc(64).toString('base64'),
});

const verifyChallengeMock = vi.mocked(verifyRegistrationChallenge);

describe('POST /v1/auth/registration/verify', () => {
  beforeEach(() => {
    verifyChallengeMock.mockReset();
  });

  it('returns an opaque registration token after successful verification', async () => {
    verifyChallengeMock.mockResolvedValue({
      ok: true,
      registrationToken: 't'.repeat(43),
      expiresAt: new Date('2026-07-27T12:10:00.000Z'),
    });

    const response = await request(app).post('/v1/auth/registration/verify').send(validBody());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      message: 'Registration challenge verified',
      result: {
        registrationToken: 't'.repeat(43),
        expiresAt: '2026-07-27T12:10:00.000Z',
      },
    });
    expect(verifyChallengeMock).toHaveBeenCalledWith({
      ...validBody(),
      challengeId: validBody().challengeId.toLowerCase(),
    });
  });

  it('rejects malformed signatures before verification', async () => {
    const response = await request(app).post('/v1/auth/registration/verify').send({
      challengeId: validBody().challengeId,
      signature: 'invalid',
    });

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(verifyChallengeMock).not.toHaveBeenCalled();
  });

  it('returns 401 and remaining attempts for invalid wallet signatures', async () => {
    verifyChallengeMock.mockResolvedValue({
      ok: false,
      reason: 'invalid_signature',
      attemptsRemaining: 4,
    });

    const response = await request(app).post('/v1/auth/registration/verify').send(validBody());

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Stellar signature is invalid',
      result: {
        code: 'INVALID_STELLAR_SIGNATURE',
        attemptsRemaining: 4,
      },
    });
  });

  it('maps expired and replayed challenges to distinct responses', async () => {
    verifyChallengeMock.mockResolvedValueOnce({
      ok: false,
      reason: 'challenge_expired',
    });

    const expiredResponse = await request(app)
      .post('/v1/auth/registration/verify')
      .send(validBody());

    verifyChallengeMock.mockResolvedValueOnce({
      ok: false,
      reason: 'challenge_already_used',
    });

    const replayResponse = await request(app)
      .post('/v1/auth/registration/verify')
      .send(validBody());

    expect(expiredResponse.status).toBe(410);
    expect(expiredResponse.body.result.code).toBe('CHALLENGE_EXPIRED');
    expect(replayResponse.status).toBe(409);
    expect(replayResponse.body.result.code).toBe('CHALLENGE_ALREADY_USED');
  });
});
