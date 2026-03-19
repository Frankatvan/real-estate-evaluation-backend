import pool from './database';

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully!');
    const result = await client.query('SELECT NOW()');
    console.log('Current time:', result.rows[0]);
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
