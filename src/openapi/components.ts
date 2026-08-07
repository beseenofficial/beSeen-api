const objectIdSchema = {
  type: 'string',
  pattern: '^[a-fA-F0-9]{24}$',
  example: '507f1f77bcf86cd799439011',
};

const nullableUrlSchema = {
  oneOf: [{ type: 'string', format: 'uri', maxLength: 2048 }, { type: 'null' }],
  description: 'An absolute http/https URL, or null.',
  example: 'https://cdn.example/avatar.webp',
};

const userProperties = {
  id: objectIdSchema,
  username: {
    type: 'string',
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-z0-9_]+$',
    example: 'new_user',
  },
  avatar: nullableUrlSchema,
  createdAt: { type: 'string', format: 'date-time' },
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
    User: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(userProperties),
      properties: userProperties,
    },
    PublicUser: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(userProperties),
      properties: userProperties,
    },
    UserToken: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'owner', 'createdAt'],
      properties: {
        id: objectIdSchema,
        owner: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'username', 'avatar'],
          properties: {
            id: objectIdSchema,
            username: userProperties.username,
            avatar: nullableUrlSchema,
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        acquiredAt: {
          type: 'string',
          format: 'date-time',
          description: 'Present when returned as one of the current user’s holdings.',
        },
      },
    },
    TokenHolding: {
      type: 'object',
      additionalProperties: false,
      required: ['tokenId', 'ownerId', 'ownerUsername', 'acquiredAt'],
      properties: {
        tokenId: objectIdSchema,
        ownerId: objectIdSchema,
        ownerUsername: userProperties.username,
        acquiredAt: { type: 'string', format: 'date-time' },
      },
    },
    TokenPurchaseConversation: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'created'],
      properties: {
        id: objectIdSchema,
        created: {
          type: 'boolean',
          description: 'True only when this token purchase created the pair conversation.',
        },
      },
    },
    MessengerParticipant: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'username', 'avatar'],
      properties: {
        id: objectIdSchema,
        username: userProperties.username,
        avatar: nullableUrlSchema,
      },
    },
    MessengerConversation: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'otherParticipant',
        'unreadCount',
        'readState',
        'lastMessage',
        'lastMessageAt',
        'createdAt',
      ],
      properties: {
        id: objectIdSchema,
        otherParticipant: { $ref: '#/components/schemas/MessengerParticipant' },
        unreadCount: { type: 'integer', minimum: 0 },
        readState: { $ref: '#/components/schemas/MessengerConversationReadState' },
        lastMessage: {
          oneOf: [
            { $ref: '#/components/schemas/MessengerConversationLastMessage' },
            { type: 'null' },
          ],
        },
        lastMessageAt: {
          oneOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    MessengerConversationLastMessage: {
      type: 'object',
      additionalProperties: false,
      required: ['sequence', 'clientMessageId', 'senderId', 'createdAt'],
      properties: {
        sequence: { type: 'integer', minimum: 1 },
        clientMessageId: { type: 'string', format: 'uuid' },
        senderId: objectIdSchema,
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    MessengerConversationReadState: {
      type: 'object',
      additionalProperties: false,
      required: ['viewerReadSequence', 'otherParticipantReadSequence'],
      properties: {
        viewerReadSequence: { type: 'integer', minimum: 0 },
        otherParticipantReadSequence: { type: 'integer', minimum: 0 },
      },
    },
    MessengerConversationPage: {
      type: 'object',
      additionalProperties: false,
      required: ['items', 'nextCursor', 'hasMore'],
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/MessengerConversation' },
        },
        nextCursor: {
          oneOf: [{ type: 'string', maxLength: 256 }, { type: 'null' }],
          description: 'Opaque activity cursor. Clients must not construct or modify it.',
        },
        hasMore: { type: 'boolean' },
      },
    },
    MessengerContextParticipant: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'username',
        'avatar',
        'keyVersion',
        'signingPublicKey',
        'encryptionPublicKey',
      ],
      properties: {
        id: objectIdSchema,
        username: userProperties.username,
        avatar: nullableUrlSchema,
        keyVersion: { type: 'integer', minimum: 1 },
        signingPublicKey: { type: 'string', pattern: '^[A-Za-z0-9+/]{43}=$' },
        encryptionPublicKey: { type: 'string', pattern: '^[A-Za-z0-9+/]{43}=$' },
      },
    },
    MessengerConversationContext: {
      type: 'object',
      additionalProperties: false,
      required: ['conversationId', 'viewer', 'otherParticipant'],
      properties: {
        conversationId: objectIdSchema,
        viewer: { $ref: '#/components/schemas/MessengerContextParticipant' },
        otherParticipant: { $ref: '#/components/schemas/MessengerContextParticipant' },
      },
    },
    MessengerSendMessageRequest: {
      type: 'object',
      additionalProperties: false,
      required: [
        'clientMessageId',
        'contentCiphertext',
        'contentNonce',
        'senderEncryptedMessageKey',
        'recipientEncryptedMessageKey',
        'signature',
      ],
      properties: {
        clientMessageId: {
          type: 'string',
          format: 'uuid',
          description: 'Client-generated idempotency UUID. Reuse it only for an identical retry.',
        },
        contentCiphertext: {
          type: 'string',
          format: 'byte',
          description: 'Client-side XChaCha20-Poly1305 ciphertext. Plaintext is never accepted.',
        },
        contentNonce: {
          type: 'string',
          format: 'byte',
          description: 'Canonical base64 24-byte XChaCha20 nonce.',
        },
        senderEncryptedMessageKey: {
          type: 'string',
          format: 'byte',
          description:
            'Canonical base64 80-byte sealed-box ciphertext of the content key for the sender.',
        },
        recipientEncryptedMessageKey: {
          type: 'string',
          format: 'byte',
          description:
            'Canonical base64 80-byte sealed-box ciphertext of the same content key for the recipient.',
        },
        replyToMessageId: {
          oneOf: [{ $ref: '#/components/schemas/ObjectId' }, { type: 'null' }],
          description: 'Optional message in this same conversation being replied to.',
        },
        signature: {
          type: 'string',
          format: 'byte',
          description:
            'Canonical base64 Ed25519 signature over the documented direct-message manifest.',
        },
      },
    },
    MessengerSentMessage: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'conversationId',
        'sequence',
        'clientMessageId',
        'senderId',
        'recipientId',
        'replyToMessageId',
        'createdAt',
      ],
      properties: {
        id: objectIdSchema,
        conversationId: objectIdSchema,
        sequence: { type: 'integer', minimum: 1 },
        clientMessageId: { type: 'string', format: 'uuid' },
        senderId: objectIdSchema,
        recipientId: objectIdSchema,
        replyToMessageId: {
          oneOf: [{ $ref: '#/components/schemas/ObjectId' }, { type: 'null' }],
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    MessengerMessageManifest: {
      type: 'object',
      additionalProperties: false,
      required: [
        'signatureVersion',
        'encryptionVersion',
        'contentSuite',
        'keyWrapSuite',
        'conversationId',
        'clientMessageId',
        'senderId',
        'recipientId',
        'senderKeyVersion',
        'recipientKeyVersion',
        'senderSigningPublicKey',
        'senderEncryptionPublicKey',
        'recipientEncryptionPublicKey',
        'contentCiphertext',
        'contentNonce',
        'senderEncryptedMessageKey',
        'recipientEncryptedMessageKey',
        'replyToMessageId',
      ],
      properties: {
        signatureVersion: { type: 'integer', const: 1 },
        encryptionVersion: { type: 'integer', const: 1 },
        contentSuite: { type: 'string', const: 'XCHACHA20-POLY1305-IETF' },
        keyWrapSuite: {
          type: 'string',
          const: 'X25519-XSALSA20-POLY1305-SEALEDBOX',
        },
        conversationId: objectIdSchema,
        clientMessageId: { type: 'string', format: 'uuid' },
        senderId: objectIdSchema,
        recipientId: objectIdSchema,
        senderKeyVersion: { type: 'integer', minimum: 1 },
        recipientKeyVersion: { type: 'integer', minimum: 1 },
        senderSigningPublicKey: { type: 'string', format: 'byte' },
        senderEncryptionPublicKey: { type: 'string', format: 'byte' },
        recipientEncryptionPublicKey: { type: 'string', format: 'byte' },
        contentCiphertext: { type: 'string', format: 'byte' },
        contentNonce: { type: 'string', format: 'byte' },
        senderEncryptedMessageKey: { type: 'string', format: 'byte' },
        recipientEncryptedMessageKey: { type: 'string', format: 'byte' },
        replyToMessageId: {
          oneOf: [{ $ref: '#/components/schemas/ObjectId' }, { type: 'null' }],
        },
      },
    },
    MessengerMessageViewerKey: {
      type: 'object',
      additionalProperties: false,
      required: ['source', 'keyVersion', 'encryptionPublicKey', 'encryptedMessageKey'],
      properties: {
        source: { type: 'string', enum: ['sender', 'recipient'] },
        keyVersion: { type: 'integer', minimum: 1 },
        encryptionPublicKey: { type: 'string', format: 'byte' },
        encryptedMessageKey: {
          type: 'string',
          format: 'byte',
          description: 'The wrapped content key intended for the authenticated viewer.',
        },
      },
    },
    MessengerMessageIntegrity: {
      type: 'object',
      additionalProperties: false,
      required: ['algorithm', 'signingPublicKey', 'signature'],
      properties: {
        algorithm: { type: 'string', const: 'Ed25519' },
        signingPublicKey: { type: 'string', format: 'byte' },
        signature: { type: 'string', format: 'byte' },
      },
    },
    MessengerMessageHistoryItem: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'sequence', 'manifest', 'viewerKey', 'integrity', 'delivery', 'createdAt'],
      properties: {
        id: objectIdSchema,
        sequence: { type: 'integer', minimum: 1 },
        manifest: { $ref: '#/components/schemas/MessengerMessageManifest' },
        viewerKey: { $ref: '#/components/schemas/MessengerMessageViewerKey' },
        integrity: { $ref: '#/components/schemas/MessengerMessageIntegrity' },
        delivery: {
          type: 'object',
          additionalProperties: false,
          required: ['seenByRecipient'],
          properties: {
            seenByRecipient: {
              type: 'boolean',
              description:
                'True when the recipient read cursor has reached or passed this message sequence.',
            },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    MessengerMessageHistoryPage: {
      type: 'object',
      additionalProperties: false,
      required: ['items', 'nextBeforeSequence', 'hasMore'],
      properties: {
        items: {
          type: 'array',
          description: 'Newest-first encrypted message envelopes.',
          items: { $ref: '#/components/schemas/MessengerMessageHistoryItem' },
        },
        nextBeforeSequence: {
          oneOf: [{ type: 'integer', minimum: 2 }, { type: 'null' }],
        },
        hasMore: { type: 'boolean' },
      },
    },
    MessengerReadReceipt: {
      type: 'object',
      additionalProperties: false,
      required: ['conversationId', 'readSequence', 'unreadCount'],
      properties: {
        conversationId: objectIdSchema,
        readSequence: { type: 'integer', minimum: 1 },
        unreadCount: { type: 'integer', minimum: 0 },
      },
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
    ProfileUpdate: {
      type: 'object',
      minProperties: 1,
      additionalProperties: false,
      properties: {
        username: userProperties.username,
        removeAvatar: {
          type: 'boolean',
          const: true,
          description: 'Set to true to remove the current avatar.',
        },
      },
    },
    RegistrationKeys: {
      type: 'object',
      additionalProperties: false,
      required: ['signing', 'encryption'],
      properties: {
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
    BroadcastRecipientPublicKey: {
      type: 'object',
      additionalProperties: false,
      required: [
        'userId',
        'username',
        'keyVersion',
        'encryptionPublicKey',
        'keyUploaded',
        'encryptedBroadcastKey',
      ],
      properties: {
        userId: objectIdSchema,
        username: { type: 'string' },
        keyVersion: { type: 'integer', minimum: 1, example: 1 },
        encryptionPublicKey: {
          type: 'string',
          format: 'byte',
          description: 'Canonical base64 X25519 public key. This is never a private key.',
        },
        keyUploaded: { type: 'boolean' },
        encryptedBroadcastKey: {
          oneOf: [{ type: 'string', format: 'byte' }, { type: 'null' }],
          description:
            'The previously uploaded wrapped ciphertext, or null. Returned only to the draft owner so an interrupted upload can resume exactly.',
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
      required: ['recipientId', 'encryptedBroadcastKey'],
      properties: {
        recipientId: objectIdSchema,
        encryptedBroadcastKey: {
          type: 'string',
          format: 'byte',
          description:
            'Canonical base64 80-byte sealed-box ciphertext containing the random 32-byte broadcast content key. The server already owns the frozen recipient key version.',
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
        'progress',
        'recipients',
        'createdAt',
        'expiresAt',
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
            type: { type: 'string', const: 'token_holders' },
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
        progress: { $ref: '#/components/schemas/BroadcastDraftProgress' },
        recipients: { $ref: '#/components/schemas/BroadcastRecipientPage' },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
    BroadcastDraftProgress: {
      type: 'object',
      additionalProperties: false,
      required: ['uploadedCount', 'remainingCount', 'complete'],
      properties: {
        uploadedCount: { type: 'integer', minimum: 0 },
        remainingCount: { type: 'integer', minimum: 0 },
        complete: { type: 'boolean' },
      },
    },
    BroadcastDraftListItem: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'clientBroadcastId',
        'status',
        'audience',
        'progress',
        'encryption',
        'creatorKey',
        'createdAt',
        'expiresAt',
      ],
      properties: {
        id: objectIdSchema,
        clientBroadcastId: { type: 'string', format: 'uuid' },
        status: { type: 'string', const: 'draft' },
        audience: {
          type: 'object',
          required: ['type', 'count'],
          properties: {
            type: { type: 'string', enum: ['demo_all_users', 'token_holders'] },
            count: { type: 'integer', minimum: 0 },
          },
        },
        progress: { $ref: '#/components/schemas/BroadcastDraftProgress' },
        encryption: {
          type: 'object',
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
          required: ['keyVersion', 'encryptionPublicKey'],
          properties: {
            keyVersion: { type: 'integer', minimum: 1 },
            encryptionPublicKey: { type: 'string', format: 'byte' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
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
            type: { type: 'string', enum: ['demo_all_users', 'token_holders'] },
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
          required: ['id', 'username', 'avatar'],
          properties: {
            id: objectIdSchema,
            username: { type: 'string' },
            avatar: nullableUrlSchema,
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
            audienceType: { type: 'string', enum: ['demo_all_users', 'token_holders'] },
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
