import { Router } from 'express';

import getMeRoute from './me';
import discoverUsersRoute from './discover';
import updateMeRoute from './updateMe';
import recordUserActivityRoute from './activity';
import getPublicUserKeysRoute from './publicKeys';
import getFollowCountsRoute from './followCounts';
import getPublicProfileRoute from './publicProfile';
import registerAuraPurchaseRoute from './registerAuraPurchase';
import authenticate from '../../middleware/authenticate';
import avatarUpload from '../../middleware/avatarUpload';
import getUsernameAvailabilityRoute from './usernameAvailability';
import usernameAvailabilityRateLimit from '../../middleware/usernameAvailabilityRateLimit';
import userActivityRateLimit from '../../middleware/userActivityRateLimit';

const userRoutes = Router();

userRoutes.get('/me', authenticate, getMeRoute);
userRoutes.patch('/me', authenticate, avatarUpload, updateMeRoute);
userRoutes.post('/me/activity', authenticate, userActivityRateLimit, recordUserActivityRoute);
userRoutes.get('/discover', discoverUsersRoute);
userRoutes.get('/:username', getPublicProfileRoute);
userRoutes.get('/:username/keys', getPublicUserKeysRoute);
userRoutes.get('/:username/follow-counts', getFollowCountsRoute);
userRoutes.post('/:username/aura/purchases', authenticate, registerAuraPurchaseRoute);
userRoutes.get(
  '/username/availability',
  usernameAvailabilityRateLimit,
  getUsernameAvailabilityRoute,
);

export default userRoutes;
