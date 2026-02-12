import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Traza API',
      version: '1.0.0',
      description:
        'E-signature platform API with cryptographic verification and blockchain anchoring.',
      contact: {
        name: 'Traza',
        url: 'https://traza.dev',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            planTier: {
              type: 'string',
              enum: ['FREE', 'STARTER', 'PRO', 'PROOF', 'ENTERPRISE'],
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Document: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            fileHash: { type: 'string' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PENDING', 'SIGNED', 'EXPIRED'],
            },
            blockchainTxHash: { type: 'string', nullable: true },
            blockchainNetwork: { type: 'string', nullable: true },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Signature: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            signerEmail: { type: 'string', format: 'email' },
            signerName: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'SIGNED', 'DECLINED'],
            },
            signedAt: { type: 'string', format: 'date-time', nullable: true },
            signatureType: {
              type: 'string',
              enum: ['ELECTRONIC', 'PKI'],
              nullable: true,
            },
            order: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Webhook: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            url: { type: 'string', format: 'uri' },
            events: {
              type: 'array',
              items: { type: 'string' },
            },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        WebhookDelivery: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            eventType: { type: 'string' },
            payload: { type: 'object' },
            responseCode: { type: 'integer', nullable: true },
            attempts: { type: 'integer' },
            deliveredAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        VerificationResult: {
          type: 'object',
          properties: {
            verified: { type: 'boolean' },
            fileHash: { type: 'string' },
            storedHash: { type: 'string' },
            hashedAt: { type: 'string', format: 'date-time' },
          },
        },
        ProofBundle: {
          type: 'object',
          properties: {
            documentId: { type: 'string', format: 'uuid' },
            fileHash: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            blockchain: {
              type: 'object',
              nullable: true,
              properties: {
                network: { type: 'string' },
                txHash: { type: 'string' },
              },
            },
            signatures: {
              type: 'array',
              items: { $ref: '#/components/schemas/Signature' },
            },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalDocuments: { type: 'integer' },
            pendingSignatures: { type: 'integer' },
            completedDocuments: { type: 'integer' },
            recentActivity: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
    paths: {
      // ─── Auth ────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Account created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthTokens' },
                },
              },
            },
            '409': { description: 'Email already in use' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Log in with email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Logged in',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthTokens' },
                },
              },
            },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token using httpOnly cookie',
          responses: {
            '200': {
              description: 'New access token',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthTokens' },
                },
              },
            },
            '401': { description: 'Invalid or expired refresh token' },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Invalidate refresh token',
          responses: {
            '200': { description: 'Logged out' },
          },
        },
      },
      '/auth/api-key': {
        post: {
          tags: ['Auth'],
          summary: 'Generate a new API key',
          security: [{ bearerAuth: [] }],
          responses: {
            '201': {
              description: 'API key generated (only shown once)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      apiKey: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ─── Documents ───────────────────────────────
      '/documents': {
        post: {
          tags: ['Documents'],
          summary: 'Upload a new document',
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file', 'title'],
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    title: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Document uploaded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Document' },
                },
              },
            },
            '400': { description: 'Invalid file or missing fields' },
            '401': { description: 'Unauthorized' },
          },
        },
        get: {
          tags: ['Documents'],
          summary: 'List your documents',
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['DRAFT', 'PENDING', 'SIGNED', 'EXPIRED'],
              },
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20 },
            },
          ],
          responses: {
            '200': {
              description: 'Document list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      documents: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Document' },
                      },
                      total: { type: 'integer' },
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/documents/{id}': {
        get: {
          tags: ['Documents'],
          summary: 'Get document details',
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Document details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Document' },
                },
              },
            },
            '404': { description: 'Document not found' },
          },
        },
        delete: {
          tags: ['Documents'],
          summary: 'Delete a document',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': { description: 'Document deleted' },
            '404': { description: 'Document not found' },
          },
        },
      },
      '/documents/{id}/download': {
        get: {
          tags: ['Documents'],
          summary: 'Get a pre-signed download URL',
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Pre-signed URL',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { url: { type: 'string', format: 'uri' } },
                  },
                },
              },
            },
          },
        },
      },
      '/documents/{id}/verify': {
        get: {
          tags: ['Documents'],
          summary: 'Verify document hash integrity',
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Verification result',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VerificationResult',
                  },
                },
              },
            },
          },
        },
      },
      '/documents/{id}/anchor': {
        post: {
          tags: ['Documents'],
          summary: 'Anchor document hash to blockchain',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Anchoring result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      txHash: { type: 'string' },
                      network: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/documents/{id}/proof': {
        post: {
          tags: ['Documents'],
          summary: 'Generate cryptographic proof bundle',
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Proof bundle',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ProofBundle' },
                },
              },
            },
          },
        },
      },
      '/documents/{id}/send': {
        post: {
          tags: ['Signatures'],
          summary: 'Send document for signing',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['signers'],
                  properties: {
                    signers: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['email', 'name'],
                        properties: {
                          email: { type: 'string', format: 'email' },
                          name: { type: 'string' },
                          order: { type: 'integer' },
                        },
                      },
                    },
                    message: { type: 'string' },
                    expiresInDays: { type: 'integer', default: 7 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Signatures created and emails sent',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      signatures: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Signature' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/documents/{id}/signatures': {
        get: {
          tags: ['Signatures'],
          summary: 'List signatures for a document',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Signature list',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Signature' },
                  },
                },
              },
            },
          },
        },
      },

      // ─── Signing (public) ────────────────────────
      '/sign/{token}': {
        get: {
          tags: ['Signing'],
          summary: 'Get signing context for a token',
          parameters: [
            {
              name: 'token',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Signing context',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      signatureId: { type: 'string', format: 'uuid' },
                      signerEmail: { type: 'string' },
                      signerName: { type: 'string' },
                      document: { $ref: '#/components/schemas/Document' },
                    },
                  },
                },
              },
            },
            '404': { description: 'Token not found' },
            '410': { description: 'Token expired' },
          },
        },
        post: {
          tags: ['Signing'],
          summary: 'Submit a signature',
          parameters: [
            {
              name: 'token',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['signatureData', 'signatureType'],
                  properties: {
                    signatureData: {
                      type: 'string',
                      description: 'Base64-encoded signature image',
                    },
                    signatureType: {
                      type: 'string',
                      enum: ['drawn', 'typed', 'uploaded'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Signature submitted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      signed: { type: 'boolean' },
                      documentCompleted: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/sign/{token}/decline': {
        post: {
          tags: ['Signing'],
          summary: 'Decline to sign',
          parameters: [
            {
              name: 'token',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Signature declined' },
          },
        },
      },

      // ─── Webhooks ────────────────────────────────
      '/webhooks': {
        post: {
          tags: ['Webhooks'],
          summary: 'Create a webhook',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'events'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    events: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'document.sent',
                          'document.viewed',
                          'document.signed',
                          'document.completed',
                          'document.expired',
                          'document.declined',
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Webhook created (secret shown once)',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Webhook' },
                },
              },
            },
          },
        },
        get: {
          tags: ['Webhooks'],
          summary: 'List your webhooks',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Webhook list',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Webhook' },
                  },
                },
              },
            },
          },
        },
      },
      '/webhooks/{id}': {
        patch: {
          tags: ['Webhooks'],
          summary: 'Update a webhook',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    events: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Webhook updated' },
          },
        },
        delete: {
          tags: ['Webhooks'],
          summary: 'Delete a webhook',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': { description: 'Webhook deleted' },
          },
        },
      },
      '/webhooks/{id}/deliveries': {
        get: {
          tags: ['Webhooks'],
          summary: 'View delivery history',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
            },
          ],
          responses: {
            '200': {
              description: 'Delivery history',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      deliveries: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/WebhookDelivery',
                        },
                      },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ─── Organizations ────────────────────────────
      '/organizations': {
        get: {
          tags: ['Organizations'],
          summary: 'List my organizations',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Organization list' } },
        },
        post: {
          tags: ['Organizations'],
          summary: 'Create a new organization',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'slug'],
                  properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Organization created' },
            '409': { description: 'Slug already taken' },
          },
        },
      },
      '/organizations/{id}/members': {
        get: {
          tags: ['Organizations'],
          summary: 'List organization members',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { '200': { description: 'Member list' } },
        },
      },
      '/organizations/{id}/invitations': {
        post: {
          tags: ['Organizations'],
          summary: 'Invite a member to the organization',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'role'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['ADMIN', 'MEMBER', 'VIEWER'] },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Invitation sent' },
            '409': { description: 'User already a member' },
          },
        },
      },
      '/organizations/switch': {
        post: {
          tags: ['Organizations'],
          summary: 'Switch active organization context',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['organizationId'],
                  properties: {
                    organizationId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'New access token with org context' } },
        },
      },

      // ─── Account (GDPR) ────────────────────────────
      '/account/export': {
        get: {
          tags: ['Account'],
          summary: 'Export all personal data (GDPR)',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'JSON file with all personal data' } },
        },
      },
      '/account/delete': {
        post: {
          tags: ['Account'],
          summary: 'Delete account and anonymize data (GDPR)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['confirm'],
                  properties: {
                    confirm: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Account deleted and data anonymized' },
            '400': { description: 'Confirmation required' },
          },
        },
      },

      // ─── Dashboard ───────────────────────────────
      '/dashboard/stats': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get dashboard statistics',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Dashboard stats',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DashboardStats' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [], // We define everything inline above
};

export const swaggerSpec = swaggerJsdoc(options);
