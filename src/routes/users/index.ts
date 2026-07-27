import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import getMeRoute from './me';

const userRoutes = Router();

userRoutes.get('/me', authenticate, getMeRoute);

export default userRoutes;
