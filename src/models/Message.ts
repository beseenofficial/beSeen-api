import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import {
  MESSENGER_BOUNTY_AMOUNT_PATTERN,
  MESSENGER_BOUNTY_ASSET_CODE_PATTERN,
  MESSENGER_BOUNTY_MAX_DURATION_SECONDS,
  MESSENGER_BOUNTY_MIN_DURATION_SECONDS,
  MESSENGER_CONTENT_NONCE_BYTES,
  MESSENGER_ENCRYPTION_VERSION,
  MESSENGER_INITIAL_SEQUENCE,
  MESSENGER_MAX_CIPHERTEXT_BYTES,
  MESSENGER_MIN_CIPHERTEXT_BYTES,
  MESSENGER_SIGNATURE_VERSION,
  MESSENGER_WRAPPED_KEY_BYTES,
} from '../constant/messenger';
import isBase64PublicKey from '../utils/auth/isBase64PublicKey';
import isCanonicalBase64 from '../utils/crypto/isCanonicalBase64';

interface IMessage {
  conversation: Types.ObjectId;
  sequence: number;
  clientMessageId: string;
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  encryptionVersion: number;
  signatureVersion: number;
  senderKeyVersion: number;
  recipientKeyVersion: number;
  senderSigningPublicKey: string;
  senderEncryptionPublicKey: string;
  recipientEncryptionPublicKey: string;
  contentCiphertext: string;
  contentNonce: string;
  senderEncryptedMessageKey: string;
  recipientEncryptedMessageKey: string;
  replyToMessage: Types.ObjectId | null;
  bountyAssetCode: string | null;
  bountyAmount: string | null;
  bountyDurationSeconds: number | null;
  signature: string;
  createdAt: Date;
  updatedAt: Date;
}

type MessageDocument = HydratedDocument<IMessage>;

const publicKeyValidation = {
  validator: isBase64PublicKey,
  message: 'Public key must be a canonical base64-encoded 32-byte key',
};

const wrappedKeyValidation = {
  validator: (value: string) =>
    isCanonicalBase64(value, {
      minBytes: MESSENGER_WRAPPED_KEY_BYTES,
      maxBytes: MESSENGER_WRAPPED_KEY_BYTES,
    }),
  message: 'Encrypted message key must be a canonical base64 sealed-box ciphertext',
};

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      immutable: true,
    },
    sequence: {
      type: Number,
      required: true,
      min: MESSENGER_INITIAL_SEQUENCE,
      immutable: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Message sequence must be a safe integer',
      },
    },
    clientMessageId: {
      type: String,
      required: true,
      lowercase: true,
      immutable: true,
      match: [
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        'Client message ID must be a UUID',
      ],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    encryptionVersion: {
      type: Number,
      enum: [MESSENGER_ENCRYPTION_VERSION],
      default: MESSENGER_ENCRYPTION_VERSION,
      required: true,
      immutable: true,
    },
    signatureVersion: {
      type: Number,
      enum: [MESSENGER_SIGNATURE_VERSION],
      default: MESSENGER_SIGNATURE_VERSION,
      required: true,
      immutable: true,
    },
    senderKeyVersion: {
      type: Number,
      min: 1,
      required: true,
      immutable: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Sender key version must be a safe integer',
      },
    },
    recipientKeyVersion: {
      type: Number,
      min: 1,
      required: true,
      immutable: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Recipient key version must be a safe integer',
      },
    },
    senderSigningPublicKey: {
      type: String,
      required: true,
      immutable: true,
      validate: publicKeyValidation,
    },
    senderEncryptionPublicKey: {
      type: String,
      required: true,
      immutable: true,
      validate: publicKeyValidation,
    },
    recipientEncryptionPublicKey: {
      type: String,
      required: true,
      immutable: true,
      validate: publicKeyValidation,
    },
    contentCiphertext: {
      type: String,
      required: true,
      immutable: true,
      validate: {
        validator: (value: string) =>
          isCanonicalBase64(value, {
            minBytes: MESSENGER_MIN_CIPHERTEXT_BYTES,
            maxBytes: MESSENGER_MAX_CIPHERTEXT_BYTES,
          }),
        message: 'Content ciphertext must be canonical base64 within the payload size limit',
      },
    },
    contentNonce: {
      type: String,
      required: true,
      immutable: true,
      validate: {
        validator: (value: string) =>
          isCanonicalBase64(value, {
            minBytes: MESSENGER_CONTENT_NONCE_BYTES,
            maxBytes: MESSENGER_CONTENT_NONCE_BYTES,
          }),
        message: 'Content nonce must be canonical base64 containing exactly 24 bytes',
      },
    },
    senderEncryptedMessageKey: {
      type: String,
      required: true,
      immutable: true,
      validate: wrappedKeyValidation,
    },
    recipientEncryptedMessageKey: {
      type: String,
      required: true,
      immutable: true,
      validate: wrappedKeyValidation,
    },
    replyToMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
      immutable: true,
    },
    bountyAssetCode: {
      type: String,
      default: null,
      immutable: true,
      match: [MESSENGER_BOUNTY_ASSET_CODE_PATTERN, 'Bounty asset code is invalid'],
    },
    bountyAmount: {
      type: String,
      default: null,
      immutable: true,
      match: [MESSENGER_BOUNTY_AMOUNT_PATTERN, 'Bounty amount must be a canonical decimal string'],
      validate: {
        validator: (value: string | null) => value === null || Number(value) > 0,
        message: 'Bounty amount must be greater than zero',
      },
    },
    bountyDurationSeconds: {
      type: Number,
      default: null,
      immutable: true,
      min: MESSENGER_BOUNTY_MIN_DURATION_SECONDS,
      max: MESSENGER_BOUNTY_MAX_DURATION_SECONDS,
      validate: {
        validator: (value: number | null) => value === null || Number.isSafeInteger(value),
        message: 'Bounty duration must be a safe integer',
      },
    },
    signature: {
      type: String,
      required: true,
      immutable: true,
      validate: {
        validator: (value: string) =>
          isCanonicalBase64(value, {
            minBytes: 64,
            maxBytes: 64,
          }),
        message: 'Signature must be a canonical base64 Ed25519 signature',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

messageSchema.pre('validate', function validateParticipants() {
  if (!this.sender || !this.recipient) {
    return;
  }

  if (this.sender.equals(this.recipient)) {
    this.invalidate('recipient', 'A message requires two different users');
  }

  const bountyTerms = [this.bountyAssetCode, this.bountyAmount, this.bountyDurationSeconds];
  const suppliedBountyTerms = bountyTerms.filter((value) => value !== null && value !== undefined);

  if (suppliedBountyTerms.length !== 0 && suppliedBountyTerms.length !== bountyTerms.length) {
    this.invalidate('bountyAssetCode', 'All bounty terms must be supplied together');
  }
});

messageSchema.index(
  { conversation: 1, sequence: 1 },
  { unique: true, name: 'messages_conversation_sequence_unique' },
);
messageSchema.index(
  { sender: 1, clientMessageId: 1 },
  { unique: true, name: 'messages_sender_client_id_unique' },
);
messageSchema.index({ conversation: 1, _id: -1 }, { name: 'messages_conversation_history' });

const Message = model<IMessage>('Message', messageSchema);

export default Message;
export type { IMessage, MessageDocument };
