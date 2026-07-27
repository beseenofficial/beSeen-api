import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import broadcastCreateRateLimit from '../../middleware/broadcastCreateRateLimit';
import broadcastKeyBatchRateLimit from '../../middleware/broadcastKeyBatchRateLimit';
import createBroadcastDraftRoute from './createDraft';
import getBroadcastDraftRecipientsRoute from './draftRecipients';
import uploadBroadcastRecipientKeysRoute from './uploadRecipientKeys';

const broadcastRoutes = Router();

broadcastRoutes.post('/drafts', authenticate, broadcastCreateRateLimit, createBroadcastDraftRoute);
broadcastRoutes.get('/drafts/:draftId/recipients', authenticate, getBroadcastDraftRecipientsRoute);
broadcastRoutes.put(
  '/drafts/:draftId/recipient-keys',
  authenticate,
  broadcastKeyBatchRateLimit,
  uploadBroadcastRecipientKeysRoute,
);

export default broadcastRoutes;
