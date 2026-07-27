const jsonBody = (schema: Record<string, unknown>, required = true) => ({
  required,
  content: { 'application/json': { schema } },
});

const jsonResponse = (description: string, resultSchema: Record<string, unknown>) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['status', 'message', 'result'],
        properties: {
          status: { type: 'string', const: 'success' },
          message: { type: 'string' },
          result: resultSchema,
        },
      },
    },
  },
});

const validationError = { $ref: '#/components/responses/ValidationError' };
const unauthorized = { $ref: '#/components/responses/Unauthorized' };
const rateLimited = { $ref: '#/components/responses/RateLimited' };
const genericError = {
  description: 'The request could not be completed.',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
};

const stellarAddressSchema = {
  type: 'string',
  description: 'A valid Stellar G address.',
  example: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
};

const signatureSchema = {
  type: 'string',
  description: 'Canonical base64-encoded 64-byte SEP-53 wallet signature.',
};

const openApiPaths = {
  '/v1/health': {
    get: {
      tags: ['System'],
      summary: 'Check API health',
      operationId: 'getHealth',
      responses: {
        '200': jsonResponse('The API is healthy.', {
          type: 'object',
          required: ['service', 'state', 'timestamp', 'uptime'],
          properties: {
            service: { type: 'string', example: 'beseen-api' },
            state: { type: 'string', const: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', minimum: 0 },
          },
        }),
      },
    },
  },
  '/v1/auth/config': {
    get: {
      tags: ['Authentication'],
      summary: 'Get client authentication protocol configuration',
      description:
        'Returns the exact wallet-specific key derivation message and public protocol settings. Private keys never reach this API.',
      operationId: 'getAuthConfig',
      parameters: [
        {
          in: 'query',
          name: 'walletAddress',
          required: true,
          schema: stellarAddressSchema,
        },
      ],
      responses: {
        '200': jsonResponse('Authentication configuration retrieved.', {
          type: 'object',
          required: ['protocol', 'keyDerivation'],
          properties: {
            protocol: {
              type: 'object',
              required: [
                'signatureStandard',
                'stellarNetwork',
                'authDomain',
                'authMessageVersion',
                'challengeTtlSeconds',
                'accessTokenTtlSeconds',
              ],
              properties: {
                signatureStandard: { type: 'string', const: 'SEP-53' },
                stellarNetwork: { type: 'string', enum: ['public', 'testnet'] },
                authDomain: { type: 'string' },
                authMessageVersion: { type: 'integer' },
                challengeTtlSeconds: { type: 'integer' },
                accessTokenTtlSeconds: { type: 'integer' },
              },
            },
            keyDerivation: {
              type: 'object',
              required: ['version', 'domain', 'message', 'signingAlgorithm', 'encryptionAlgorithm'],
              properties: {
                version: { type: 'integer' },
                domain: { type: 'string' },
                message: { type: 'string' },
                signingAlgorithm: { type: 'string', const: 'Ed25519' },
                encryptionAlgorithm: { type: 'string', const: 'X25519' },
              },
            },
          },
        }),
        '400': validationError,
        '429': rateLimited,
      },
    },
  },
  '/v1/auth/registration/challenge': {
    post: {
      tags: ['Registration'],
      summary: 'Create a registration wallet-signing challenge',
      operationId: 'createRegistrationChallenge',
      requestBody: jsonBody({
        type: 'object',
        additionalProperties: false,
        required: ['walletAddress', 'keys'],
        properties: {
          walletAddress: stellarAddressSchema,
          keys: { $ref: '#/components/schemas/RegistrationKeys' },
        },
      }),
      responses: {
        '201': jsonResponse('Registration challenge created.', {
          $ref: '#/components/schemas/ChallengeResult',
        }),
        '400': validationError,
        '409': genericError,
        '429': rateLimited,
      },
    },
  },
  '/v1/auth/registration/verify': {
    post: {
      deprecated: true,
      tags: ['Registration'],
      summary: 'Verify a registration challenge using the legacy three-request flow',
      description:
        'Compatibility endpoint. New clients should send challengeId, signature, and profile directly to /v1/auth/register.',
      operationId: 'verifyRegistrationChallenge',
      requestBody: jsonBody({
        type: 'object',
        additionalProperties: false,
        required: ['challengeId', 'signature'],
        properties: {
          challengeId: { $ref: '#/components/schemas/ObjectId' },
          signature: signatureSchema,
        },
      }),
      responses: {
        '200': jsonResponse('Registration challenge verified.', {
          type: 'object',
          required: ['registrationToken', 'expiresAt'],
          properties: {
            registrationToken: { type: 'string', pattern: '^[A-Za-z0-9_-]{43}$' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        }),
        '400': validationError,
        '401': genericError,
        '404': genericError,
        '409': genericError,
        '410': genericError,
        '429': rateLimited,
      },
    },
  },
  '/v1/auth/register': {
    post: {
      tags: ['Registration'],
      summary: 'Register an account and start an authenticated session',
      description:
        'Recommended clients use the signedChallenge shape. The registrationToken shape is retained for compatibility.',
      operationId: 'registerUser',
      requestBody: jsonBody({
        oneOf: [
          {
            title: 'Signed challenge (recommended)',
            type: 'object',
            additionalProperties: false,
            required: ['challengeId', 'signature', 'profile'],
            properties: {
              challengeId: { $ref: '#/components/schemas/ObjectId' },
              signature: signatureSchema,
              profile: { $ref: '#/components/schemas/ProfileInput' },
            },
          },
          {
            title: 'Legacy registration token',
            type: 'object',
            additionalProperties: false,
            required: ['registrationToken', 'profile'],
            properties: {
              registrationToken: { type: 'string', pattern: '^[A-Za-z0-9_-]{43}$' },
              profile: { $ref: '#/components/schemas/ProfileInput' },
            },
          },
        ],
      }),
      responses: {
        '201': jsonResponse('User registered and logged in.', {
          $ref: '#/components/schemas/AuthenticatedResult',
        }),
        '400': validationError,
        '401': genericError,
        '404': genericError,
        '409': genericError,
        '410': genericError,
        '429': rateLimited,
      },
    },
  },
  '/v1/auth/login/challenge': {
    post: {
      tags: ['Authentication'],
      summary: 'Create a login wallet-signing challenge',
      operationId: 'createLoginChallenge',
      requestBody: jsonBody({
        type: 'object',
        additionalProperties: false,
        required: ['walletAddress'],
        properties: { walletAddress: stellarAddressSchema },
      }),
      responses: {
        '201': jsonResponse('Login challenge created.', {
          $ref: '#/components/schemas/ChallengeResult',
        }),
        '400': validationError,
        '404': genericError,
        '429': rateLimited,
      },
    },
  },
  '/v1/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Verify wallet ownership and start a session',
      operationId: 'loginUser',
      requestBody: jsonBody({
        type: 'object',
        additionalProperties: false,
        required: ['challengeId', 'signature'],
        properties: {
          challengeId: { $ref: '#/components/schemas/ObjectId' },
          signature: signatureSchema,
        },
      }),
      responses: {
        '200': jsonResponse('Login successful.', {
          $ref: '#/components/schemas/AuthenticatedResult',
        }),
        '400': validationError,
        '401': genericError,
        '403': genericError,
        '404': genericError,
        '409': genericError,
        '410': genericError,
        '429': rateLimited,
      },
    },
  },
  '/v1/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Rotate the refresh token and issue a new access token',
      operationId: 'refreshSession',
      requestBody: jsonBody({
        type: 'object',
        additionalProperties: false,
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', pattern: '^[A-Za-z0-9_-]{43}$' },
        },
      }),
      responses: {
        '200': jsonResponse('Session refreshed.', {
          type: 'object',
          required: ['auth'],
          properties: { auth: { $ref: '#/components/schemas/AuthTokens' } },
        }),
        '400': validationError,
        '401': genericError,
        '429': rateLimited,
      },
    },
  },
  '/v1/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'Revoke the current session',
      operationId: 'logout',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': jsonResponse('Logout successful.', { type: 'object', additionalProperties: false }),
        '401': unauthorized,
      },
    },
  },
  '/v1/users/me': {
    get: {
      tags: ['Profiles'],
      summary: 'Get the current user profile',
      operationId: 'getCurrentUser',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': jsonResponse('Current user retrieved.', {
          type: 'object',
          required: ['user'],
          properties: { user: { $ref: '#/components/schemas/User' } },
        }),
        '401': unauthorized,
      },
    },
    patch: {
      tags: ['Profiles'],
      summary: 'Update only supplied current-user profile fields',
      description:
        'A regular-to-creator transition requires a complete creator profile. A creator-to-regular transition removes creator-only data atomically.',
      operationId: 'updateCurrentUser',
      security: [{ bearerAuth: [] }],
      requestBody: jsonBody({ $ref: '#/components/schemas/ProfileUpdate' }),
      responses: {
        '200': jsonResponse('Profile updated.', {
          type: 'object',
          required: ['user'],
          properties: { user: { $ref: '#/components/schemas/User' } },
        }),
        '400': validationError,
        '401': unauthorized,
        '409': genericError,
      },
    },
  },
  '/v1/users/username/availability': {
    get: {
      tags: ['Profiles'],
      summary: 'Check username availability for a form',
      description:
        'Returns HTTP 200 for valid, invalid, reserved, and taken values. Registration and profile update must still handle concurrent username conflicts.',
      operationId: 'checkUsernameAvailability',
      parameters: [
        {
          in: 'query',
          name: 'username',
          required: true,
          schema: { type: 'string', minLength: 1, maxLength: 100 },
        },
      ],
      responses: {
        '200': jsonResponse('Username availability evaluated.', {
          type: 'object',
          required: ['username', 'available', 'reason'],
          properties: {
            username: { type: 'string' },
            available: { type: 'boolean' },
            reason: {
              oneOf: [{ type: 'string', enum: ['invalid', 'reserved', 'taken'] }, { type: 'null' }],
            },
          },
        }),
        '400': validationError,
        '429': rateLimited,
      },
    },
  },
  '/v1/users/{username}': {
    get: {
      tags: ['Profiles'],
      summary: 'Get a public profile by username',
      description: 'The public profile intentionally excludes the Stellar wallet address.',
      operationId: 'getPublicProfile',
      parameters: [
        {
          in: 'path',
          name: 'username',
          required: true,
          schema: {
            type: 'string',
            minLength: 3,
            maxLength: 30,
            pattern: '^[a-zA-Z0-9_]+$',
          },
        },
      ],
      responses: {
        '200': jsonResponse('Public profile retrieved.', {
          type: 'object',
          required: ['user'],
          properties: { user: { $ref: '#/components/schemas/PublicUser' } },
        }),
        '400': validationError,
        '404': genericError,
      },
    },
  },
};

export default openApiPaths;
