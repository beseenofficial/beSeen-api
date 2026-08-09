import env from '../../env';
import User from '../../models/User';
import signAccessToken from './signAccessToken';
import AuthSession from '../../models/AuthSession';
import type { RefreshAuthSessionResult } from '../../types/auth';
import { generateRefreshToken, hashRefreshToken } from './refreshToken';

const refreshAuthSession = async (refreshToken: string): Promise<RefreshAuthSessionResult> => {
  const now = new Date();

  const currentRefreshTokenHash = hashRefreshToken(refreshToken);

  const authSession = await AuthSession.findOne({
    refreshTokenHash: currentRefreshTokenHash,
    revokedAt: null,
    expiresAt: { $gt: now },
  }).exec();

  if (!authSession) {
    return { ok: false, reason: 'refresh_token_invalid' };
  }

  const user = await User.findOne({
    _id: authSession.user,
    status: 'active',
    deletedAt: null,
  }).exec();

  if (!user) {
    await AuthSession.updateOne({ _id: authSession._id }, { $set: { revokedAt: now } }).exec();
    return { ok: false, reason: 'refresh_token_invalid' };
  }

  const nextRefreshToken = generateRefreshToken();

  const rotatedSession = await AuthSession.findOneAndUpdate(
    {
      _id: authSession._id,
      refreshTokenHash: currentRefreshTokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        refreshTokenHash: hashRefreshToken(nextRefreshToken),
        lastUsedAt: now,
      },
    },
    { returnDocument: 'after' },
  ).exec();

  if (!rotatedSession) {
    return { ok: false, reason: 'refresh_token_invalid' };
  }

  return {
    ok: true,
    auth: {
      accessToken: signAccessToken({ id: user._id, role: user.role }, rotatedSession._id),
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresAt: rotatedSession.expiresAt,
    },
  };
};

export default refreshAuthSession;
