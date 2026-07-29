import { LoginFailureReason } from "../../utils/auth/loginUser";
import { RegistrationFailureReason } from "../../utils/auth/registerUser";

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
};