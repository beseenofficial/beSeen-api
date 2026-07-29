import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import usernameAvailabilityRateLimit from '../../middleware/usernameAvailabilityRateLimit';
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
userRoutes.patch('/me', authenticate, updateMeRoute);
userRoutes.get('/me/tokens', authenticate, getMyTokensRoute);
userRoutes.get(
  '/username/availability',
  usernameAvailabilityRateLimit,
  getUsernameAvailabilityRoute,
);
userRoutes.get('/:username/keys', getPublicUserKeysRoute);
userRoutes.get('/:username/token', getUserTokenRoute);
userRoutes.post('/:username/token/purchase', authenticate, purchaseUserTokenRoute);
userRoutes.get('/:username', getPublicProfileRoute);

export default userRoutes;
