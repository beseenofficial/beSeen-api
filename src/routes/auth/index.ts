import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import authConfigRateLimit from '../../middleware/authConfigRateLimit';
import loginChallengeRateLimit from '../../middleware/loginChallengeRateLimit';
import loginRateLimit from '../../middleware/loginRateLimit';
import noStore from '../../middleware/noStore';
import registrationChallengeRateLimit from '../../middleware/registrationChallengeRateLimit';
import registrationRateLimit from '../../middleware/registrationRateLimit';
import refreshRateLimit from '../../middleware/refreshRateLimit';
import getAuthConfigRoute from './config';
import loginRoute from './login';
import createLoginChallengeRoute from './loginChallenge';
import logoutRoute from './logout';
import registerRoute from './register';
import refreshRoute from './refresh';
import createRegistrationChallengeRoute from './registrationChallenge';

const authRoutes = Router();

authRoutes.use(noStore);
authRoutes.get('/config', authConfigRateLimit, getAuthConfigRoute);
authRoutes.post('/login', loginRateLimit, loginRoute);
authRoutes.post('/login/challenge', loginChallengeRateLimit, createLoginChallengeRoute);
authRoutes.post('/logout', authenticate, logoutRoute);
authRoutes.post('/register', registrationRateLimit, registerRoute);
authRoutes.post('/refresh', refreshRateLimit, refreshRoute);
authRoutes.post(
  '/registration/challenge',
  registrationChallengeRateLimit,
  createRegistrationChallengeRoute,
);

export default authRoutes;
