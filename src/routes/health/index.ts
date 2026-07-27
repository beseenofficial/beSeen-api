import { Router } from 'express';

import getHealthRoute from './get';

const healthRoutes = Router();

healthRoutes.get('/', getHealthRoute);

export default healthRoutes;
