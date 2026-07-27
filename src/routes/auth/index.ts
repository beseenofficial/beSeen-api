import { Router } from 'express';

import registrationChallengeRateLimit from '../../middleware/registrationChallengeRateLimit';
import registrationRateLimit from '../../middleware/registrationRateLimit';
import registrationVerifyRateLimit from '../../middleware/registrationVerifyRateLimit';
import registerRoute from './register';
import createRegistrationChallengeRoute from './registrationChallenge';
import verifyRegistrationChallengeRoute from './registrationVerify';

const authRoutes = Router();

authRoutes.post('/register', registrationRateLimit, registerRoute);
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
