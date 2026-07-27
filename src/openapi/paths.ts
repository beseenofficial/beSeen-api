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
  '/v1/users/{username}/keys': {
    get: {
      tags: ['Profiles'],
      summary: 'Get a user’s active public encryption and signing keys',
      description:
        'Returns public keys only. Wallet addresses, private keys, and key-derivation signatures are never returned.',
      operationId: 'getPublicUserKeys',
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
        '200': jsonResponse('Active public keys retrieved.', {
          type: 'object',
          required: ['user', 'keys'],
          properties: {
            user: {
              type: 'object',
              required: ['id', 'username'],
              properties: {
                id: { $ref: '#/components/schemas/ObjectId' },
                username: { type: 'string' },
              },
            },
            keys: { $ref: '#/components/schemas/PublicUserKeys' },
          },
        }),
        '400': validationError,
        '404': genericError,
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
  '/v1/broadcasts/drafts': {
    post: {
      tags: ['Broadcasts'],
      summary: 'Create an encrypted broadcast draft and freeze its audience',
      description:
        'Creator-only. Currently snapshots every other active user that has an active encryption key. Returns the creator key and first recipient page so small audiences need no additional key-list request. Plaintext, private keys, content keys, and client-supplied recipient lists are rejected.',
      operationId: 'createBroadcastDraft',
      security: [{ bearerAuth: [] }],
      requestBody: jsonBody({
        type: 'object',
        additionalProperties: false,
        required: ['clientBroadcastId'],
        properties: {
          clientBroadcastId: {
            type: 'string',
            format: 'uuid',
            description: 'Client-generated idempotency ID for safe retries.',
          },
        },
      }),
      responses: {
        '201': jsonResponse('Broadcast draft created.', {
          type: 'object',
          required: ['draft'],
          properties: { draft: { $ref: '#/components/schemas/BroadcastDraft' } },
        }),
        '200': jsonResponse('The idempotent broadcast draft already exists.', {
          type: 'object',
          required: ['draft'],
          properties: { draft: { $ref: '#/components/schemas/BroadcastDraft' } },
        }),
        '400': validationError,
        '401': unauthorized,
        '403': genericError,
        '409': genericError,
        '429': rateLimited,
      },
    },
  },
  '/v1/broadcasts/drafts/{draftId}/recipients': {
    get: {
      tags: ['Broadcasts'],
      summary: 'Get a frozen page of recipient public encryption keys',
      description:
        'Only the creator that owns the draft can access this snapshot. Pass nextCursor from the previous page until hasMore is false.',
      operationId: 'getBroadcastDraftRecipients',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'draftId',
          required: true,
          schema: { $ref: '#/components/schemas/ObjectId' },
        },
        {
          in: 'query',
          name: 'cursor',
          required: false,
          schema: { $ref: '#/components/schemas/ObjectId' },
        },
        {
          in: 'query',
          name: 'limit',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 250, default: 100 },
        },
      ],
      responses: {
        '200': jsonResponse('Recipient public keys retrieved.', {
          type: 'object',
          required: ['draft', 'recipients'],
          properties: {
            draft: {
              type: 'object',
              required: ['id', 'clientBroadcastId', 'status', 'audienceType', 'audienceCount'],
              properties: {
                id: { $ref: '#/components/schemas/ObjectId' },
                clientBroadcastId: { type: 'string', format: 'uuid' },
                status: { type: 'string', const: 'draft' },
                audienceType: { type: 'string', enum: ['all_active_users', 'token_holders'] },
                audienceCount: { type: 'integer', minimum: 0 },
              },
            },
            recipients: { $ref: '#/components/schemas/BroadcastRecipientPage' },
          },
        }),
        '400': validationError,
        '401': unauthorized,
        '404': genericError,
      },
    },
  },
  '/v1/broadcasts/drafts/{draftId}/recipient-keys': {
    put: {
      tags: ['Broadcasts'],
      summary: 'Upload a batch of recipient-wrapped broadcast keys',
      description:
        'Each item is the same random 32-byte content key wrapped locally for one frozen recipient public key. A batch may be retried with identical ciphertexts. A different ciphertext for an already stored recipient is rejected. Plaintext, raw content keys, and private keys are never accepted.',
      operationId: 'uploadBroadcastRecipientKeys',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'draftId',
          required: true,
          schema: { $ref: '#/components/schemas/ObjectId' },
        },
      ],
      requestBody: jsonBody({
        type: 'object',
        additionalProperties: false,
        required: ['keys'],
        properties: {
          keys: {
            type: 'array',
            minItems: 1,
            maxItems: 250,
            items: { $ref: '#/components/schemas/EncryptedBroadcastRecipientKey' },
          },
        },
      }),
      responses: {
        '200': jsonResponse('Encrypted broadcast keys stored.', {
          type: 'object',
          required: ['progress'],
          properties: {
            progress: { $ref: '#/components/schemas/BroadcastKeyUploadProgress' },
          },
        }),
        '400': validationError,
        '401': unauthorized,
        '404': genericError,
        '409': genericError,
        '429': rateLimited,
      },
    },
  },
  '/v1/broadcasts/drafts/{draftId}/finalize': {
    post: {
      tags: ['Broadcasts'],
      summary: 'Verify and publish a complete encrypted broadcast',
      description:
        'Requires every frozen recipient key to be uploaded. The server computes the deterministic recipient manifest digest and verifies the Ed25519 signature using the creator signing public key frozen at draft creation. Identical retries are safe; different finalization payloads conflict.',
      operationId: 'finalizeBroadcast',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'draftId',
          required: true,
          schema: { $ref: '#/components/schemas/ObjectId' },
        },
      ],
      requestBody: jsonBody({
        type: 'object',
        additionalProperties: false,
        required: [
          'contentCiphertext',
          'contentNonce',
          'creatorEncryptedBroadcastKey',
          'signature',
        ],
        properties: {
          contentCiphertext: {
            type: 'string',
            format: 'byte',
            description: 'XChaCha20-Poly1305 ciphertext generated once in the client.',
          },
          contentNonce: {
            type: 'string',
            format: 'byte',
            description: 'Canonical base64 24-byte XChaCha20 nonce.',
          },
          creatorEncryptedBroadcastKey: {
            type: 'string',
            format: 'byte',
            description: 'Canonical base64 80-byte content key wrapped for the creator.',
          },
          signature: {
            type: 'string',
            format: 'byte',
            description: 'Canonical base64 64-byte Ed25519 signature of the documented manifest.',
          },
        },
      }),
      responses: {
        '200': jsonResponse('Broadcast published or identical finalization replayed.', {
          type: 'object',
          required: ['broadcast'],
          properties: { broadcast: { $ref: '#/components/schemas/PublishedBroadcast' } },
        }),
        '400': validationError,
        '401': genericError,
        '404': genericError,
        '409': genericError,
        '429': rateLimited,
      },
    },
  },
};

export default openApiPaths;
