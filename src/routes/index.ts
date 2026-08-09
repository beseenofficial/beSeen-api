import { Router } from 'express';

import authRoutes from './auth';
import docsRoutes from './docs';
import userRoutes from './users';
import healthRoutes from './health';
import broadcastRoutes from './broadcasts';
import messengerRoutes from './messenger';
import notFound from '../middleware/notFound';
import errorHandler from '../middleware/errorHandler';

const router = Router();

router.use('/v1', docsRoutes);
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/health', healthRoutes);
router.use('/v1/broadcasts', broadcastRoutes);
router.use('/v1/messenger', messengerRoutes);

router.use(notFound);
router.use(errorHandler);

export default router;
