import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import { MESSENGER_EMPTY_READ_SEQUENCE, MESSENGER_INITIAL_SEQUENCE } from '../constant/messenger';

interface IConversation {
  participantA: Types.ObjectId;
  participantB: Types.ObjectId;
  nextSequence: number;
  lastMessageAt: Date | null;
  lastMessageSender: Types.ObjectId | null;
  lastMessageClientMessageId: string | null;
  participantAReadSequence: number;
  participantBReadSequence: number;
  participantAUnreadCount: number;
  participantBUnreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type ConversationDocument = HydratedDocument<IConversation>;

const conversationSchema = new Schema<IConversation>(
  {
    participantA: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    participantB: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    nextSequence: {
      type: Number,
      required: true,
      min: MESSENGER_INITIAL_SEQUENCE,
      default: MESSENGER_INITIAL_SEQUENCE,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    lastMessageSender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastMessageClientMessageId: {
      type: String,
      lowercase: true,
      default: null,
      match: [
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        'Last client message ID must be a UUID',
      ],
    },
    participantAReadSequence: {
      type: Number,
      min: MESSENGER_EMPTY_READ_SEQUENCE,
      default: MESSENGER_EMPTY_READ_SEQUENCE,
      required: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Participant A read sequence must be a safe integer',
      },
    },
    participantBReadSequence: {
      type: Number,
      min: MESSENGER_EMPTY_READ_SEQUENCE,
      default: MESSENGER_EMPTY_READ_SEQUENCE,
      required: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Participant B read sequence must be a safe integer',
      },
    },
    participantAUnreadCount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Participant A unread count must be a safe integer',
      },
    },
    participantBUnreadCount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Participant B unread count must be a safe integer',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

conversationSchema.pre('validate', function canonicalizeParticipants() {
  if (!this.participantA || !this.participantB) {
    return;
  }

  if (this.participantA.equals(this.participantB)) {
    this.invalidate('participantB', 'A conversation requires two different users');
    return;
  }

  if (this.participantA.toHexString() > this.participantB.toHexString()) {
    const participantA = this.participantA;
    this.participantA = this.participantB;
    this.participantB = participantA;
  }
});

conversationSchema.index(
  { participantA: 1, participantB: 1 },
  { unique: true, name: 'conversations_participant_pair_unique' },
);
conversationSchema.index(
  { participantA: 1, lastMessageAt: -1, _id: -1 },
  { name: 'conversations_participant_a_activity' },
);
conversationSchema.index(
  { participantB: 1, lastMessageAt: -1, _id: -1 },
  { name: 'conversations_participant_b_activity' },
);
conversationSchema.index(
  { participantA: 1, _id: -1 },
  { name: 'conversations_participant_a_created' },
);
conversationSchema.index(
  { participantB: 1, _id: -1 },
  { name: 'conversations_participant_b_created' },
);

const Conversation = model<IConversation>('Conversation', conversationSchema);

export default Conversation;
export type { ConversationDocument, IConversation };
