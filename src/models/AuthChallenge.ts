import { Schema, model } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import {
  AUTH_CHALLENGE_PURPOSES,
  AUTH_NONCE_PATTERN,
  KEY_DERIVATION_VERSION,
  MAX_AUTH_CHALLENGE_ATTEMPTS,
} from '../constant/auth';
import type { AuthChallengePurpose } from '../constant/auth';
import isBase64PublicKey from '../utils/auth/isBase64PublicKey';
import isValidStellarGAddress from '../utils/stellar/isValidStellarGAddress';

interface IAuthChallenge {
  purpose: AuthChallengePurpose;
  walletAddress: string;
  nonce: string;
  message: string;
  signingPublicKey: string | null;
  encryptionPublicKey: string | null;
  derivationVersion: number | null;
  expiresAt: Date;
  purgeAt: Date;
  usedAt: Date | null;
  attempts: number;
  registrationTokenHash: string | null;
  registrationTokenExpiresAt: Date | null;
  registrationTokenUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type AuthChallengeDocument = HydratedDocument<IAuthChallenge>;

const optionalPublicKeyValidation = {
  validator: (value: string | null) => value === null || isBase64PublicKey(value),
  message: 'Public key must be a canonical base64-encoded 32-byte key',
};

const authChallengeSchema = new Schema<IAuthChallenge>(
  {
    purpose: {
      type: String,
      enum: AUTH_CHALLENGE_PURPOSES,
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: isValidStellarGAddress,
        message: 'Wallet address must be a valid Stellar G address',
      },
    },
    nonce: {
      type: String,
      required: true,
      match: [AUTH_NONCE_PATTERN, 'Nonce must be a 32-byte base64url value'],
    },
    message: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 2_048,
    },
    signingPublicKey: {
      type: String,
      default: null,
      validate: optionalPublicKeyValidation,
    },
    encryptionPublicKey: {
      type: String,
      default: null,
      validate: optionalPublicKeyValidation,
    },
    derivationVersion: {
      type: Number,
      min: 1,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    purgeAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    attempts: {
      type: Number,
      min: 0,
      max: MAX_AUTH_CHALLENGE_ATTEMPTS,
      default: 0,
      required: true,
    },
    registrationTokenHash: {
      type: String,
      match: [/^[a-f0-9]{64}$/, 'Registration token hash must be a SHA-256 hex value'],
      default: null,
      select: false,
    },
    registrationTokenExpiresAt: {
      type: Date,
      default: null,
    },
    registrationTokenUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

authChallengeSchema.pre('validate', function validateRegistrationKeyBinding() {
  if (this.purpose !== 'registration') {
    return;
  }

  if (!this.signingPublicKey) {
    this.invalidate('signingPublicKey', 'Registration requires a signing public key');
  }

  if (!this.encryptionPublicKey) {
    this.invalidate('encryptionPublicKey', 'Registration requires an encryption public key');
  }

  if (this.derivationVersion !== KEY_DERIVATION_VERSION) {
    this.invalidate(
      'derivationVersion',
      `Registration requires key derivation version ${KEY_DERIVATION_VERSION}`,
    );
  }
});

authChallengeSchema.index({ nonce: 1 }, { unique: true, name: 'auth_challenges_nonce_unique' });
authChallengeSchema.index(
  { purgeAt: 1 },
  { expireAfterSeconds: 0, name: 'auth_challenges_purge_ttl' },
);
authChallengeSchema.index(
  { registrationTokenHash: 1 },
  {
    unique: true,
    partialFilterExpression: { registrationTokenHash: { $type: 'string' } },
    name: 'auth_challenges_registration_token_hash_unique',
  },
);
authChallengeSchema.index(
  { walletAddress: 1, purpose: 1, usedAt: 1 },
  { name: 'auth_challenges_wallet_purpose_used' },
);

const AuthChallenge = model<IAuthChallenge>('AuthChallenge', authChallengeSchema);

export default AuthChallenge;
export type { AuthChallengeDocument, IAuthChallenge };
