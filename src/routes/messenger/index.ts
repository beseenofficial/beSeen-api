import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import messengerMutationRateLimit from '../../middleware/messengerMutationRateLimit';
import claimMessageBountyRoute from './claimMessageBounty';
import getConversationRoute from './getConversation';
import getConversationContextRoute from './getConversationContext';
import getMessageHistoryRoute from './getMessageHistory';
import listConversationsRoute from './listConversations';
import markConversationReadRoute from './markConversationRead';
import sendMessageRoute from './sendMessage';

const messengerRoutes = Router();

messengerRoutes.post(
  '/bounties/:bountyId/claim',
  authenticate,
  messengerMutationRateLimit,
  claimMessageBountyRoute,
);
messengerRoutes.get('/conversations', authenticate, listConversationsRoute);
messengerRoutes.get(
  '/conversations/:conversationId/context',
  authenticate,
  getConversationContextRoute,
);
messengerRoutes.get('/conversations/:conversationId', authenticate, getConversationRoute);
messengerRoutes.get(
  '/conversations/:conversationId/messages',
  authenticate,
  getMessageHistoryRoute,
);
messengerRoutes.post(
  '/conversations/:conversationId/messages',
  authenticate,
  messengerMutationRateLimit,
  sendMessageRoute,
);
messengerRoutes.put(
  '/conversations/:conversationId/read',
  authenticate,
  messengerMutationRateLimit,
  markConversationReadRoute,
);

export default messengerRoutes;
