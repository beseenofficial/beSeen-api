import { Router } from 'express';

import registrationChallengeRateLimit from '../../middleware/registrationChallengeRateLimit';
import registrationVerifyRateLimit from '../../middleware/registrationVerifyRateLimit';
import createRegistrationChallengeRoute from './registrationChallenge';
import verifyRegistrationChallengeRoute from './registrationVerify';

const authRoutes = Router();

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
