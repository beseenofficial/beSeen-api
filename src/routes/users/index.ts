import getMeRoute from './me';
import getEarningsRoute from './earnings';
import { Router } from 'express';
import updateMeRoute from './updateMe';
import discoverUsersRoute from './discover';
import recordUserActivityRoute from './activity';
import getFollowCountsRoute from './followCounts';
import getPublicUserKeysRoute from './publicKeys';
import getPublicProfileRoute from './publicProfile';
import authenticate from '../../middleware/authenticate';
import avatarUpload from '../../middleware/avatarUpload';
import registerAuraPurchaseRoute from './registerAuraPurchase';
import getUsernameAvailabilityRoute from './usernameAvailability';
import userActivityRateLimit from '../../middleware/userActivityRateLimit';
import usernameAvailabilityRateLimit from '../../middleware/usernameAvailabilityRateLimit';

const userRoutes = Router();

userRoutes.get('/me', authenticate, getMeRoute);
userRoutes.get('/me/earnings', authenticate, getEarningsRoute);
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
