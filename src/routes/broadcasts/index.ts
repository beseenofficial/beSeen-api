import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import broadcastCreateRateLimit from '../../middleware/broadcastCreateRateLimit';
import createBroadcastDraftRoute from './createDraft';
import getBroadcastDraftRecipientsRoute from './draftRecipients';

const broadcastRoutes = Router();

broadcastRoutes.post('/drafts', authenticate, broadcastCreateRateLimit, createBroadcastDraftRoute);
broadcastRoutes.get('/drafts/:draftId/recipients', authenticate, getBroadcastDraftRecipientsRoute);

export default broadcastRoutes;
