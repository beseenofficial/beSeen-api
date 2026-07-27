import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../src/app';
import openApiDocument from '../../src/openapi/document';

describe('OpenAPI contract', () => {
  it('is a valid OpenAPI 3.1 document covering every current public route', async () => {
    await expect(SwaggerParser.validate(openApiDocument as never)).resolves.toBeDefined();

    expect(Object.keys(openApiDocument.paths)).toEqual(
      expect.arrayContaining([
        '/v1/health',
        '/v1/auth/config',
        '/v1/auth/registration/challenge',
        '/v1/auth/registration/verify',
        '/v1/auth/register',
        '/v1/auth/login/challenge',
        '/v1/auth/login',
        '/v1/auth/refresh',
        '/v1/auth/logout',
        '/v1/users/me',
        '/v1/users/username/availability',
        '/v1/users/{username}',
      ]),
    );
    expect(openApiDocument.paths['/v1/auth/registration/verify'].post.deprecated).toBe(true);
    expect(openApiDocument.components.schemas.PublicUser.properties).not.toHaveProperty(
      'walletAddress',
    );
    expect(openApiDocument.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('serves the machine-readable contract and interactive Swagger UI', async () => {
    const jsonResponse = await request(app).get('/v1/openapi.json');
    const docsRedirect = await request(app).get('/v1/docs');
    const docsResponse = await request(app).get('/v1/docs/');

    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.headers['cache-control']).toBe('no-store');
    expect(jsonResponse.body.openapi).toBe('3.1.0');
    expect(jsonResponse.body.paths['/v1/auth/register']).toBeDefined();
    expect(docsRedirect.status).toBe(301);
    expect(docsRedirect.headers.location).toBe('/v1/docs/');
    expect(docsResponse.status).toBe(200);
    expect(docsResponse.text).toContain('id="swagger-ui"');
    expect(docsResponse.text).toContain('BeSeen API Docs');
  });
});
