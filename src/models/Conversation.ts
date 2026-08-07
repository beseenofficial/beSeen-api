import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import { MESSENGER_INITIAL_SEQUENCE } from '../constant/messenger';

interface IConversation {
  participantA: Types.ObjectId;
  participantB: Types.ObjectId;
  nextSequence: number;
  lastMessageAt: Date | null;
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
