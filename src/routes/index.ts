import { Router } from 'express';

import errorHandler from '../middleware/errorHandler';
import notFound from '../middleware/notFound';
import authRoutes from './auth';
import healthRoutes from './health';

const router = Router();

router.use('/v1/health', healthRoutes);
router.use('/v1/auth', authRoutes);

router.use(notFound);
router.use(errorHandler);

export default router;
