import { describe, expect, it } from 'vitest';

import getUserVerification from '../../src/utils/user/getUserVerification';

const now = new Date('2026-08-28T12:00:00.000Z');

describe('getUserVerification', () => {
  it('marks only a currently active verification period as verified', () => {
    const grantedAt = new Date('2026-08-01T00:00:00.000Z');
    const expiresAt = new Date('2026-09-01T00:00:00.000Z');

    expect(
      getUserVerification(
        { verificationGrantedAt: grantedAt, verificationExpiresAt: expiresAt },
        now,
      ),
    ).toEqual({ isVerified: true, grantedAt, expiresAt });
  });

  it('automatically treats expired, future, and absent periods as unverified', () => {
    expect(
      getUserVerification(
        {
          verificationGrantedAt: new Date('2026-07-01T00:00:00.000Z'),
          verificationExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
        },
        now,
      ).isVerified,
    ).toBe(false);
    expect(
      getUserVerification(
        {
          verificationGrantedAt: new Date('2026-09-01T00:00:00.000Z'),
          verificationExpiresAt: new Date('2026-10-01T00:00:00.000Z'),
        },
        now,
      ).isVerified,
    ).toBe(false);
    expect(
      getUserVerification({ verificationGrantedAt: null, verificationExpiresAt: null }, now),
    ).toEqual({ isVerified: false, grantedAt: null, expiresAt: null });
  });
});
