import { Router } from 'express';

import getBroadcastFeedRoute from './feed';
import getBroadcastDraftsRoute from './drafts';
import finalizeBroadcastRoute from './finalize';
import cancelBroadcastDraftRoute from './cancelDraft';
import createBroadcastDraftRoute from './createDraft';
import authenticate from '../../middleware/authenticate';
import getBroadcastDraftRecipientsRoute from './draftRecipients';
import uploadBroadcastRecipientKeysRoute from './uploadRecipientKeys';
import broadcastFeedRateLimit from '../../middleware/broadcastFeedRateLimit';
import broadcastCancelRateLimit from '../../middleware/broadcastCancelRateLimit';
import broadcastCreateRateLimit from '../../middleware/broadcastCreateRateLimit';
import broadcastFinalizeRateLimit from '../../middleware/broadcastFinalizeRateLimit';
import broadcastKeyBatchRateLimit from '../../middleware/broadcastKeyBatchRateLimit';
import broadcastDraftReadRateLimit from '../../middleware/broadcastDraftReadRateLimit';

const broadcastRoutes = Router();

broadcastRoutes.get('/feed', authenticate, broadcastFeedRateLimit, getBroadcastFeedRoute);
broadcastRoutes.get('/drafts', authenticate, broadcastDraftReadRateLimit, getBroadcastDraftsRoute);
broadcastRoutes.post('/drafts', authenticate, broadcastCreateRateLimit, createBroadcastDraftRoute);

broadcastRoutes.get(
  '/drafts/:draftId/recipients',
  authenticate,
  broadcastDraftReadRateLimit,
  getBroadcastDraftRecipientsRoute,
);
broadcastRoutes.delete(
  '/drafts/:draftId',
  authenticate,
  broadcastCancelRateLimit,
  cancelBroadcastDraftRoute,
);
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
