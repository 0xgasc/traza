import request from 'supertest';
import app from '../../src/app.js';

describe('Health Check', () => {
  it('GET /health should return 200 with status ok', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'traza-api',
      version: '0.1.0',
    });
    expect(response.body.uptime).toBeDefined();
    expect(response.body.timestamp).toBeDefined();
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/api/v1/nonexistent').expect(404);

    expect(response.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });
});

describe('API Documentation', () => {
  it('GET /api/docs.json should return OpenAPI spec', async () => {
    const response = await request(app).get('/api/docs.json').expect(200);

    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.info.title).toBe('Traza API');
    expect(response.body.paths).toBeDefined();
  });
});
