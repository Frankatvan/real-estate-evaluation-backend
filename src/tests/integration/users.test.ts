import request from 'supertest';
import { Express } from 'express';
import { testPool } from '../setup';
import bcrypt from 'bcrypt';

describe('Users API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testUserId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
  });

  beforeEach(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash('testPassword123', 10);
    const result = await testPool.query(
      `INSERT INTO users (username, email, password, company_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['test-user', 'test@example.com', hashedPassword, 'Test Company']
    );
    testUserId = result.rows[0].id;
  });

  afterEach(async () => {
    await testPool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  });

  describe('POST /api/v1/users/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        company_name: 'New Company'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', newUser.username);
      expect(response.body).toHaveProperty('email', newUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should not register user with existing email', async () => {
      const existingUser = {
        username: 'duplicate',
        email: 'test@example.com',
        password: 'password123',
        company_name: 'Duplicate Company'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(existingUser)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const incompleteUser = {
        username: 'incomplete'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(incompleteUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/users/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'testPassword123'
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      authToken = response.body.token;
    });

    it('should not login with invalid credentials', async () => {
      const invalidCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should not login non-existent user', async () => {
      const nonExistentUser = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(nonExistentUser)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/users/profile', () => {
    it('should get user profile with valid token', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      authToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', 'test-user');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalidtoken123')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('should update user profile with valid token', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      authToken = loginResponse.body.token;

      const updates = {
        company_name: 'Updated Company Name'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('company_name', updates.company_name);
    });

    it('should not update email to existing one', async () => {
      // Create another user
      await testPool.query(
        `INSERT INTO users (username, email, password, company_name)
         VALUES ($1, $2, $3, $4)`,
        ['otheruser', 'other@example.com', await bcrypt.hash('password123', 10), 'Other Company']
      );

      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      authToken = loginResponse.body.token;

      const updates = {
        email: 'other@example.com'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });
  });
});
