import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import broadcastCreateRateLimit from '../../middleware/broadcastCreateRateLimit';
import broadcastFinalizeRateLimit from '../../middleware/broadcastFinalizeRateLimit';
import broadcastKeyBatchRateLimit from '../../middleware/broadcastKeyBatchRateLimit';
import createBroadcastDraftRoute from './createDraft';
import getBroadcastDraftRecipientsRoute from './draftRecipients';
import finalizeBroadcastRoute from './finalize';
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
broadcastRoutes.post(
  '/drafts/:draftId/finalize',
  authenticate,
  broadcastFinalizeRateLimit,
  finalizeBroadcastRoute,
);

export default broadcastRoutes;
