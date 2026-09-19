import { Router } from 'express';

import sendMessageRoute from './sendMessage';
import getBountySummaryRoute from './getBountySummary';
import getConversationRoute from './getConversation';
import authenticate from '../../middleware/authenticate';
import getMessageHistoryRoute from './getMessageHistory';
import listConversationsRoute from './listConversations';
import markConversationReadRoute from './markConversationRead';
import getConversationContextRoute from './getConversationContext';
import messengerMutationRateLimit from '../../middleware/messengerMutationRateLimit';

const messengerRoutes = Router();

messengerRoutes.get('/bounties/summary', authenticate, getBountySummaryRoute);
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
