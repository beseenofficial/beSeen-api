const objectIdSchema = {
  type: 'string',
  pattern: '^[a-fA-F0-9]{24}$',
  example: '507f1f77bcf86cd799439011',
};

const nullableUrlSchema = {
  oneOf: [{ type: 'string', format: 'uri', maxLength: 2048 }, { type: 'null' }],
  example: 'https://cdn.example/avatar.webp',
};

const creatorProfileSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'categories', 'skills', 'websiteUrl', 'isAvailableForWork'],
  properties: {
    headline: { type: 'string', minLength: 1, maxLength: 100 },
    categories: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      uniqueItems: true,
      items: { type: 'string', minLength: 1, maxLength: 50 },
    },
    skills: {
      type: 'array',
      maxItems: 20,
      uniqueItems: true,
      items: { type: 'string', minLength: 1, maxLength: 50 },
    },
    websiteUrl: nullableUrlSchema,
    isAvailableForWork: { type: 'boolean' },
  },
};

const userProperties = {
  id: objectIdSchema,
  walletAddress: {
    type: 'string',
    description: 'Canonical Stellar G address. Only returned to the account owner.',
    example: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
  },
  username: {
    type: 'string',
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-z0-9_]+$',
    example: 'new_user',
  },
  displayName: { type: 'string', minLength: 1, maxLength: 50, example: 'New User' },
  bio: { type: 'string', maxLength: 300, example: 'BeSeen member' },
  avatarUrl: nullableUrlSchema,
  accountType: { type: 'string', enum: ['regular', 'creator'] },
  creatorProfile: {
    oneOf: [{ $ref: '#/components/schemas/CreatorProfile' }, { type: 'null' }],
  },
  createdAt: { type: 'string', format: 'date-time' },
};

const profileInputProperties = {
  username: userProperties.username,
  displayName: userProperties.displayName,
  bio: { type: 'string', maxLength: 300, default: '' },
  avatarUrl: nullableUrlSchema,
  accountType: userProperties.accountType,
  creatorProfile: { $ref: '#/components/schemas/CreatorProfileInput' },
};

