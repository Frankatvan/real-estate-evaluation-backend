import request from 'supertest';
import { Express } from 'express';
import { testPool } from '../setup';
import bcrypt from 'bcrypt';

describe('Projects API Integration Tests', () => {
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
    await testPool.query('DELETE FROM projects WHERE user_id = $1', [testUserId]);
    await testPool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project successfully', async () => {
      const newProject = {
        name: 'New Test Project',
        location: 'New Location',
        total_area: 15000,
        project_type: 'commercial',
        description: 'A new test project'
      };

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', newProject.name);
      expect(response.body).toHaveProperty('location', newProject.location);
      expect(response.body).toHaveProperty('total_area', newProject.total_area);
      expect(response.body).toHaveProperty('project_type', newProject.project_type);
    });

    it('should validate required fields', async () => {
      const incompleteProject = {
        name: 'Incomplete Project'
      };

      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteProject)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should not create project without authentication', async () => {
      const newProject = {
        name: 'Unauthorized Project',
        location: 'Test Location',
        total_area: 10000,
        project_type: 'residential'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .send(newProject)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should get all projects for authenticated user', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should support pagination', async () => {
      // Create multiple projects
      for (let i = 0; i < 15; i++) {
        await testPool.query(
          `INSERT INTO projects (user_id, name, location, total_area, project_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [testUserId, `Project ${i}`, 'Location', 10000, 'residential']
        );
      }

      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/v1/projects?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should get a specific project by id', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testProjectId);
      expect(response.body).toHaveProperty('name', 'Test Project');
      expect(response.body).toHaveProperty('location', 'Test Location');
    });

    it('should not get project that does not exist', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/v1/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should not get project belonging to another user', async () => {
      // Create another user and project
      const otherHashedPassword = await bcrypt.hash('password123', 10);
      const otherUserResult = await testPool.query(
        `INSERT INTO users (username, email, password, company_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['other-user', 'other@example.com', otherHashedPassword, 'Other Company']
      );

      const otherProjectResult = await testPool.query(
        `INSERT INTO projects (user_id, name, location, total_area, project_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [otherUserResult.rows[0].id, 'Other Project', 'Other Location', 5000, 'commercial']
      );

      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .get(`/api/v1/projects/${otherProjectResult.rows[0].id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should update project successfully', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const updates = {
        name: 'Updated Project Name',
        total_area: 20000
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('name', updates.name);
      expect(response.body).toHaveProperty('total_area', updates.total_area);
    });

    it('should not update project without authentication', async () => {
      const updates = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .send(updates)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete project successfully', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });
      authToken = loginResponse.body.token;

      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify project is deleted
      const checkResponse = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkResponse.status).toBe(404);
    });

    it('should not delete project without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
