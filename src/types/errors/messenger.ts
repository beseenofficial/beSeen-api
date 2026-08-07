import type { ConversationAccessFailureReason } from '../../utils/messenger/getConversationAccess';

type MessengerConversationErrorReason = ConversationAccessFailureReason | 'active_keys_not_found';

const messengerConversationErrors: Record<
  MessengerConversationErrorReason,
  { statusCode: number; code: string; message: string }
> = {
  account_unavailable: {
    statusCode: 401,
    code: 'ACCOUNT_UNAVAILABLE',
    message: 'The user account is not available',
  },
  conversation_not_found: {
    statusCode: 404,
    code: 'CONVERSATION_NOT_FOUND',
    message: 'Conversation was not found',
  },
  participant_unavailable: {
    statusCode: 409,
    code: 'CONVERSATION_PARTICIPANT_UNAVAILABLE',
    message: 'The other conversation participant is not available',
  },
  active_keys_not_found: {
    statusCode: 409,
    code: 'ACTIVE_KEYS_NOT_FOUND',
    message: 'Active public keys were not found for both participants',
  },
};

export { messengerConversationErrors };
export type { MessengerConversationErrorReason };
