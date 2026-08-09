import { Schema, model } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import isValidStellarGAddress from '../utils/stellar/isValidStellarGAddress';

interface IAuthProof {
  purpose: 'login';
  walletAddress: string;
  requestId: string;
  issuedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

type AuthProofDocument = HydratedDocument<IAuthProof>;

const authProofSchema = new Schema<IAuthProof>(
  {
    purpose: { type: String, enum: ['login'], required: true, immutable: true },
    walletAddress: {
      type: String,
      required: true,
      uppercase: true,
      immutable: true,
      validate: { validator: isValidStellarGAddress, message: 'Invalid Stellar wallet address' },
    },
    requestId: {
      type: String,
      required: true,
      lowercase: true,
      immutable: true,
      match: [
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        'Request ID must be a UUID',
      ],
    },
    issuedAt: { type: Date, required: true, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

authProofSchema.index(
  { purpose: 1, walletAddress: 1, requestId: 1 },
  { unique: true, name: 'auth_proofs_wallet_request_unique' },
);
authProofSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'auth_proofs_expiry_ttl' });

const AuthProof = model<IAuthProof>('AuthProof', authProofSchema);

export default AuthProof;
export type { AuthProofDocument, IAuthProof };
