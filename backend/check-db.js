require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'your_password',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'BeTrapDB',
    options: { encrypt: false, trustServerCertificate: true }
};

async function check() {
    try {
        await sql.connect(dbConfig);
        console.log('✅ DB Connected successfully');

        // Check CancelReason column
        const r = await sql.query`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Transactions' AND COLUMN_NAME='CancelReason'`;
        if (r.recordset.length) {
            console.log('✅ CancelReason column EXISTS in Transactions table');
        } else {
            console.log('❌ CancelReason column MISSING - need to run: ALTER TABLE Transactions ADD CancelReason NVARCHAR(500) NULL;');
            // Auto-add if missing
            await sql.query`ALTER TABLE Transactions ADD CancelReason NVARCHAR(500) NULL`;
            console.log('✅ CancelReason column ADDED automatically!');
        }

        // List all Transactions columns
        const cols = await sql.query`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Transactions' ORDER BY ORDINAL_POSITION`;
        console.log('\n📋 Transactions table columns:');
        cols.recordset.forEach(c => console.log(`   - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

        // Count rows
        const cnt = await sql.query`SELECT COUNT(*) as Total FROM Transactions`;
        console.log(`\n📊 Total transactions: ${cnt.recordset[0].Total}`);

        // Count users
        const users = await sql.query`SELECT Role, COUNT(*) as Cnt FROM Users GROUP BY Role`;
        console.log('👥 Users by role:');
        users.recordset.forEach(u => console.log(`   - ${u.Role}: ${u.Cnt}`));

        // Count services
        const svcs = await sql.query`SELECT COUNT(*) as Total FROM Services WHERE Active=1`;
        console.log(`🏪 Active services: ${svcs.recordset[0].Total}`);

        await sql.close();
        console.log('\n✅ All checks PASSED');
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

check();
