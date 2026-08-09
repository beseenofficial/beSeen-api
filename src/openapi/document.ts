import openApiPaths from './paths';
import openApiComponents from './components';

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'BeSeen API',
    version: '0.1.0',
    description:
      'Client contract for Stellar wallet registration, authentication, sessions, profiles, and end-to-end encrypted broadcasts.',
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
    { name: 'Tokens', description: 'Database-backed demo token acquisition and ownership.' },
    {
      name: 'Broadcasts',
      description: 'End-to-end encrypted, signed, ciphertext-only broadcasts.',
    },
    {
      name: 'Messenger',
      description:
        'Token-enabled one-to-one conversations, public encryption context, and signed ciphertext-only messages.',
    },
  ],
  paths: openApiPaths,
  components: openApiComponents,
} as const;

export default openApiDocument;
