import { Router } from 'express';

import loginChallengeRateLimit from '../../middleware/loginChallengeRateLimit';
import loginRateLimit from '../../middleware/loginRateLimit';
import registrationChallengeRateLimit from '../../middleware/registrationChallengeRateLimit';
import registrationRateLimit from '../../middleware/registrationRateLimit';
import registrationVerifyRateLimit from '../../middleware/registrationVerifyRateLimit';
import refreshRateLimit from '../../middleware/refreshRateLimit';
import loginRoute from './login';
import createLoginChallengeRoute from './loginChallenge';
import registerRoute from './register';
import refreshRoute from './refresh';
import createRegistrationChallengeRoute from './registrationChallenge';
import verifyRegistrationChallengeRoute from './registrationVerify';

const authRoutes = Router();

authRoutes.post('/login', loginRateLimit, loginRoute);
authRoutes.post('/login/challenge', loginChallengeRateLimit, createLoginChallengeRoute);
authRoutes.post('/register', registrationRateLimit, registerRoute);
authRoutes.post('/refresh', refreshRateLimit, refreshRoute);
authRoutes.post(
  '/registration/challenge',
  registrationChallengeRateLimit,
  createRegistrationChallengeRoute,
);
authRoutes.post(
  '/registration/verify',
  registrationVerifyRateLimit,
  verifyRegistrationChallengeRoute,
);

export default authRoutes;
