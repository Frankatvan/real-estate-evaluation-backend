import pool from '../config/database';

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', error);
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}
