import request from 'supertest';
import { Express } from 'express';
import { testPool } from '../setup';
import bcrypt from 'bcrypt';

describe('Calculations API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
  });

  beforeEach(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash('testPassword123', 10);
    const userResult = await testPool.query(
      `INSERT INTO users (username, email, password, company_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['test-user', 'test@example.com', hashedPassword, 'Test Company']
    );
    testUserId = userResult.rows[0].id;

    // Create a test project
    const projectResult = await testPool.query(
      `INSERT INTO projects (user_id, name, location, total_area, project_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [testUserId, 'Test Project', 'Test Location', 10000, 'residential']
    );
    testProjectId = projectResult.rows[0].id;
  });

  afterEach(async () => {
    await testPool.query('DELETE FROM calculation_results WHERE project_id = $1', [testProjectId]);
    await testPool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    await testPool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('POST /api/v1/calculations/execute', () => {
    it('should execute calculation successfully', async () => {
      // Prepare calculation data
      await testPool.query(
        `INSERT INTO sales_data (project_id, total_units, average_price, total_revenue)
         VALUES ($1, $2, $3, $4)`,
        [testProjectId, 100, 50000, 5000000]
      );

      await testPool.query(
        `INSERT INTO construction_data (project_id, land_cost, construction_cost, infrastructure_cost, other_costs)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectId, 1000000, 2000000, 500000, 300000]
      );

      const calculationData = {
        project_id: testProjectId,
        discount_rate: 0.08,
        calculation_period: 5
      };

      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .post('/api/v1/calculations/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(calculationData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('npv');
      expect(response.body).toHaveProperty('irr');
      expect(response.body).toHaveProperty('roi');
      expect(response.body).toHaveProperty('payback_period');
    });

    it('should validate required calculation parameters', async () => {
      const incompleteData = {
        project_id: testProjectId
        // missing discount_rate and calculation_period
      };

      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .post('/api/v1/calculations/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should not calculate for non-existent project', async () => {
      const calculationData = {
        project_id: 'non-existent-id',
        discount_rate: 0.08,
        calculation_period: 5
      };

      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .post('/api/v1/calculations/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(calculationData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/calculations/results/:projectId', () => {
    it('should get calculation results for project', async () => {
      // Insert calculation result
      await testPool.query(
        `INSERT INTO calculation_results (project_id, npv, irr, roi, payback_period)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectId, 1000000, 0.15, 0.25, 3.5]
      );

      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .get(`/api/v1/calculations/results/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('npv');
      expect(response.body[0]).toHaveProperty('irr');
      expect(response.body[0]).toHaveProperty('roi');
    });

    it('should return empty array for project with no calculations', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .get(`/api/v1/calculations/results/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/v1/calculations/compare', () => {
    it('should compare multiple calculation scenarios', async () => {
      // Create multiple calculation results
      await testPool.query(
        `INSERT INTO calculation_results (project_id, npv, irr, roi, payback_period, scenario_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testProjectId, 1000000, 0.15, 0.25, 3.5, 'Scenario 1']
      );

      await testPool.query(
        `INSERT INTO calculation_results (project_id, npv, irr, roi, payback_period, scenario_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testProjectId, 1200000, 0.18, 0.28, 3.2, 'Scenario 2']
      );

      const comparisonRequest = {
        project_id: testProjectId,
        result_ids: [] // Will be populated after insert
      };

      const results = await testPool.query(
        `SELECT id FROM calculation_results WHERE project_id = $1`,
        [testProjectId]
      );
      comparisonRequest.result_ids = results.rows.map(r => r.id);

      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .post('/api/v1/calculations/compare')
        .set('Authorization', `Bearer ${authToken}`)
        .send(comparisonRequest)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('scenario_name');
      expect(response.body[0]).toHaveProperty('npv');
    });
  });
});
