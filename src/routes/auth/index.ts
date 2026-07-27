import { Router } from 'express';

import registrationChallengeRateLimit from '../../middleware/registrationChallengeRateLimit';
import createRegistrationChallengeRoute from './registrationChallenge';

const authRoutes = Router();

authRoutes.post(
  '/registration/challenge',
  registrationChallengeRateLimit,
  createRegistrationChallengeRoute,
);

export default authRoutes;
