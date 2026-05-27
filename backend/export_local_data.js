const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'sa',
    password: 'your_password',
    server: 'localhost',
    database: 'BeTrapDB',
    options: { encrypt: false, trustServerCertificate: true }
};

async function exportData() {
    try {
        const pool = await sql.connect(config);
        let out = "-- Backup Local Data\n";
        
        const tables = ['Users', 'CustomerProfiles', 'ProviderProfiles', 'Services', 'Favorites', 'Bookings', 'Consultations', 'Transactions'];
        
        for (const table of tables) {
            try {
                const result = await pool.request().query(`SELECT * FROM ${table}`);
                if (result.recordset.length > 0) {
                    out += `\n-- Table: ${table}\n`;
                    // out += `DELETE FROM ${table};\nGO\n`;
                    for (const row of result.recordset) {
                        const cols = [];
                        const vals = [];
                        for (const key in row) {
                            cols.push(key);
                            let val = row[key];
                            if (val === null) vals.push('NULL');
                            else if (typeof val === 'string') vals.push(`N'${val.replace(/'/g, "''")}'`);
                            else if (val instanceof Date) vals.push(`'${val.toISOString()}'`);
                            else if (typeof val === 'boolean') vals.push(val ? 1 : 0);
                            else vals.push(val);
                        }
                        out += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
                    }
                    out += "GO\n";
                }
            } catch (e) {
                console.log(`Table ${table} skipped or error:`, e.message);
            }
        }
        
        fs.writeFileSync('F:/Betrap/backend/backup_data.sql', out);
        console.log("✅ Backup saved to F:/Betrap/backend/backup_data.sql");
        sql.close();
    } catch (err) {
        console.error(err);
    }
}

exportData();
