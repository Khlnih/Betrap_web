const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

const connectDB = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Connected to Vercel Postgres');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
};

/**
 * Execute a query with parameters.
 * Automatically lowercases keys in the returned rows for backward compatibility
 * with the previous fake-MSSQL implementation which used Proxies.
 */
const query = async (text, params) => {
    try {
        const res = await pool.query(text, params);
        
        // Return rows with lowercased keys wrapper to avoid breaking existing frontend expectations
        const rows = res.rows.map(row => {
            const newRow = {};
            for (let key in row) {
                newRow[key] = row[key];
                if (key.toLowerCase() !== key) {
                    newRow[key.toLowerCase()] = row[key];
                }
            }
            return newRow;
        });

        return { recordset: rows, rowCount: res.rowCount };
    } catch (e) {
        console.error("SQL Error:", text, params, e.message);
        throw e;
    }
};

// Also expose a function to check and initialize default columns
const initDB = async () => {
    try {
        await pool.query(`ALTER TABLE Services ADD COLUMN IF NOT EXISTS Packages TEXT`);
        await pool.query(`ALTER TABLE Services ADD COLUMN IF NOT EXISTS SubCategory VARCHAR(100)`);
        console.log('✅ Database columns initialized.');
    } catch (e) {
        console.error('❌ Error initializing database columns:', e.message);
    }
};

module.exports = { pool, query, connectDB, initDB };
