import AuthChallenge from '../../models/AuthChallenge';
import User from '../../models/User';
import UserKey from '../../models/UserKey';
import type { RegistrationChallengeBody } from '../../validation/auth/registrationChallenge';
import generateAuthNonce from './generateAuthNonce';
import { buildSep10Challenge } from '../stellar/sep10Challenge';

type RegistrationChallengeConflict = 'wallet_already_registered' | 'public_key_already_registered';

interface CreatedRegistrationChallenge {
  ok: true;
  challengeId: string;
  transactionXdr: string;
  networkPassphrase: string;
  stellarNetwork: 'public' | 'testnet';
  serverSigningPublicKey: string;
  homeDomain: string;
  expiresAt: Date;
}

interface RejectedRegistrationChallenge {
  ok: false;
  reason: RegistrationChallengeConflict;
}

type CreateRegistrationChallengeResult =
  CreatedRegistrationChallenge | RejectedRegistrationChallenge;

const createRegistrationChallenge = async (
  body: RegistrationChallengeBody,
): Promise<CreateRegistrationChallengeResult> => {
  const { walletAddress, keys } = body;

  const existingUser = await User.exists({ walletAddress });

  if (existingUser) {
    return { ok: false, reason: 'wallet_already_registered' };
  }

  const existingPublicKey = await UserKey.exists({
    $or: [
      { signingPublicKey: keys.signing.publicKey },
      { encryptionPublicKey: keys.encryption.publicKey },
    ],
  });

  if (existingPublicKey) {
    return { ok: false, reason: 'public_key_already_registered' };
  }

  const nonce = generateAuthNonce();
  const sep10 = buildSep10Challenge(walletAddress);

  const challenge = await AuthChallenge.create({
    purpose: 'registration',
    walletAddress,
    nonce,
    transactionXdr: sep10.transactionXdr,
    serverSigningPublicKey: sep10.serverSigningPublicKey,
    stellarNetwork: sep10.stellarNetwork,
    authDomain: sep10.homeDomain,
    signingPublicKey: keys.signing.publicKey,
    encryptionPublicKey: keys.encryption.publicKey,
    derivationVersion: keys.derivationVersion,
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

export default createRegistrationChallenge;
export type {
  CreateRegistrationChallengeResult,
  CreatedRegistrationChallenge,
  RegistrationChallengeConflict,
  RejectedRegistrationChallenge,
};
