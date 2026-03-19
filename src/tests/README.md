# Backend Integration Tests

This directory contains integration tests for the Real Estate Evaluation Platform backend API.

## Test Structure

```
src/tests/
├── setup.ts                 # Test configuration and database setup
├── helpers/
│   └── testHelpers.ts      # Utility functions for testing
└── integration/
    ├── health.test.ts      # Health check endpoint tests
    ├── users.test.ts       # User authentication and management tests
    ├── projects.test.ts    # Project CRUD operations tests
    └── calculations.test.ts # Calculation engine tests
```

## Prerequisites

1. **Test Database**: Set up a test PostgreSQL database

```bash
createdb real_estate_eval_test
```

2. **Environment Variables**: Create a `.env.test` file in the backend root:

```env
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=real_estate_eval_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=your_password
JWT_SECRET=test-secret-key
```

3. **Run Migrations**: Apply database migrations to the test database:

```bash
psql -U postgres -d real_estate_eval_test -f database/migrations/*.sql
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Integration Tests Only

```bash
npm run test:integration
```

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage reports will be generated in the `coverage/` directory.

## Test Helpers

The `TestHelpers` class provides utility functions for common test operations:

```typescript
import TestHelpers from './helpers/testHelpers';

const helpers = new TestHelpers(pool);

// Create a test user
const user = await helpers.createTestUser({
  username: 'customuser',
  email: 'custom@example.com'
});

// Create a test project
const project = await helpers.createTestProject(user.id);

// Generate auth token
const token = await helpers.generateAuthToken(user.id);

// Cleanup test data
await helpers.cleanupTestData(user.id);
```

## Writing New Tests

1. Create a new test file in `src/tests/integration/`
2. Import necessary dependencies:

```typescript
import request from 'supertest';
import { Express } from 'express';
import { testPool } from '../setup';
import TestHelpers from '../helpers/testHelpers';
```

3. Use the standard test structure:

```typescript
describe('Feature Name', () => {
  let app: Express;
  let helpers: TestHelpers;
  let authToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    helpers = new TestHelpers(testPool);
  });

  beforeEach(async () => {
    // Setup test data
    const user = await helpers.createTestUser();
    authToken = await helpers.generateAuthToken(user.id);
  });

  afterEach(async () => {
    // Cleanup test data
    await helpers.cleanupAllTestData();
  });

  it('should do something', async () => {
    const response = await request(app)
      .post('/api/v1/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ data: 'test' })
      .expect(200);

    expect(response.body).toHaveProperty('expectedField');
  });
});
```

## Test Data Management

- All test data is automatically cleaned up after each test
- Test users have IDs starting with `test-`
- Use the `cleanupTestData()` method to clean up specific user data
- Use `cleanupAllTestData()` to clean up all test data

## CI/CD Integration

Tests are configured to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    npm run test:coverage
  env:
    TEST_DB_HOST: localhost
    TEST_DB_NAME: real_estate_eval_test
    TEST_DB_USER: postgres
    TEST_DB_PASSWORD: postgres
```

## Troubleshooting

### Database Connection Errors

Ensure PostgreSQL is running and the test database exists:

```bash
# Check PostgreSQL status
pg_ctl status

# Create test database if needed
createdb real_estate_eval_test
```

### Test Timeout Issues

Increase test timeout in `jest.config.js` if needed:

```javascript
testTimeout: 30000 // 30 seconds
```

### Port Conflicts

Ensure the test server uses a different port from development:

```env
PORT=3001 # Development
TEST_PORT=3002 # Tests
```
