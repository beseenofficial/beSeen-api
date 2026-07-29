import type { ClientSession, Types } from 'mongoose';

import env from '../../env';
import signAccessToken from './signAccessToken';
import AuthSession from '../../models/AuthSession';
import type { UserRole } from '../../constant/user';
import { generateRefreshToken, hashRefreshToken } from './refreshToken';

interface SessionUser {
  id: Types.ObjectId;
  role: UserRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshTokenExpiresAt: Date;
}

const createAuthSession = async (
  user: SessionUser,
  databaseSession?: ClientSession,
): Promise<AuthTokens> => {
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1_000);
  const authSession = new AuthSession({
    user: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshTokenExpiresAt,
  });

  await authSession.save(databaseSession ? { session: databaseSession } : undefined);

  const accessToken = signAccessToken(user, authSession._id);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenExpiresAt,
  };
};

export default createAuthSession;
export type { AuthTokens, SessionUser };
