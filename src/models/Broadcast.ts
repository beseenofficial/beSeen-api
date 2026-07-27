import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import {
  BROADCAST_AUDIENCE_TYPES,
  BROADCAST_ENCRYPTION_VERSION,
  BROADCAST_STATUSES,
} from '../constant/broadcast';
import type { BroadcastAudienceType, BroadcastStatus } from '../constant/broadcast';
import isBase64PublicKey from '../utils/auth/isBase64PublicKey';

interface IBroadcast {
  clientBroadcastId: string;
  creator: Types.ObjectId;
  status: BroadcastStatus;
  audienceType: BroadcastAudienceType;
  audienceSnapshotCount: number;
  encryptionVersion: number;
  creatorKeyVersion: number;
  creatorEncryptionPublicKey: string;
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
    creatorEncryptionPublicKey: {
      type: String,
      required: true,
      validate: {
        validator: isBase64PublicKey,
        message: 'Creator encryption public key must be a canonical base64-encoded 32-byte key',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

broadcastSchema.index(
  { creator: 1, clientBroadcastId: 1 },
  { unique: true, name: 'broadcasts_creator_client_id_unique' },
);
broadcastSchema.index({ creator: 1, status: 1, _id: -1 }, { name: 'broadcasts_creator_status' });

const Broadcast = model<IBroadcast>('Broadcast', broadcastSchema);

export default Broadcast;
export type { BroadcastDocument, IBroadcast };
