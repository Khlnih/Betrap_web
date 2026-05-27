const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../backend/.env' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function addAdmin() {
    try {
        const hash = await bcrypt.hash('123456', 10);
        await pool.query(`
            INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Avatar, Verified)
            VALUES ('U_ADMIN', 'admin@betrap.vn', $1, 'Quản Trị Viên', 'admin', 'AD', true)
            ON CONFLICT (Id) DO UPDATE SET PasswordHash = $1
        `, [hash]);
        console.log('Admin account created successfully: admin@betrap.vn / 123456');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}

addAdmin();
