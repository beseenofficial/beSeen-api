import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import avatarUpload from '../../middleware/avatarUpload';
import usernameAvailabilityRateLimit from '../../middleware/usernameAvailabilityRateLimit';
import getFollowerCountRoute from './followerCount';
import getMeRoute from './me';
import getMyTokensRoute from './myTokens';
import purchaseUserTokenRoute from './purchaseToken';
import getPublicProfileRoute from './publicProfile';
import getPublicUserKeysRoute from './publicKeys';
import getUserTokenRoute from './userToken';
import updateMeRoute from './updateMe';
import getUsernameAvailabilityRoute from './usernameAvailability';

const userRoutes = Router();

userRoutes.get('/me', authenticate, getMeRoute);
userRoutes.patch('/me', authenticate, avatarUpload, updateMeRoute);
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
