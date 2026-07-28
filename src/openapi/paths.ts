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

const signedTransactionXdrSchema = {
  type: 'string',
  maxLength: 16_384,
  description:
    'Canonical base64 Stellar transaction-envelope XDR returned by wallet signTransaction. It must not be submitted to Stellar.',
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
        'Returns public SEP-10 settings and the client-generated key derivation contract. No wallet address is required and private keys never reach this API.',
      operationId: 'getAuthConfig',
      responses: {
        '200': jsonResponse('Authentication configuration retrieved.', {
          type: 'object',
          required: ['protocol', 'keyDerivation'],
          properties: {
            protocol: {
              type: 'object',
              required: [
                'authenticationStandard',
                'challengeFormat',
                'walletMethod',
                'stellarNetwork',
                'networkPassphrase',
                'authDomain',
                'serverSigningPublicKey',
                'transactionSubmissionRequired',
                'challengeTtlSeconds',
                'accessTokenTtlSeconds',
              ],
              properties: {
                authenticationStandard: { type: 'string', const: 'SEP-10' },
                challengeFormat: { type: 'string', const: 'stellar-transaction-xdr' },
                walletMethod: { type: 'string', const: 'signTransaction' },
                stellarNetwork: { type: 'string', enum: ['public', 'testnet'] },
                networkPassphrase: { type: 'string' },
                authDomain: { type: 'string' },
                serverSigningPublicKey: stellarAddressSchema,
                transactionSubmissionRequired: { type: 'boolean', const: false },
                challengeTtlSeconds: { type: 'integer' },
                accessTokenTtlSeconds: { type: 'integer' },
              },
            },
            keyDerivation: {
              type: 'object',
              required: ['version', 'source', 'kdf', 'signingAlgorithm', 'encryptionAlgorithm'],
              properties: {
                version: { type: 'integer' },
                source: { type: 'string', const: 'CLIENT_GENERATED' },
                kdf: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'name',
                    'input',
                    'inputEncoding',
                    'salt',
                    'seedLengthBytes',
                    'signingInfo',
                    'encryptionInfo',
                  ],
                  properties: {
                    name: { type: 'string', const: 'HKDF-SHA-256' },
                    input: {
                      type: 'string',
                      const: 'CLIENT-RANDOM-32-BYTE-MASTER-SECRET',
                    },
                    inputEncoding: { type: 'string', const: 'raw-bytes' },
                    salt: { type: 'string', const: 'beseen.app/key-derivation/v1' },
                    seedLengthBytes: { type: 'integer', const: 32 },
                    signingInfo: {
                      type: 'string',
                      const: 'beseen.app/ed25519-signing-key/v1',
                    },
                    encryptionInfo: {
                      type: 'string',
                      const: 'beseen.app/x25519-encryption-key/v1',
                    },
                  },
                },
                signingAlgorithm: { type: 'string', const: 'Ed25519' },
                encryptionAlgorithm: { type: 'string', const: 'X25519' },
              },
            },
          },
        }),
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
  '/v1/auth/register': {
    post: {
      tags: ['Registration'],
      summary: 'Register an account and start an authenticated session',
      description:
        'Verifies and consumes the exact SEP-10 challenge. The signed transaction is never submitted to Stellar.',
      operationId: 'registerUser',
      requestBody: jsonBody({
        type: 'object',
        additionalProperties: false,
        required: ['challengeId', 'signedTransactionXdr', 'profile'],
        properties: {
          challengeId: { $ref: '#/components/schemas/ObjectId' },
          signedTransactionXdr: signedTransactionXdrSchema,
          profile: { $ref: '#/components/schemas/ProfileInput' },
        },
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
        required: ['challengeId', 'signedTransactionXdr'],
        properties: {
          challengeId: { $ref: '#/components/schemas/ObjectId' },
          signedTransactionXdr: signedTransactionXdrSchema,
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
        'Returns public keys only. Wallet addresses, private keys, and client master secrets are never returned.',
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
  '/v1/broadcasts/feed': {
    get: {
      tags: ['Broadcasts'],
      summary: 'Get received or sent encrypted broadcasts for the current user',
      description:
        'Defaults to received. Every item has the same shape, and viewerKey contains only the wrapped content key intended for the authenticated viewer. The signed manifest also contains the creator wrapped ciphertext required for signature verification; it is not decryptable by recipients. Plaintext and private keys are never returned.',
      operationId: 'getBroadcastFeed',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'view',
          required: false,
          schema: { type: 'string', enum: ['received', 'sent'], default: 'received' },
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
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ],
      responses: {
        '200': jsonResponse('Broadcast feed retrieved.', {
          type: 'object',
          required: ['feed'],
          properties: { feed: { $ref: '#/components/schemas/BroadcastFeedPage' } },
        }),
        '400': validationError,
        '401': unauthorized,
        '429': rateLimited,
      },
    },
  },
  '/v1/broadcasts/drafts': {
    get: {
      tags: ['Broadcasts'],
      summary: 'List unfinished broadcast drafts for resuming client work',
      description:
        'Returns only drafts owned by the authenticated user, including aggregate wrapped-key upload progress. Use the recipient pages to recover the exact previously uploaded ciphertexts.',
      operationId: 'getBroadcastDrafts',
      security: [{ bearerAuth: [] }],
      parameters: [
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
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ],
      responses: {
        '200': jsonResponse('Broadcast drafts retrieved.', {
          type: 'object',
          required: ['drafts'],
          properties: {
            drafts: {
              type: 'object',
              required: ['items', 'nextCursor', 'hasMore'],
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/BroadcastDraftListItem' },
                },
                nextCursor: {
                  oneOf: [{ $ref: '#/components/schemas/ObjectId' }, { type: 'null' }],
                },
                hasMore: { type: 'boolean' },
              },
            },
          },
        }),
        '400': validationError,
        '401': unauthorized,
        '429': rateLimited,
      },
    },
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
        'Only the creator that owns the draft can access this snapshot. Pass nextCursor from the previous page until hasMore is false. Each item includes upload status and the exact previously stored wrapped ciphertext so interrupted clients can resume.',
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
              required: [
                'id',
                'clientBroadcastId',
                'status',
                'audienceType',
                'audienceCount',
                'progress',
                'expiresAt',
              ],
              properties: {
                id: { $ref: '#/components/schemas/ObjectId' },
                clientBroadcastId: { type: 'string', format: 'uuid' },
                status: { type: 'string', const: 'draft' },
                audienceType: { type: 'string', enum: ['all_active_users', 'token_holders'] },
                audienceCount: { type: 'integer', minimum: 0 },
                progress: { $ref: '#/components/schemas/BroadcastDraftProgress' },
                expiresAt: { type: 'string', format: 'date-time' },
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
  '/v1/broadcasts/drafts/{draftId}': {
    delete: {
      tags: ['Broadcasts'],
      summary: 'Cancel an unfinished broadcast draft',
      description:
        'Atomically changes an owned draft to canceled before removing its recipient snapshot. Published broadcasts cannot be canceled through this endpoint. Repeating the request while the canceled tombstone still exists is safe.',
      operationId: 'cancelBroadcastDraft',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'draftId',
          required: true,
          schema: { $ref: '#/components/schemas/ObjectId' },
        },
      ],
      responses: {
        '200': jsonResponse('Broadcast draft canceled or already canceled.', {
          type: 'object',
          required: ['draft'],
          properties: {
            draft: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'status', 'canceledAt', 'removedRecipientCount'],
              properties: {
                id: { $ref: '#/components/schemas/ObjectId' },
                status: { type: 'string', const: 'canceled' },
                canceledAt: { type: 'string', format: 'date-time' },
                removedRecipientCount: { type: 'integer', minimum: 0 },
              },
            },
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
        '410': genericError,
        '429': rateLimited,
      },
    },
  },
};

export default openApiPaths;
