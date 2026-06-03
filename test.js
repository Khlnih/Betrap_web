const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        const res = await pool.query(`INSERT INTO BlogBlocks (Id, PostId, Type, Content, Position) VALUES ('TEST1', 'POST_test', 'heading', '{"text":""}', 0) RETURNING *`);
        console.log("Success:", res.rows);
    } catch(e) {
        console.error("Full Error Object:", e);
    }
    pool.end();
}
test();