const openApiComponents = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Access token returned by registration, login, or refresh.',
    },
  },
  schemas: {
    ObjectId: objectIdSchema,
    ValidationIssue: {
      type: 'object',
      required: ['path', 'message'],
      properties: {
        path: { type: 'string', example: 'profile.username' },
        message: { type: 'string', example: 'Username is reserved' },
      },
    },
    ErrorResponse: {
      type: 'object',
      required: ['status', 'message', 'result'],
      properties: {
        status: { type: 'string', const: 'error' },
        message: { type: 'string' },
        result: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            issues: {
              type: 'array',
              items: { $ref: '#/components/schemas/ValidationIssue' },
            },
            attemptsRemaining: { type: 'integer', minimum: 0 },
          },
          additionalProperties: true,
        },
      },
    },
    CreatorProfile: creatorProfileSchema,
    CreatorProfileInput: creatorProfileSchema,
    CreatorProfileUpdate: {
      type: 'object',
      minProperties: 1,
      additionalProperties: false,
      properties: creatorProfileSchema.properties,
    },
    User: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(userProperties),
      properties: userProperties,
    },
    PublicUser: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(userProperties).filter((property) => property !== 'walletAddress'),
      properties: Object.fromEntries(
        Object.entries(userProperties).filter(([property]) => property !== 'walletAddress'),
      ),
    },
    AuthTokens: {
      type: 'object',
      additionalProperties: false,
      required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn', 'refreshTokenExpiresAt'],
      properties: {
        accessToken: { type: 'string', description: 'Short-lived JWT access token.' },
        refreshToken: {
          type: 'string',
          pattern: '^[A-Za-z0-9_-]{43}$',
          description: 'Opaque rotating refresh token. Replace the previous value after refresh.',
        },
        tokenType: { type: 'string', const: 'Bearer' },
        expiresIn: { type: 'integer', example: 900 },
        refreshTokenExpiresAt: { type: 'string', format: 'date-time' },
      },
    },
    AuthenticatedResult: {
      type: 'object',
      additionalProperties: false,
      required: ['user', 'auth'],
      properties: {
        user: { $ref: '#/components/schemas/User' },
        auth: { $ref: '#/components/schemas/AuthTokens' },
      },
    },
    ProfileInput: {
      type: 'object',
      additionalProperties: false,
      required: ['username', 'displayName', 'accountType'],
      properties: profileInputProperties,
    },
    ProfileUpdate: {
      type: 'object',
      minProperties: 1,
      additionalProperties: false,
      properties: {
        username: profileInputProperties.username,
        displayName: profileInputProperties.displayName,
        bio: profileInputProperties.bio,
        avatarUrl: profileInputProperties.avatarUrl,
        accountType: profileInputProperties.accountType,
        creatorProfile: { $ref: '#/components/schemas/CreatorProfileUpdate' },
      },
    },
    RegistrationKeys: {
      type: 'object',
      additionalProperties: false,
      required: ['derivationVersion', 'signing', 'encryption'],
      properties: {
        derivationVersion: { type: 'integer', const: 1 },
        signing: {
          type: 'object',
          additionalProperties: false,
          required: ['algorithm', 'publicKey'],
          properties: {
            algorithm: { type: 'string', const: 'Ed25519' },
            publicKey: { type: 'string', pattern: '^[A-Za-z0-9+/]{43}=$' },
          },
        },
        encryption: {
          type: 'object',
          additionalProperties: false,
          required: ['algorithm', 'publicKey'],
          properties: {
            algorithm: { type: 'string', const: 'X25519' },
            publicKey: { type: 'string', pattern: '^[A-Za-z0-9+/]{43}=$' },
          },
        },
      },
    },
    ChallengeResult: {
      type: 'object',
      additionalProperties: false,
      required: ['challengeId', 'message', 'expiresAt'],
      properties: {
        challengeId: objectIdSchema,
        message: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
    BroadcastRecipientPublicKey: {
      type: 'object',
      additionalProperties: false,
      required: ['userId', 'username', 'keyVersion', 'encryptionPublicKey'],
      properties: {
        userId: objectIdSchema,
        username: { type: 'string' },
        keyVersion: { type: 'integer', minimum: 1, example: 1 },
        encryptionPublicKey: {
          type: 'string',
          format: 'byte',
          description: 'Canonical base64 X25519 public key. This is never a private key.',
        },
      },
    },
    BroadcastRecipientPage: {
      type: 'object',
      additionalProperties: false,
      required: ['items', 'nextCursor', 'hasMore'],
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/BroadcastRecipientPublicKey' },
        },
        nextCursor: { oneOf: [objectIdSchema, { type: 'null' }] },
        hasMore: { type: 'boolean' },
      },
    },
    EncryptedBroadcastRecipientKey: {
      type: 'object',
      additionalProperties: false,
      required: ['recipientId', 'keyVersion', 'encryptedBroadcastKey'],
      properties: {
        recipientId: objectIdSchema,
        keyVersion: { type: 'integer', minimum: 1 },
        encryptedBroadcastKey: {
          type: 'string',
          format: 'byte',
          description:
            'Canonical base64 80-byte sealed-box ciphertext containing the random 32-byte broadcast content key.',
        },
      },
    },
    BroadcastKeyUploadProgress: {
      type: 'object',
      additionalProperties: false,
      required: ['acceptedCount', 'uploadedCount', 'audienceCount', 'remainingCount', 'complete'],
      properties: {
        acceptedCount: { type: 'integer', minimum: 1, maximum: 250 },
        uploadedCount: { type: 'integer', minimum: 0 },
        audienceCount: { type: 'integer', minimum: 0 },
        remainingCount: { type: 'integer', minimum: 0 },
        complete: { type: 'boolean' },
      },
    },
    BroadcastDraft: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'clientBroadcastId',
        'status',
        'audience',
        'encryption',
        'creatorKey',
        'recipients',
        'createdAt',
      ],
      properties: {
        id: objectIdSchema,
        clientBroadcastId: { type: 'string', format: 'uuid' },
        status: { type: 'string', const: 'draft' },
        audience: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'count'],
          properties: {
            type: { type: 'string', const: 'all_active_users' },
            count: { type: 'integer', minimum: 0 },
          },
        },
        encryption: {
          type: 'object',
          additionalProperties: false,
          required: ['version', 'contentSuite', 'keyWrapSuite'],
          properties: {
            version: { type: 'integer', const: 1 },
            contentSuite: { type: 'string', const: 'XCHACHA20-POLY1305-IETF' },
            keyWrapSuite: {
              type: 'string',
              const: 'X25519-XSALSA20-POLY1305-SEALEDBOX',
            },
          },
        },
        creatorKey: {
          type: 'object',
          additionalProperties: false,
          required: ['keyVersion', 'encryptionPublicKey'],
          properties: {
            keyVersion: { type: 'integer', minimum: 1 },
            encryptionPublicKey: { type: 'string', format: 'byte' },
          },
        },
        recipients: { $ref: '#/components/schemas/BroadcastRecipientPage' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    PublishedBroadcast: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'clientBroadcastId',
        'creatorId',
        'status',
        'audience',
        'encryptionVersion',
        'contentCiphertext',
        'contentNonce',
        'creatorEncryptedBroadcastKey',
        'recipientKeysDigest',
        'signature',
        'publishedAt',
      ],
      properties: {
        id: objectIdSchema,
        clientBroadcastId: { type: 'string', format: 'uuid' },
        creatorId: objectIdSchema,
        status: { type: 'string', const: 'published' },
        audience: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'count'],
          properties: {
            type: { type: 'string', enum: ['all_active_users', 'token_holders'] },
            count: { type: 'integer', minimum: 0 },
          },
        },
        encryptionVersion: { type: 'integer', const: 1 },
        contentCiphertext: { type: 'string', format: 'byte' },
        contentNonce: {
          type: 'string',
          format: 'byte',
          description: 'Canonical base64 24-byte XChaCha20 nonce.',
        },
        creatorEncryptedBroadcastKey: {
          type: 'string',
          format: 'byte',
          description: 'Canonical base64 80-byte sealed-box content key for the creator.',
        },
        recipientKeysDigest: {
          type: 'string',
          pattern: '^[a-f0-9]{64}$',
          description: 'Lowercase SHA-256 hex digest of the canonical recipient key manifest.',
        },
        signature: { type: 'string', format: 'byte' },
        publishedAt: { type: 'string', format: 'date-time' },
      },
    },
    BroadcastFeedItem: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'clientBroadcastId',
        'creator',
        'manifest',
        'viewerKey',
        'integrity',
        'publishedAt',
      ],
      properties: {
        id: objectIdSchema,
        clientBroadcastId: { type: 'string', format: 'uuid' },
        creator: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'username', 'displayName', 'avatarUrl'],
          properties: {
            id: objectIdSchema,
            username: { type: 'string' },
            displayName: { type: 'string' },
            avatarUrl: nullableUrlSchema,
          },
        },
        manifest: {
          type: 'object',
          additionalProperties: false,
          required: [
            'signatureVersion',
            'encryptionVersion',
            'contentSuite',
            'keyWrapSuite',
            'creatorId',
            'creatorKeyVersion',
            'contentCiphertext',
            'contentNonce',
            'creatorEncryptedBroadcastKey',
            'audienceType',
            'audienceCount',
            'recipientKeysDigest',
          ],
          properties: {
            signatureVersion: { type: 'integer', const: 1 },
            encryptionVersion: { type: 'integer', const: 1 },
            contentSuite: { type: 'string', const: 'XCHACHA20-POLY1305-IETF' },
            keyWrapSuite: {
              type: 'string',
              const: 'X25519-XSALSA20-POLY1305-SEALEDBOX',
            },
            creatorId: objectIdSchema,
            creatorKeyVersion: { type: 'integer', minimum: 1 },
            contentCiphertext: { type: 'string', format: 'byte' },
            contentNonce: { type: 'string', format: 'byte' },
            creatorEncryptedBroadcastKey: { type: 'string', format: 'byte' },
            audienceType: { type: 'string', enum: ['all_active_users', 'token_holders'] },
            audienceCount: { type: 'integer', minimum: 0 },
            recipientKeysDigest: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          },
        },
        viewerKey: {
          type: 'object',
          additionalProperties: false,
          required: ['source', 'keyVersion', 'encryptedBroadcastKey'],
          properties: {
            source: { type: 'string', enum: ['recipient', 'creator'] },
            keyVersion: { type: 'integer', minimum: 1 },
            encryptedBroadcastKey: {
              type: 'string',
              format: 'byte',
              description: 'The only wrapped content key intended for the authenticated viewer.',
            },
          },
        },
        integrity: {
          type: 'object',
          additionalProperties: false,
          required: ['algorithm', 'signingPublicKey', 'signature'],
          properties: {
            algorithm: { type: 'string', const: 'Ed25519' },
            signingPublicKey: { type: 'string', format: 'byte' },
            signature: { type: 'string', format: 'byte' },
          },
        },
        publishedAt: { type: 'string', format: 'date-time' },
      },
    },
    BroadcastFeedPage: {
      type: 'object',
      additionalProperties: false,
      required: ['view', 'items', 'nextCursor', 'hasMore'],
      properties: {
        view: { type: 'string', enum: ['received', 'sent'] },
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/BroadcastFeedItem' },
        },
        nextCursor: { oneOf: [objectIdSchema, { type: 'null' }] },
        hasMore: { type: 'boolean' },
      },
    },
    PublicUserKeys: {
      type: 'object',
      additionalProperties: false,
      required: ['derivationVersion', 'signing', 'encryption'],
      properties: {
        derivationVersion: { type: 'integer', minimum: 1 },
        signing: {
          type: 'object',
          required: ['algorithm', 'publicKey'],
          properties: {
            algorithm: { type: 'string', const: 'Ed25519' },
            publicKey: { type: 'string', format: 'byte' },
          },
        },
        encryption: {
          type: 'object',
          required: ['algorithm', 'publicKey'],
          properties: {
            algorithm: { type: 'string', const: 'X25519' },
            publicKey: { type: 'string', format: 'byte' },
          },
        },
      },
    },
  },
  responses: {
    ValidationError: {
      description: 'The request did not match the documented contract.',
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
      },
    },
    Unauthorized: {
      description: 'The access token or session is missing, invalid, expired, or revoked.',
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
      },
    },
    RateLimited: {
      description: 'Too many requests.',
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
      },
    },
  },
};

export default openApiComponents;
