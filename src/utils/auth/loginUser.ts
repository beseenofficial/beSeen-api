import type { ClientSession } from 'mongoose';

import User from '../../models/User';
import UserKey from '../../models/UserKey';
import AuthProof from '../../models/AuthProof';
import { withDatabaseTransaction } from '../../db';
import createAuthSession from './createAuthSession';
import type { AuthTokens } from './createAuthSession';
import type { AuthenticatedUser } from '../../types/auth';
import type { LoginBody } from '../../validation/auth/login';
import buildLoginProofMessage from './buildLoginProofMessage';
import { LOGIN_PROOF_MAX_AGE_SECONDS } from '../../constant/auth';
import verifyEd25519Signature from '../crypto/verifyEd25519Signature';

type LoginFailureReason =
  'proof_expired' | 'proof_replayed' | 'invalid_signature' | 'account_unavailable';

type LoginUserResult =
  | { ok: true; user: AuthenticatedUser; auth: AuthTokens }
  | { ok: false; reason: LoginFailureReason };

const isDuplicateKeyError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 11_000;

const createLoginSession = async (
  user: InstanceType<typeof User>,
  body: LoginBody,
  session: ClientSession,
): Promise<LoginUserResult> => {
  const proof = new AuthProof({
    purpose: 'login',
    walletAddress: body.walletAddress,
    requestId: body.requestId,
    issuedAt: new Date(body.issuedAt),
    expiresAt: new Date(Date.now() + LOGIN_PROOF_MAX_AGE_SECONDS * 1_000),
  });

  await proof.save({ session });

  const auth = await createAuthSession({ id: user._id, role: user.role }, session);

  return {
    ok: true,
    auth,
    user: {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  };
};

const loginUser = async (body: LoginBody): Promise<LoginUserResult> => {
  const issuedAt = new Date(body.issuedAt).getTime();

  if (Math.abs(Date.now() - issuedAt) > LOGIN_PROOF_MAX_AGE_SECONDS * 1_000) {
    return { ok: false, reason: 'proof_expired' };
  }

  const user = await User.findOne({
    walletAddress: body.walletAddress,
    status: 'active',
    deletedAt: null,
  }).exec();

  if (!user) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const key = await UserKey.findOne({ user: user._id, status: 'active', revokedAt: null }).exec();

  if (!key) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const message = buildLoginProofMessage(body);

  if (!verifyEd25519Signature(key.signingPublicKey, message, body.signature)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  try {
    return await withDatabaseTransaction((session) => createLoginSession(user, body, session));
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      return { ok: false, reason: 'proof_replayed' };
    }
    throw error;
  }
};

export default loginUser;
export type { LoginFailureReason, LoginUserResult };
