import type { LoginFailureReason, RegistrationFailureReason } from '../auth';

export const loginErrors: Record<
  LoginFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  proof_expired: {
    statusCode: 401,
    code: 'LOGIN_PROOF_EXPIRED',
    message: 'The signed login proof is outside the allowed time window',
  },
  proof_replayed: {
    statusCode: 409,
    code: 'LOGIN_PROOF_REPLAYED',
    message: 'This login proof was already used',
  },
  invalid_signature: {
    statusCode: 401,
    code: 'INVALID_LOGIN_SIGNATURE',
    message: 'The derived-key login signature is invalid',
  },
  account_unavailable: {
    statusCode: 403,
    code: 'ACCOUNT_UNAVAILABLE',
    message: 'The account is not available for login',
  },
};

export const registrationErrors: Record<
  RegistrationFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  username_taken: { statusCode: 409, code: 'USERNAME_TAKEN', message: 'Username is already taken' },
  wallet_already_registered: {
    statusCode: 409,
    code: 'WALLET_ALREADY_REGISTERED',
    message: 'Wallet is already registered',
  },
  public_key_already_registered: {
    statusCode: 409,
    code: 'PUBLIC_KEY_ALREADY_REGISTERED',
    message: 'A BeSeen public key is already registered',
  },
  wallet_not_verified_by_blux: {
    statusCode: 403,
    code: 'WALLET_NOT_VERIFIED_BY_BLUX',
    message: 'Wallet was not found in the configured BLUX project',
  },
  blux_verification_unavailable: {
    statusCode: 503,
    code: 'BLUX_VERIFICATION_UNAVAILABLE',
    message: 'Wallet verification service is unavailable',
  },
  invalid_avatar: {
    statusCode: 400,
    code: 'INVALID_AVATAR',
    message: 'Avatar must be a valid JPEG, PNG, or WebP image of at least 128x128 pixels',
  },
  avatar_storage_unavailable: {
    statusCode: 503,
    code: 'AVATAR_STORAGE_UNAVAILABLE',
    message: 'Avatar storage is temporarily unavailable',
  },
};
