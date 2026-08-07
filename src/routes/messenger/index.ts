import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import getConversationRoute from './getConversation';
import getConversationContextRoute from './getConversationContext';
import getMessageHistoryRoute from './getMessageHistory';
import listConversationsRoute from './listConversations';
import sendMessageRoute from './sendMessage';

const messengerRoutes = Router();

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
messengerRoutes.post('/conversations/:conversationId/messages', authenticate, sendMessageRoute);

export default messengerRoutes;
