import { Pool } from 'pg';

let testPool: Pool;

beforeAll(async () => {
  // Create test database connection
  testPool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'real_estate_eval_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  try {
    await testPool.query('SELECT NOW()');
    console.log('✅ Test database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    console.log('⚠️  Tests will run but may fail due to database connection issues');
    // Don't throw error, allow tests to run
  }
});

afterAll(async () => {
  if (testPool) {
    await testPool.end();
    console.log('✅ Test database connection closed');
  }
});

beforeEach(async () => {
  // Clean up test data before each test
  // Only clean if database is connected
  try {
    await testPool.query('SELECT NOW()');

    const tables = [
      'calculation_results',
      'payment_data',
      'plan_data',
      'calculation_parameters',
      'tenants_data',
      'units_data',
      'construction_data',
      'sales_data',
      'versions',
      'projects',
      'users'
    ];

    // Clean test data (delete records created by tests)
    for (const table of tables) {
      try {
        await testPool.query(`DELETE FROM ${table} WHERE creator_id IN (SELECT id FROM users WHERE username LIKE 'test-%')`);
      } catch (error) {
        // Table might not exist, continue
        console.warn(`Warning: Could not clean table ${table}`);
      }
    }

    // Clean test users
    try {
      await testPool.query(`DELETE FROM users WHERE username LIKE 'test-%' OR email LIKE 'test-%'`);
    } catch (error) {
      console.warn('Warning: Could not clean test users');
    }
  } catch (error) {
    // Database not connected, skip cleanup
    console.warn('Database not connected, skipping test cleanup');
  }
});

export { testPool };
