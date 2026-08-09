import { Router } from 'express';

import getMeRoute from './me';
import discoverUsersRoute from './discover';
import updateMeRoute from './updateMe';
import getMyTokensRoute from './myTokens';
import getUserTokenRoute from './userToken';
import getPublicUserKeysRoute from './publicKeys';
import getFollowerCountRoute from './followerCount';
import getPublicProfileRoute from './publicProfile';
import purchaseUserTokenRoute from './purchaseToken';
import authenticate from '../../middleware/authenticate';
import avatarUpload from '../../middleware/avatarUpload';
import getUsernameAvailabilityRoute from './usernameAvailability';
import usernameAvailabilityRateLimit from '../../middleware/usernameAvailabilityRateLimit';

const userRoutes = Router();

userRoutes.get('/me', authenticate, getMeRoute);
userRoutes.patch('/me', authenticate, avatarUpload, updateMeRoute);
userRoutes.get('/discover', discoverUsersRoute);
userRoutes.get('/:username', getPublicProfileRoute);
userRoutes.get('/:username/token', getUserTokenRoute);
userRoutes.get('/:username/keys', getPublicUserKeysRoute);
userRoutes.get('/me/tokens', authenticate, getMyTokensRoute);
userRoutes.get('/:username/followers/count', getFollowerCountRoute);
userRoutes.post('/:username/token/purchase', authenticate, purchaseUserTokenRoute);
userRoutes.get(
  '/username/availability',
  usernameAvailabilityRateLimit,
  getUsernameAvailabilityRoute,
);

export default userRoutes;
