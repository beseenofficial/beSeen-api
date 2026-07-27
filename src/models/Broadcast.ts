import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import {
  BROADCAST_AUDIENCE_TYPES,
  BROADCAST_CONTENT_NONCE_BYTES,
  BROADCAST_ENCRYPTION_VERSION,
  BROADCAST_MAX_CIPHERTEXT_BYTES,
  BROADCAST_MIN_CIPHERTEXT_BYTES,
  BROADCAST_STATUSES,
  BROADCAST_WRAPPED_KEY_BYTES,
} from '../constant/broadcast';
import type { BroadcastAudienceType, BroadcastStatus } from '../constant/broadcast';
import env from '../env';
import isBase64PublicKey from '../utils/auth/isBase64PublicKey';
import isCanonicalBase64 from '../utils/crypto/isCanonicalBase64';

interface IBroadcast {
  clientBroadcastId: string;
  creator: Types.ObjectId;
  status: BroadcastStatus;
  audienceType: BroadcastAudienceType;
  audienceSnapshotCount: number;
  encryptionVersion: number;
  creatorKeyVersion: number;
  creatorSigningPublicKey: string;
  creatorEncryptionPublicKey: string;
  contentCiphertext: string | null;
  contentNonce: string | null;
  creatorEncryptedBroadcastKey: string | null;
  recipientKeysDigest: string | null;
  signature: string | null;
  publishedAt: Date | null;
  canceledAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type BroadcastDocument = HydratedDocument<IBroadcast>;

const broadcastSchema = new Schema<IBroadcast>(
  {
    clientBroadcastId: {
      type: String,
      required: true,
      lowercase: true,
      match: [
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        'Client broadcast ID must be a UUID',
      ],
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: BROADCAST_STATUSES,
      default: 'draft',
      required: true,
    },
    audienceType: {
      type: String,
      enum: BROADCAST_AUDIENCE_TYPES,
      default: 'all_active_users',
      required: true,
    },
    audienceSnapshotCount: {
      type: Number,
      min: 0,
      required: true,
    },
    encryptionVersion: {
      type: Number,
      enum: [BROADCAST_ENCRYPTION_VERSION],
      required: true,
    },
    creatorKeyVersion: {
      type: Number,
      min: 1,
      required: true,
    },
    creatorSigningPublicKey: {
      type: String,
      required: true,
      validate: {
        validator: isBase64PublicKey,
        message: 'Creator signing public key must be a canonical base64-encoded 32-byte key',
      },
    },
    creatorEncryptionPublicKey: {
      type: String,
      required: true,
      validate: {
        validator: isBase64PublicKey,
        message: 'Creator encryption public key must be a canonical base64-encoded 32-byte key',
      },
    },
    contentCiphertext: {
      type: String,
      default: null,
      validate: {
        validator: (value: string | null) =>
          value === null ||
          isCanonicalBase64(value, {
            minBytes: BROADCAST_MIN_CIPHERTEXT_BYTES,
            maxBytes: BROADCAST_MAX_CIPHERTEXT_BYTES,
          }),
        message: 'Content ciphertext must be canonical base64 within the payload size limit',
      },
    },
    contentNonce: {
      type: String,
      default: null,
      validate: {
        validator: (value: string | null) =>
          value === null ||
          isCanonicalBase64(value, {
            minBytes: BROADCAST_CONTENT_NONCE_BYTES,
            maxBytes: BROADCAST_CONTENT_NONCE_BYTES,
          }),
        message: 'Content nonce must be canonical base64 containing exactly 24 bytes',
      },
    },
    creatorEncryptedBroadcastKey: {
      type: String,
      default: null,
      validate: {
        validator: (value: string | null) =>
          value === null ||
          isCanonicalBase64(value, {
            minBytes: BROADCAST_WRAPPED_KEY_BYTES,
            maxBytes: BROADCAST_WRAPPED_KEY_BYTES,
          }),
        message: 'Creator encrypted broadcast key must be a canonical base64 sealed-box ciphertext',
      },
    },
    recipientKeysDigest: {
      type: String,
      default: null,
      match: [/^[a-f\d]{64}$/, 'Recipient keys digest must be a lowercase SHA-256 hex digest'],
    },
    signature: {
      type: String,
      default: null,
      validate: {
        validator: (value: string | null) =>
          value === null || isCanonicalBase64(value, { minBytes: 64, maxBytes: 64 }),
        message: 'Signature must be a canonical base64 Ed25519 signature',
      },
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    canceledAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + env.BROADCAST_DRAFT_TTL_SECONDS * 1_000),
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

broadcastSchema.pre('validate', function validatePublishedEnvelope() {
  const encryptedFields = [
    'contentCiphertext',
    'contentNonce',
    'creatorEncryptedBroadcastKey',
    'recipientKeysDigest',
    'signature',
    'publishedAt',
  ] as const;

  if (this.status === 'published') {
    for (const field of encryptedFields) {
      if (this[field] === null || this[field] === undefined) {
        this.invalidate(field, `${field} is required for a published broadcast`);
      }
    }
  }

  if (this.status === 'canceled' && !this.canceledAt) {
    this.invalidate('canceledAt', 'canceledAt is required for a canceled broadcast draft');
  }
});

broadcastSchema.index(
  { creator: 1, clientBroadcastId: 1 },
  { unique: true, name: 'broadcasts_creator_client_id_unique' },
);
broadcastSchema.index({ creator: 1, status: 1, _id: -1 }, { name: 'broadcasts_creator_status' });
broadcastSchema.index({ status: 1, expiresAt: 1 }, { name: 'broadcasts_status_expiration' });

const Broadcast = model<IBroadcast>('Broadcast', broadcastSchema);

export default Broadcast;
export type { BroadcastDocument, IBroadcast };
