import type { ClientSession, Types } from 'mongoose';

import Conversation from '../../models/Conversation';
import type { ConversationDocument } from '../../models/Conversation';

interface EnsuredConversation {
  conversation: ConversationDocument;
  created: boolean;
}

const canonicalParticipantPair = (
  firstUserId: Types.ObjectId,
  secondUserId: Types.ObjectId,
): { participantA: Types.ObjectId; participantB: Types.ObjectId } =>
  firstUserId.toHexString() < secondUserId.toHexString()
    ? { participantA: firstUserId, participantB: secondUserId }
    : { participantA: secondUserId, participantB: firstUserId };

const ensureConversation = async (
  firstUserId: Types.ObjectId,
  secondUserId: Types.ObjectId,
  session: ClientSession,
): Promise<EnsuredConversation> => {
  if (firstUserId.equals(secondUserId)) {
    throw new Error('A conversation requires two different users');
  }

  const pair = canonicalParticipantPair(firstUserId, secondUserId);
  const writeResult = await Conversation.updateOne(
    pair,
    { $setOnInsert: pair },
    { upsert: true, session },
  ).exec();
  const conversation = await Conversation.findOne(pair).session(session).exec();

  if (!conversation) {
    throw new Error('Conversation could not be created');
  }

  return {
    conversation,
    created: writeResult.upsertedCount === 1,
  };
};

export default ensureConversation;
export { canonicalParticipantPair };
export type { EnsuredConversation };
