import { Router } from 'express';

import authenticate from '../../middleware/authenticate';
import authConfigRateLimit from '../../middleware/authConfigRateLimit';
import loginRateLimit from '../../middleware/loginRateLimit';
import noStore from '../../middleware/noStore';
import registrationRateLimit from '../../middleware/registrationRateLimit';
import refreshRateLimit from '../../middleware/refreshRateLimit';
import getAuthConfigRoute from './config';
import loginRoute from './login';
import logoutRoute from './logout';
import registerRoute from './register';
import refreshRoute from './refresh';

const authRoutes = Router();

authRoutes.use(noStore);
authRoutes.get('/config', authConfigRateLimit, getAuthConfigRoute);
authRoutes.post('/login', loginRateLimit, loginRoute);
authRoutes.post('/logout', authenticate, logoutRoute);
authRoutes.post('/register', registrationRateLimit, registerRoute);
authRoutes.post('/refresh', refreshRateLimit, refreshRoute);

export default authRoutes;
