import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import usernameAvailabilityRateLimit from '../../middleware/usernameAvailabilityRateLimit';
import getMeRoute from './me';
import getPublicProfileRoute from './publicProfile';
import getPublicUserKeysRoute from './publicKeys';
import updateMeRoute from './updateMe';
import getUsernameAvailabilityRoute from './usernameAvailability';

const userRoutes = Router();

userRoutes.get('/me', authenticate, getMeRoute);
userRoutes.patch('/me', authenticate, updateMeRoute);
userRoutes.get(
  '/username/availability',
  usernameAvailabilityRateLimit,
  getUsernameAvailabilityRoute,
);
userRoutes.get('/:username/keys', getPublicUserKeysRoute);
userRoutes.get('/:username', getPublicProfileRoute);

export default userRoutes;
