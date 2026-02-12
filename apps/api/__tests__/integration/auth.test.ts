import request from 'supertest';
import app from '../../src/app.js';

// NOTE: These integration tests require a running database.
// In CI, use docker-compose to spin up PostgreSQL first.
// For local dev, ensure DATABASE_URL points to a test database.

describe('Auth Endpoints', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'SecureP@ss123!',
    name: 'Test User',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'notanemail', password: 'SecureP@ss123!', name: 'Test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: '123', name: 'Test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'WrongP@ss123!' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should reject refresh without cookie', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Protected Routes', () => {
    it('should reject requests without auth token', async () => {
      await request(app).get('/api/v1/documents').expect(401);
    });

    it('should reject requests with invalid auth token', async () => {
      await request(app)
        .get('/api/v1/documents')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });
});
