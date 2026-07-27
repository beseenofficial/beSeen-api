import { MAX_AUTH_CHALLENGE_ATTEMPTS } from '../../constant/auth';
import env from '../../env';
import AuthChallenge from '../../models/AuthChallenge';
import type { RegistrationVerifyBody } from '../../validation/auth/registrationVerify';
import verifySep53Signature from '../stellar/verifySep53Signature';
import { generateRegistrationToken, hashRegistrationToken } from './registrationToken';

type RegistrationVerificationFailureReason =
  | 'challenge_not_found'
  | 'challenge_expired'
  | 'challenge_already_used'
  | 'attempts_exceeded'
  | 'invalid_signature';

interface VerifiedRegistrationChallenge {
  ok: true;
  registrationToken: string;
  expiresAt: Date;
}

interface RejectedRegistrationVerification {
  ok: false;
  reason: RegistrationVerificationFailureReason;
  attemptsRemaining?: number;
}

type VerifyRegistrationChallengeResult =
  VerifiedRegistrationChallenge | RejectedRegistrationVerification;

const verifyRegistrationChallenge = async (
  body: RegistrationVerifyBody,
): Promise<VerifyRegistrationChallengeResult> => {
  const challenge = await AuthChallenge.findOne({
    _id: body.challengeId,
    purpose: 'registration',
  }).exec();

  if (!challenge) {
    return { ok: false, reason: 'challenge_not_found' };
  }

  const now = new Date();

  if (challenge.usedAt) {
    return { ok: false, reason: 'challenge_already_used' };
  }

  if (challenge.expiresAt <= now) {
    return { ok: false, reason: 'challenge_expired' };
  }

  if (challenge.attempts >= MAX_AUTH_CHALLENGE_ATTEMPTS) {
    return { ok: false, reason: 'attempts_exceeded' };
  }

  const isSignatureValid = verifySep53Signature(
    challenge.walletAddress,
    challenge.message,
    body.signature,
  );

  if (!isSignatureValid) {
    await AuthChallenge.updateOne(
      {
        _id: challenge._id,
        usedAt: null,
        attempts: { $lt: MAX_AUTH_CHALLENGE_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
    ).exec();

    return {
      ok: false,
      reason: 'invalid_signature',
      attemptsRemaining: Math.max(0, MAX_AUTH_CHALLENGE_ATTEMPTS - challenge.attempts - 1),
    };
  }

  const registrationToken = generateRegistrationToken();
  const registrationTokenHash = hashRegistrationToken(registrationToken);
  const registrationTokenExpiresAt = new Date(
    now.getTime() + env.REGISTRATION_TOKEN_TTL_SECONDS * 1_000,
  );

  const consumedChallenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      purpose: 'registration',
      usedAt: null,
      expiresAt: { $gt: now },
      attempts: { $lt: MAX_AUTH_CHALLENGE_ATTEMPTS },
    },
    {
      $set: {
        usedAt: now,
        registrationTokenHash,
        registrationTokenExpiresAt,
        purgeAt: registrationTokenExpiresAt,
      },
    },
    { new: true },
  ).exec();

  if (!consumedChallenge) {
    return { ok: false, reason: 'challenge_already_used' };
  }

  return {
    ok: true,
    registrationToken,
    expiresAt: registrationTokenExpiresAt,
  };
};

export default verifyRegistrationChallenge;
export type {
  RegistrationVerificationFailureReason,
  RejectedRegistrationVerification,
  VerifiedRegistrationChallenge,
  VerifyRegistrationChallengeResult,
};
