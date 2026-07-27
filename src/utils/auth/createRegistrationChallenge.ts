import env from '../../env';
import AuthChallenge from '../../models/AuthChallenge';
import User from '../../models/User';
import UserKey from '../../models/UserKey';
import type { RegistrationChallengeBody } from '../../validation/auth/registrationChallenge';
import buildRegistrationMessage from './buildRegistrationMessage';
import generateAuthNonce from './generateAuthNonce';

type RegistrationChallengeConflict = 'wallet_already_registered' | 'public_key_already_registered';

interface CreatedRegistrationChallenge {
  ok: true;
  challengeId: string;
  message: string;
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

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + env.AUTH_CHALLENGE_TTL_SECONDS * 1_000);
  const nonce = generateAuthNonce();
  const message = buildRegistrationMessage({
    domain: env.AUTH_DOMAIN,
    network: env.STELLAR_NETWORK,
    walletAddress,
    signingPublicKey: keys.signing.publicKey,
    encryptionPublicKey: keys.encryption.publicKey,
    nonce,
    issuedAt,
    expiresAt,
  });

  const challenge = await AuthChallenge.create({
    purpose: 'registration',
    walletAddress,
    nonce,
    message,
    signingPublicKey: keys.signing.publicKey,
    encryptionPublicKey: keys.encryption.publicKey,
    derivationVersion: keys.derivationVersion,
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

export default createRegistrationChallenge;
export type {
  CreateRegistrationChallengeResult,
  CreatedRegistrationChallenge,
  RegistrationChallengeConflict,
  RejectedRegistrationChallenge,
};
