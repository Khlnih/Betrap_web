const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function migrate() {
    console.log('Connecting to database...');
    await db.connectDB();
    
    console.log('Creating TrackingLinks table...');
    await db.pool.query(`
        CREATE TABLE IF NOT EXISTS TrackingLinks (
            Id          VARCHAR(50) PRIMARY KEY,
            AppSource   VARCHAR(100) NOT NULL,
            UrlCode     VARCHAR(100) NOT NULL UNIQUE,
            TargetUrl   VARCHAR(500) NOT NULL,
            CreatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('Creating TrackingEvents table...');
    await db.pool.query(`
        CREATE TABLE IF NOT EXISTS TrackingEvents (
            Id          VARCHAR(50) PRIMARY KEY,
            LinkId      VARCHAR(50) NOT NULL REFERENCES TrackingLinks(Id) ON DELETE CASCADE,
            VisitorId   VARCHAR(100) NOT NULL,
            UserAgent   TEXT,
            CreatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('✅ Tracking tables created successfully.');
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
