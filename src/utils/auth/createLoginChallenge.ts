import env from '../../env';
import AuthChallenge from '../../models/AuthChallenge';
import User from '../../models/User';
import type { LoginChallengeBody } from '../../validation/auth/loginChallenge';
import buildLoginMessage from './buildLoginMessage';
import generateAuthNonce from './generateAuthNonce';

type CreateLoginChallengeResult =
  | { ok: true; challengeId: string; message: string; expiresAt: Date }
  | { ok: false; reason: 'account_unavailable' };

const createLoginChallenge = async (
  body: LoginChallengeBody,
): Promise<CreateLoginChallengeResult> => {
  const user = await User.exists({
    walletAddress: body.walletAddress,
    status: 'active',
    deletedAt: null,
  });

  if (!user) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + env.AUTH_CHALLENGE_TTL_SECONDS * 1_000);
  const nonce = generateAuthNonce();
  const message = buildLoginMessage({
    domain: env.AUTH_DOMAIN,
    network: env.STELLAR_NETWORK,
    walletAddress: body.walletAddress,
    nonce,
    issuedAt,
    expiresAt,
  });
  const challenge = await AuthChallenge.create({
    purpose: 'login',
    walletAddress: body.walletAddress,
    nonce,
    message,
    expiresAt,
    purgeAt: expiresAt,
  });

  return {
    ok: true,
    challengeId: challenge._id.toString(),
    message: challenge.message,
    expiresAt: challenge.expiresAt,
  };
};

export default createLoginChallenge;
export type { CreateLoginChallengeResult };
