import request from 'supertest';
import express, { Express } from 'express';
import { testPool } from '../setup';

describe('Health Check Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Import the server setup
    require('../../server');
  });

  afterAll(async () => {
    // Cleanup
    await testPool.end();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
      });
    });
  });
});
