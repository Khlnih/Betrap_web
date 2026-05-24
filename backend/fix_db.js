require('dotenv').config();
const sql = require('mssql');
const dbConfig = {
    user:     process.env.DB_USER     || 'sa',
    password: process.env.DB_PASSWORD || 'your_password',
    server:   process.env.DB_SERVER   || 'localhost',
    database: process.env.DB_NAME     || 'BeTrapDB',
    options:  { encrypt: false, trustServerCertificate: true }
};

async function fix() {
    try {
        await sql.connect(dbConfig);
        await sql.query`UPDATE Services SET Location = N'Hà Nội'`;
        console.log("✅ Updated all services Location to Hà Nội in LIVE Database!");
    } catch(e) {
        console.error(e);
    } finally {
        sql.close();
    }
}
fix();
