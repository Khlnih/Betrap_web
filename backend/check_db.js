require('dotenv').config();
const sql = require('mssql');
const dbConfig = {
    user:     process.env.DB_USER     || 'sa',
    password: process.env.DB_PASSWORD || 'your_password',
    server:   process.env.DB_SERVER   || 'localhost',
    database: process.env.DB_NAME     || 'BeTrapDB',
    options:  { encrypt: false, trustServerCertificate: true }
};

async function check() {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT Id, Location FROM Services`;
        console.log("Services Location:");
        console.table(result.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        sql.close();
    }
}
check();
