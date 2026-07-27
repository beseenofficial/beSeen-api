import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import openApiDocument from '../../openapi/document';

const docsRoutes = Router();

docsRoutes.get('/openapi.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json(openApiDocument);
});

docsRoutes.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'BeSeen API Docs',
    customCss: '',
    swaggerOptions: {
      persistAuthorization: false,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  }),
);

export default docsRoutes;
