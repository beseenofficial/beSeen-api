import type { UserVerification } from '../../types/auth';

interface VerifiableUser {
  verificationGrantedAt: Date | null;
  verificationExpiresAt: Date | null;
}

const getUserVerification = (user: VerifiableUser, now: Date = new Date()): UserVerification => ({
  isVerified: Boolean(
    user.verificationGrantedAt &&
    user.verificationExpiresAt &&
    user.verificationGrantedAt.getTime() <= now.getTime() &&
    user.verificationExpiresAt.getTime() > now.getTime(),
  ),
  grantedAt: user.verificationGrantedAt,
  expiresAt: user.verificationExpiresAt,
});

export default getUserVerification;
