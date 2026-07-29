import env from '../../env';
import AuthSession from '../../models/AuthSession';
import User from '../../models/User';
import type { AuthTokens } from './createAuthSession';
import { generateRefreshToken, hashRefreshToken } from './refreshToken';
import signAccessToken from './signAccessToken';

type RefreshAuthSessionResult =
  { ok: true; auth: AuthTokens } | { ok: false; reason: 'refresh_token_invalid' };

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
    { new: true },
  ).exec();

  if (!rotatedSession) {
    return { ok: false, reason: 'refresh_token_invalid' };
  }

  return {
    ok: true,
    auth: {
      accessToken: signAccessToken(
        { id: user._id, role: user.role },
        rotatedSession._id,
      ),
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresAt: rotatedSession.expiresAt,
    },
  };
};

export default refreshAuthSession;
export type { RefreshAuthSessionResult };
