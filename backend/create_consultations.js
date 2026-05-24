require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user:     process.env.DB_USER     || 'sa',
    password: process.env.DB_PASSWORD || 'your_password',
    server:   process.env.DB_SERVER   || 'localhost',
    database: process.env.DB_NAME     || 'BeTrapDB',
    options:  { encrypt: false, trustServerCertificate: true }
};

async function createTable() {
    try {
        await sql.connect(dbConfig);
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Consultations' AND xtype='U')
            BEGIN
                CREATE TABLE Consultations (
                    Id VARCHAR(50) PRIMARY KEY,
                    CustomerId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
                    ProviderId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
                    ServiceId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Services(Id),
                    ServiceName NVARCHAR(200),
                    Date DATE NOT NULL,
                    Time TIME NOT NULL,
                    Address NVARCHAR(500) NOT NULL,
                    Note NVARCHAR(1000),
                    Status VARCHAR(20) DEFAULT 'pending',
                    ProviderNote NVARCHAR(1000) NULL,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table Consultations created successfully.'
            END
            ELSE
            BEGIN
                PRINT 'Table Consultations already exists.'
            END
        `);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
createTable();
