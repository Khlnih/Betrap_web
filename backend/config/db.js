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
        await pool.query(`ALTER TABLE Services ADD COLUMN IF NOT EXISTS Gallery VARCHAR(5000)`);
        await pool.query(`ALTER TABLE Reviews ADD COLUMN IF NOT EXISTS ProviderReply TEXT`);
        await pool.query(`ALTER TABLE Reviews ADD COLUMN IF NOT EXISTS RepliedAt TIMESTAMP`);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS BlogPosts (
                Id          VARCHAR(50) PRIMARY KEY,
                AuthorId    VARCHAR(50) REFERENCES Users(Id),
                Title       VARCHAR(300) NOT NULL,
                Slug        VARCHAR(300) UNIQUE,
                CoverImage  VARCHAR(500),
                Published   BOOLEAN DEFAULT false,
                PublishedAt TIMESTAMP,
                CreatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UpdatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS BlogBlocks (
                Id        VARCHAR(50) PRIMARY KEY,
                PostId    VARCHAR(50) NOT NULL REFERENCES BlogPosts(Id) ON DELETE CASCADE,
                Type      VARCHAR(50) NOT NULL,
                Content   TEXT,
                Position  INT NOT NULL DEFAULT 0,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS TrapAodaiLinks (
                Id        VARCHAR(50) PRIMARY KEY,
                TrapId    VARCHAR(50) NOT NULL REFERENCES Services(Id) ON DELETE CASCADE,
                AodaiId   VARCHAR(50) NOT NULL REFERENCES Services(Id) ON DELETE CASCADE,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(TrapId, AodaiId)
            )
        `);
        
        // Leads = yêu cầu tư vấn công khai từ trang chủ (không cần đăng nhập, không gắn 1 dịch vụ cụ thể)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Leads (
                Id             VARCHAR(50) PRIMARY KEY,
                Name           VARCHAR(150) NOT NULL,
                Phone          VARCHAR(30)  NOT NULL,
                Zalo           VARCHAR(30),
                Email          VARCHAR(150),
                Services       TEXT,            -- JSON array các dịch vụ quan tâm
                TrayCount      VARCHAR(20),     -- '5' | '7' | '9' | 'tu-van-goi-y'
                Trays          TEXT,            -- JSON array các tráp đã chọn
                TrayNote       TEXT,
                Style          VARCHAR(50),
                Region         VARCHAR(30),
                WeddingDate    VARCHAR(30),     -- ngày ăn hỏi hoặc 'undecided'
                Location       VARCHAR(300),
                Budget         VARCHAR(50),
                ContactTime    VARCHAR(30),
                ContactChannel VARCHAR(30),
                RequestType    VARCHAR(30) DEFAULT 'day-du', -- 'day-du' | 'goi-nhanh'
                Status         VARCHAR(20) DEFAULT 'new',    -- new | contacted | quoted | won | lost
                CreatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database columns and tables initialized.');
    } catch (e) {
        console.error('❌ Error initializing database columns:', e.message);
    }
};

module.exports = { pool, query, connectDB, initDB };
