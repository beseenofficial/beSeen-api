import type { ConversationAccessFailureReason } from '../../utils/messenger/getConversationAccess';
import type { SendMessageFailureReason } from '../../utils/messenger/sendMessage';
import type { MarkConversationReadFailureReason } from '../../utils/messenger/markConversationRead';
import type { ClaimMessageBountyFailureReason } from '../../utils/messenger/claimMessageBounty';

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

const messengerSendErrors: Record<
  SendMessageFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  ...messengerConversationErrors,
  reply_not_found: {
    statusCode: 409,
    code: 'REPLY_MESSAGE_NOT_FOUND',
    message: 'The reply target does not belong to this conversation',
  },
  invalid_signature: {
    statusCode: 401,
    code: 'INVALID_MESSAGE_SIGNATURE',
    message: 'The encrypted message signature is invalid',
  },
  message_conflict: {
    statusCode: 409,
    code: 'MESSAGE_ID_CONFLICT',
    message: 'This client message ID was already used with different encrypted content',
  },
};

const messengerReadErrors: Record<
  MarkConversationReadFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  account_unavailable: messengerConversationErrors.account_unavailable,
  conversation_not_found: messengerConversationErrors.conversation_not_found,
  read_sequence_not_found: {
    statusCode: 409,
    code: 'READ_SEQUENCE_NOT_FOUND',
    message: 'The requested read sequence does not exist in this conversation',
  },
};

const messengerBountyClaimErrors: Record<
  ClaimMessageBountyFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  account_unavailable: messengerConversationErrors.account_unavailable,
  bounty_not_found: {
    statusCode: 404,
    code: 'BOUNTY_NOT_FOUND',
    message: 'Demo bounty was not found',
  },
  bounty_not_claimable: {
    statusCode: 409,
    code: 'BOUNTY_NOT_CLAIMABLE',
    message: 'Demo bounty is not claimable yet',
  },
  bounty_expired: {
    statusCode: 410,
    code: 'BOUNTY_EXPIRED',
    message: 'Demo bounty expired before a valid reply',
  },
};

export {
  messengerBountyClaimErrors,
  messengerConversationErrors,
  messengerReadErrors,
  messengerSendErrors,
};
export type { MessengerConversationErrorReason };
