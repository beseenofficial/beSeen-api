import AuthChallenge from '../../models/AuthChallenge';
import User from '../../models/User';
import type { LoginChallengeBody } from '../../validation/auth/loginChallenge';
import generateAuthNonce from './generateAuthNonce';
import { buildSep10Challenge } from '../stellar/sep10Challenge';

type CreateLoginChallengeResult =
  | {
      ok: true;
      challengeId: string;
      transactionXdr: string;
      networkPassphrase: string;
      stellarNetwork: 'public' | 'testnet';
      serverSigningPublicKey: string;
      homeDomain: string;
      expiresAt: Date;
    }
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

  const nonce = generateAuthNonce();
  const sep10 = buildSep10Challenge(body.walletAddress);
  const challenge = await AuthChallenge.create({
    purpose: 'login',
    walletAddress: body.walletAddress,
    nonce,
    transactionXdr: sep10.transactionXdr,
    serverSigningPublicKey: sep10.serverSigningPublicKey,
    stellarNetwork: sep10.stellarNetwork,
    authDomain: sep10.homeDomain,
    expiresAt: sep10.expiresAt,
    purgeAt: sep10.expiresAt,
  });

  return {
    ok: true,
    challengeId: challenge._id.toString(),
    transactionXdr: challenge.transactionXdr,
    networkPassphrase: sep10.networkPassphrase,
    stellarNetwork: sep10.stellarNetwork,
    serverSigningPublicKey: challenge.serverSigningPublicKey,
    homeDomain: challenge.authDomain,
    expiresAt: challenge.expiresAt,
  };
};

export default createLoginChallenge;
export type { CreateLoginChallengeResult };
