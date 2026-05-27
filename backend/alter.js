const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query(`ALTER TABLE Services ADD COLUMN Gallery VARCHAR(5000);`);
    console.log('Added Gallery column successfully.');
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
      console.log('Column Gallery already exists.');
    } else {
      console.error(err);
    }
  } finally {
    pool.end();
  }
}
run();
