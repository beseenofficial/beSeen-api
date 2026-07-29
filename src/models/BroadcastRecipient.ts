import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import { BROADCAST_ACCESS_MODES, BROADCAST_WRAPPED_KEY_BYTES } from '../constant/broadcast';
import type { BroadcastAccessMode } from '../constant/broadcast';
import isBase64PublicKey from '../utils/auth/isBase64PublicKey';
import isCanonicalBase64 from '../utils/crypto/isCanonicalBase64';

interface IBroadcastRecipient {
  broadcast: Types.ObjectId;
  recipient: Types.ObjectId;
  username: string;
  keyVersion: number;
  encryptionPublicKey: string;
  encryptedBroadcastKey: string | null;
  accessMode: BroadcastAccessMode;
  tokenId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type BroadcastRecipientDocument = HydratedDocument<IBroadcastRecipient>;

const broadcastRecipientSchema = new Schema<IBroadcastRecipient>(
  {
    broadcast: {
      type: Schema.Types.ObjectId,
      ref: 'Broadcast',
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    keyVersion: {
      type: Number,
      min: 1,
      required: true,
    },
    encryptionPublicKey: {
      type: String,
      required: true,
      validate: {
        validator: isBase64PublicKey,
        message: 'Recipient encryption public key must be a canonical base64-encoded 32-byte key',
      },
    },
    encryptedBroadcastKey: {
      type: String,
      default: null,
      validate: {
        validator: (value: string | null) =>
          value === null ||
          isCanonicalBase64(value, {
            minBytes: BROADCAST_WRAPPED_KEY_BYTES,
            maxBytes: BROADCAST_WRAPPED_KEY_BYTES,
          }),
        message: 'Encrypted broadcast key must be a canonical base64 sealed-box ciphertext',
      },
    },
    accessMode: {
      type: String,
      enum: BROADCAST_ACCESS_MODES,
      required: true,
      default: 'demo',
      immutable: true,
    },
    tokenId: {
      type: String,
      default: null,
      immutable: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

broadcastRecipientSchema.index(
  { broadcast: 1, recipient: 1 },
  { unique: true, name: 'broadcast_recipients_broadcast_user_unique' },
);
broadcastRecipientSchema.index(
  { recipient: 1, broadcast: -1 },
  { name: 'broadcast_recipients_feed' },
);

const BroadcastRecipient = model<IBroadcastRecipient>(
  'BroadcastRecipient',
  broadcastRecipientSchema,
);

export default BroadcastRecipient;
export type { BroadcastRecipientDocument, IBroadcastRecipient };
