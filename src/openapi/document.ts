import openApiComponents from './components';
import openApiPaths from './paths';

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'BeSeen API',
    version: '0.1.0',
    description:
      'Client contract for Stellar wallet registration, authentication, sessions, and BeSeen profiles.',
  },
  servers: [{ url: '/', description: 'Current API origin' }],
  tags: [
    { name: 'System', description: 'Service health.' },
    {
      name: 'Registration',
      description: 'Stellar wallet registration and BeSeen public-key binding.',
    },
    {
      name: 'Authentication',
      description: 'Wallet login, rotating sessions, and protocol configuration.',
    },
    { name: 'Profiles', description: 'Private and public user profiles.' },
  ],
  paths: openApiPaths,
  components: openApiComponents,
} as const;

export default openApiDocument;
