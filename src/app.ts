import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import compression from 'compression';

import './env';
import router from './routes';
import jsonResponse from './middleware/jsonResponse';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(jsonResponse);
app.use(router);

export default app;
