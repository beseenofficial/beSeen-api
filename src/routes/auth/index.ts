import { Router } from 'express';

import loginRoute from './login';
import logoutRoute from './logout';
import refreshRoute from './refresh';
import registerRoute from './register';
import getAuthConfigRoute from './config';
import noStore from '../../middleware/noStore';
import authenticate from '../../middleware/authenticate';
import avatarUpload from '../../middleware/avatarUpload';
import loginRateLimit from '../../middleware/loginRateLimit';
import refreshRateLimit from '../../middleware/refreshRateLimit';
import authConfigRateLimit from '../../middleware/authConfigRateLimit';
import registrationRateLimit from '../../middleware/registrationRateLimit';

const authRoutes = Router();

authRoutes.use(noStore);
authRoutes.get('/config', authConfigRateLimit, getAuthConfigRoute);
authRoutes.post('/login', loginRateLimit, loginRoute);
authRoutes.post('/logout', authenticate, logoutRoute);
authRoutes.post('/register', registrationRateLimit, avatarUpload, registerRoute);
authRoutes.post('/refresh', refreshRateLimit, refreshRoute);

export default authRoutes;
