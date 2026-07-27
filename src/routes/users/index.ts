import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import getMeRoute from './me';
import getPublicProfileRoute from './publicProfile';
import updateMeRoute from './updateMe';

const userRoutes = Router();

userRoutes.get('/me', authenticate, getMeRoute);
userRoutes.patch('/me', authenticate, updateMeRoute);
userRoutes.get('/:username', getPublicProfileRoute);

export default userRoutes;
