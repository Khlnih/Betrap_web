require('dotenv').config();
const db = require('./config/db');

async function migrate() {
    try {
        console.log('Connecting to DB and adding PriceMax column...');
        await db.query('ALTER TABLE Services ADD COLUMN IF NOT EXISTS PriceMax DECIMAL(18,0);');
        console.log('✅ Added PriceMax column successfully!');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('✅ PriceMax column already exists. Skipping.');
        } else {
            console.error('❌ Migration failed:', err.message);
        }
    } finally {
        process.exit(0);
    }
}

migrate();
