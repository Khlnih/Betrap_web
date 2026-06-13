const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const multer  = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'betrap_secret_key_2024';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';

// ΓöÇΓöÇ Cß║Ñu h├¼nh Cloudinary ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'betrap',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const upload = multer({ 
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ΓöÇΓöÇ Middleware ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.use(cors({ origin: '*' }));
app.use(express.json());

// Phß╗Ñc vß╗Ñ c├íc file t─⌐nh (Frontend) tß╗½ th╞░ mß╗Ñc gß╗æc
app.use(express.static(path.join(__dirname, '../')));

// ΓöÇΓöÇ Database ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    // Vercel Postgres requires SSL
    ssl: { rejectUnauthorized: false }
});

// Tß╗▒ ─æß╗Öng tß║ío cß╗Öt Packages nß║┐u ch╞░a c├│ khi khß╗ƒi ─æß╗Öng server
pool.query(`ALTER TABLE Services ADD COLUMN IF NOT EXISTS Packages TEXT`)
    .then(() => console.log('Successfully checked/added Packages column to Services.'))
    .catch(e => console.error('Error adding Packages column:', e.message));

// Tß╗▒ ─æß╗Öng tß║ío cß╗Öt SubCategory
pool.query(`ALTER TABLE Services ADD COLUMN IF NOT EXISTS SubCategory VARCHAR(100)`)
    .then(() => console.log('Successfully checked/added SubCategory column to Services.'))
    .catch(e => console.error('Error adding SubCategory column:', e.message));

const sql = {
    connect: async () => {}, // Mock for existing code
    query: async function(strings, ...values) {
        if (typeof strings === 'string') {
            let q = strings.replace(/GETDATE\(\)/g, 'CURRENT_TIMESTAMP');
            const res = await pool.query(q);
            const proxiedRows = res.rows.map(row => new Proxy(row, {
                get(target, prop) {
                    if (typeof prop === 'string') {
                        const lowerProp = prop.toLowerCase();
                        if (lowerProp in target) return target[lowerProp];
                    }
                    return Reflect.get(target, prop);
                }
            }));
            return { recordset: proxiedRows };
        }
        
        let text = '';
        for (let i = 0; i < strings.length; i++) {
            text += strings[i];
            if (i < values.length) {
                text += `$${i + 1}`;
            }
        }
        
        text = text.replace(/GETDATE\(\)/g, 'CURRENT_TIMESTAMP');
        text = text.replace(/ISNULL\(/g, 'COALESCE(');
        
        if (text.includes('OUTPUT INSERTED.')) {
            const outputMatch = text.match(/OUTPUT INSERTED\.([a-zA-Z0-9_]+)/);
            if (outputMatch) {
                const col = outputMatch[1];
                text = text.replace(/OUTPUT INSERTED\.[a-zA-Z0-9_]+\s+/g, '');
                text = text + ` RETURNING ${col}`;
            }
        }
        
        try {
            const res = await pool.query(text, values);
            const proxiedRows = res.rows.map(row => new Proxy(row, {
                get(target, prop) {
                    if (typeof prop === 'string') {
                        const lowerProp = prop.toLowerCase();
                        if (lowerProp in target) return target[lowerProp];
                    }
                    return Reflect.get(target, prop);
                }
            }));
            return { recordset: proxiedRows };
        } catch (e) {
            console.error("SQL Error:", text, values, e.message);
            throw e;
        }
    }
};

async function connectDB() {
    try   { await pool.query('SELECT 1'); console.log('Γ£à Connected to Vercel Postgres'); }
    catch (err) { console.error('Γ¥î Database connection failed:', err.message); }
}
connectDB();

// ΓöÇΓöÇ Setup Database Endpoint ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.get('/api/setup-db', async (req, res) => {
    try {
        const fs = require('fs');
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schema);
        res.send('Γ£à Database setup completed successfully!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Γ¥î Error setting up database: ' + err.message);
    }
});

app.get('/api/setup-admin', async (req, res) => {
    try {
        const hash = await bcrypt.hash('123456', 10);
        await sql.query`
            INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Avatar, Verified)
            VALUES ('U_ADMIN', 'admin@betrap.vn', ${hash}, 'Quß║ún Trß╗ï Vi├¬n', 'admin', 'AD', true)
        `;
        res.send('Γ£à Admin account created: admin@betrap.vn / 123456');
    } catch (err) {
        res.status(500).send('Γ¥î Error: ' + err.message);
    }
});

// ΓöÇΓöÇ Auth Middleware ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Ch╞░a ─æ─âng nhß║¡p.' });
    try {
        req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
        next();
    } catch { res.status(401).json({ error: 'Token kh├┤ng hß╗úp lß╗ç hoß║╖c ─æ├ú hß║┐t hß║ín.' }); }
}

async function providerOnly(req, res, next) {
    if (req.user.role !== 'provider') return res.status(403).json({ error: 'Chß╗ë nh├á cung cß║Ñp mß╗¢i c├│ quyß╗ün n├áy.' });
    const check = await sql.query`SELECT Verified FROM Users WHERE Id = ${req.user.userId}`;
    if (!check.recordset.length || !check.recordset[0].Verified) return res.status(403).json({ error: 'T├ái khoß║ún ch╞░a ─æ╞░ß╗úc duyß╗çt.' });
    next();
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chß╗ë Quß║ún trß╗ï vi├¬n mß╗¢i c├│ quyß╗ün n├áy.' });
    next();
}

// Helper
const uid = () => Math.random().toString(36).substr(2, 9);

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 1. SERVICES
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

// GET all services (with filters)
app.get('/api/services', async (req, res) => {
    try {
        const { category, subCategory, location, search, sort, maxPrice, all, page, limit } = req.query;
        // Build parameterized query to prevent SQL injection
        const params = [];
        let conditions = '1=1';
        if (!all) conditions += ` AND s.Active = true AND u.Verified = true`;
        if (category) { params.push(category); conditions += ` AND s.Category = $${params.length}`; }
        if (subCategory) { params.push(subCategory); conditions += ` AND s.SubCategory = $${params.length}`; }
        if (location) { params.push(`%${location.replace(/[%_]/g, '')}%`); conditions += ` AND s.Location ILIKE $${params.length}`; }
        if (search)   { params.push(`%${search.replace(/[%_]/g, '')}%`); conditions += ` AND (s.Name ILIKE $${params.length} OR s.Description ILIKE $${params.length})`; }
        if (maxPrice) { params.push(parseInt(maxPrice) || 0); conditions += ` AND s.Price <= $${params.length}`; }
        let orderBy = 'ORDER BY s.Rating DESC';
        if (sort === 'price_asc')  orderBy = 'ORDER BY s.Price ASC';
        else if (sort === 'price_desc') orderBy = 'ORDER BY s.Price DESC';

        let limitClause = '';
        if (page && limit) {
            const limitNum = parseInt(limit) || 6;
            const offset = (parseInt(page) - 1) * limitNum;
            limitClause = ` LIMIT ${limitNum} OFFSET ${offset}`;
        }

        const queryText = `SELECT s.*, u.Name AS ProviderName FROM Services s
                     LEFT JOIN Users u ON s.ProviderId = u.Id
                     WHERE ${conditions} ${orderBy}${limitClause}`;
        
        let total = 0;
        if (page && limit) {
            const countResult = await pool.query(`SELECT COUNT(*) as count FROM Services s LEFT JOIN Users u ON s.ProviderId = u.Id WHERE ${conditions}`, params);
            total = parseInt(countResult.rows[0].count);
        }

        const result = await pool.query(queryText, params);
        result.recordset = result.rows;
        const services = result.recordset.map(s => ({
            id: s.id, providerId: s.providerid, providerName: s.providername,
            category: s.category, subCategory: s.subcategory, name: s.name, description: s.description,
            price: s.price, unit: s.unit, image: s.image, location: s.location,
            active: s.active, rating: s.rating, reviewCount: s.reviewcount,
            tags: s.tags ? (typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags) : [],
            packages: s.packages ? (typeof s.packages === 'string' ? JSON.parse(s.packages) : s.packages) : null,
            gallery: s.gallery ? (typeof s.gallery === 'string' ? JSON.parse(s.gallery) : s.gallery) : [],
            createdAt: s.createdat
        }));
        
        if (page && limit) {
            res.json({ data: services, total, page: parseInt(page), limit: parseInt(limit) });
        } else {
            res.json(services);
        }
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET single service
app.get('/api/services/:id', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT s.*, u.Name AS ProviderName, u.Phone AS ProviderPhone,
                   pp.Bio, pp.Bank, pp.Location AS ProviderLocation
            FROM Services s
            LEFT JOIN Users u ON s.ProviderId = u.Id
            LEFT JOIN ProviderProfiles pp ON pp.UserId = u.Id
            WHERE s.Id = ${req.params.id}`;
        if (!result.recordset.length) return res.status(404).json({ error: 'Service not found' });
        const s = result.recordset[0];
        res.json({
            id: s.Id, providerId: s.ProviderId, providerName: s.ProviderName,
            providerPhone: s.ProviderPhone, providerBio: s.Bio,
            category: s.Category, subCategory: s.SubCategory, name: s.Name, description: s.Description,
            price: s.Price, unit: s.Unit, image: s.Image, location: s.Location,
            active: s.Active, rating: s.Rating, reviewCount: s.ReviewCount,
            tags: s.Tags ? (typeof s.Tags === 'string' ? JSON.parse(s.Tags) : s.Tags) : [],
            packages: s.Packages ? (typeof s.Packages === 'string' ? JSON.parse(s.Packages) : s.Packages) : null,
            gallery: s.Gallery ? (typeof s.Gallery === 'string' ? JSON.parse(s.Gallery) : s.Gallery) : [],
            createdAt: s.CreatedAt
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST create service (provider only)
app.post('/api/services', authMiddleware, providerOnly, async (req, res) => {
    const { category, subCategory, name, description, price, unit, image, location, tags, gallery, packages } = req.body;
    if (!category || !name || !price) return res.status(400).json({ error: 'Thiß║┐u th├┤ng tin dß╗ïch vß╗Ñ.' });
    try {
        const id = 'SVC_' + uid();
        const tagsStr = JSON.stringify(tags || []);
        const packagesStr = packages && packages.length ? JSON.stringify(packages) : null;
        const galleryStr = gallery && gallery.length ? JSON.stringify(gallery) : null;
        await sql.query`
            INSERT INTO Services (Id, ProviderId, Category, SubCategory, Name, Description, Price, Unit, Image, Location, Tags, Gallery, Packages)
            VALUES (${id}, ${req.user.userId}, ${category}, ${subCategory||null}, ${name}, ${description||null},
                    ${parseFloat(price)}, ${unit||'buß╗òi'}, ${image||null}, ${location||null}, ${tagsStr}, ${galleryStr}, ${packagesStr})`;
        res.json({ id, message: 'Tß║ío dß╗ïch vß╗Ñ th├ánh c├┤ng!' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT update service
app.put('/api/services/:id', authMiddleware, providerOnly, async (req, res) => {
    const { name, subCategory, description, price, unit, image, location, tags, gallery, active, packages } = req.body;
    try {
        const check = await sql.query`SELECT ProviderId FROM Services WHERE Id = ${req.params.id}`;
        if (!check.recordset.length) return res.status(404).json({ error: 'Service not found' });
        if (check.recordset[0].ProviderId !== req.user.userId) return res.status(403).json({ error: 'Kh├┤ng c├│ quyß╗ün.' });
        const tagsStr = tags ? JSON.stringify(tags) : null;
        const packagesStr = packages && packages.length ? JSON.stringify(packages) : null;
        const galleryStr = gallery && gallery.length ? JSON.stringify(gallery) : null;
        const isActive = active !== undefined ? active : true;
        await sql.query`
            UPDATE Services SET Name=${name}, SubCategory=${subCategory||null}, Description=${description||null},
            Price=${parseFloat(price)}, Unit=${unit||'buß╗òi'}, Image=${image||null},
            Location=${location||null}, Tags=${tagsStr}, Gallery=${galleryStr}, Packages=${packagesStr},
            Active=${isActive}, UpdatedAt=CURRENT_TIMESTAMP
            WHERE Id=${req.params.id}`;
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST upload image (l╞░u l├¬n Cloudinary)
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Kh├┤ng c├│ file ─æ╞░ß╗úc tß║úi l├¬n.' });
    res.json({ url: req.file.path });
});

// PATCH toggle service active (provider only) ΓÇö bß║¡t/tß║»t hiß╗ân thß╗ï dß╗ïch vß╗Ñ
app.patch('/api/services/:id/toggle', authMiddleware, providerOnly, async (req, res) => {
    try {
        const check = await sql.query`SELECT ProviderId, Active FROM Services WHERE Id = ${req.params.id}`;
        if (!check.recordset.length) return res.status(404).json({ error: 'Service not found' });
        if (check.recordset[0].ProviderId !== req.user.userId) return res.status(403).json({ error: 'Kh├┤ng c├│ quyß╗ün.' });
        const currentActive = check.recordset[0].Active;
        const newActive = currentActive ? false : true;
        await sql.query`UPDATE Services SET Active=${newActive}, UpdatedAt=GETDATE() WHERE Id=${req.params.id}`;
        res.json({ success: true, active: newActive === true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET provider's own services ΓÇö bao gß╗ôm cß║ú dß╗ïch vß╗Ñ ─æang ß║⌐n
app.get('/api/provider/services', authMiddleware, providerOnly, async (req, res) => {
    try {
        const result = await sql.query`
            SELECT s.*, u.Name AS ProviderName FROM Services s
            LEFT JOIN Users u ON s.ProviderId = u.Id
            WHERE s.ProviderId = ${req.user.userId}
            ORDER BY s.CreatedAt DESC`;
        const services = result.recordset.map(s => ({
            id: s.Id, providerId: s.ProviderId, providerName: s.ProviderName,
            category: s.Category, name: s.Name, description: s.Description,
            price: s.Price, unit: s.Unit, image: s.Image, location: s.Location,
            active: s.Active === 1 || s.Active === true,
            rating: s.Rating, reviewCount: s.ReviewCount,
            tags: s.Tags ? (typeof s.Tags === 'string' ? JSON.parse(s.Tags) : s.Tags) : [],
            packages: s.Packages ? (typeof s.Packages === 'string' ? JSON.parse(s.Packages) : s.Packages) : null,
            gallery: s.Gallery ? (typeof s.Gallery === 'string' ? JSON.parse(s.Gallery) : s.Gallery) : [],
            createdAt: s.CreatedAt
        }));
        res.json(services);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE (soft) service
app.delete('/api/services/:id', authMiddleware, providerOnly, async (req, res) => {
    try {
        const check = await sql.query`SELECT ProviderId FROM Services WHERE Id = ${req.params.id}`;
        if (!check.recordset.length) return res.status(404).json({ error: 'Service not found' });
        if (check.recordset[0].ProviderId !== req.user.userId) return res.status(403).json({ error: 'Kh├┤ng c├│ quyß╗ün.' });
        await sql.query`UPDATE Services SET Active=false, UpdatedAt=CURRENT_TIMESTAMP WHERE Id=${req.params.id}`;
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 2. AUTH
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Vui l├▓ng cung cß║Ñp email v├á password.' });
    try {
        const result = await sql.query`SELECT * FROM Users WHERE Email = ${email.toLowerCase()}`;
        if (!result.recordset.length) return res.status(401).json({ error: 'Email kh├┤ng tß╗ôn tß║íi.' });
        const user = result.recordset[0];

        // Verify bcrypt password (support legacy plain text)
        let valid = false;
        if (user.PasswordHash && user.PasswordHash.startsWith('$2')) {
            valid = await bcrypt.compare(password, user.PasswordHash);
        } else {
            valid = (password === user.PasswordHash);
        }
        if (!valid) return res.status(401).json({ error: 'Mß║¡t khß║⌐u kh├┤ng ─æ├║ng.' });

        let profile = {};
        if (user.Role === 'customer') {
            const p = await sql.query`SELECT * FROM CustomerProfiles WHERE UserId = ${user.Id}`;
            if (p.recordset.length) profile = p.recordset[0];
        } else {
            const p = await sql.query`SELECT * FROM ProviderProfiles WHERE UserId = ${user.Id}`;
            if (p.recordset.length) profile = p.recordset[0];
        }

        const session = {
            userId: user.Id, role: user.Role, name: user.Name,
            avatar: user.Avatar, email: user.Email, phone: user.Phone,
            verified: user.Verified,
            location: profile.Location || '',
            bio: profile.Bio || '',
            bank: profile.Bank || '',
            weddingDate: profile.WeddingDate ? profile.WeddingDate.toISOString().split('T')[0] : ''
        };
        const token = jwt.sign({ userId: user.Id, role: user.Role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ session, token });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM Users WHERE Id = ${req.user.userId}`;
        if (!result.recordset.length) return res.status(404).json({ error: 'User not found' });
        const user = result.recordset[0];

        let profile = {};
        if (user.Role === 'customer') {
            const p = await sql.query`SELECT * FROM CustomerProfiles WHERE UserId = ${user.Id}`;
            if (p.recordset.length) profile = p.recordset[0];
        } else {
            const p = await sql.query`SELECT * FROM ProviderProfiles WHERE UserId = ${user.Id}`;
            if (p.recordset.length) profile = p.recordset[0];
        }

        const session = {
            userId: user.Id, role: user.Role, name: user.Name,
            avatar: user.Avatar, email: user.Email, phone: user.Phone,
            verified: user.Verified,
            location: profile.Location || '',
            bio: profile.Bio || '',
            bank: profile.Bank || '',
            weddingDate: profile.WeddingDate ? profile.WeddingDate.toISOString().split('T')[0] : ''
        };
        res.json({ session });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, phone, location } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Vui l├▓ng ─æiß╗ün ─æß║ºy ─æß╗º th├┤ng tin.' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Email kh├┤ng ─æ├║ng ─æß╗ïnh dß║íng.' });
    const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passRegex.test(password)) return res.status(400).json({ error: 'Mß║¡t khß║⌐u phß║úi c├│ ├¡t nhß║Ñt 6 k├╜ tß╗▒, gß╗ôm 1 chß╗» in hoa v├á 1 k├╜ tß╗▒ ─æß║╖c biß╗çt.' });
    if (role === 'provider') {
        const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
        if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Sß╗æ ─æiß╗çn thoß║íi kh├┤ng hß╗úp lß╗ç.' });
    }
    try {
        const check = await sql.query`SELECT Id FROM Users WHERE Email = ${email.toLowerCase()}`;
        if (check.recordset.length) return res.status(400).json({ error: 'Email ─æ├ú tß╗ôn tß║íi.' });
        const id = 'U_' + uid();
        const avatar = name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
        const hash = await bcrypt.hash(password, 10);
        await sql.query`
            INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Phone, Avatar, Verified)
            VALUES (${id}, ${email.toLowerCase()}, ${hash}, ${name}, ${role}, ${phone||null}, ${avatar}, false)`;
        if (role === 'customer') {
            await sql.query`INSERT INTO CustomerProfiles (UserId, Location) VALUES (${id}, ${location||null})`;
        } else {
            await sql.query`INSERT INTO ProviderProfiles (UserId, Location) VALUES (${id}, ${location||null})`;
        }
        const session = { userId: id, role, name, avatar, email: email.toLowerCase(), phone: phone||'', location: location||'', verified: false };
        const token = jwt.sign({ userId: id, role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ session, token });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
    const { name, phone, location, bio, bank, weddingDate } = req.body;
    const { userId, role } = req.user;
    try {
        await sql.query`UPDATE Users SET Name=${name}, Phone=${phone||null}, UpdatedAt=GETDATE() WHERE Id=${userId}`;
        if (role === 'customer') {
            const c = await sql.query`SELECT UserId FROM CustomerProfiles WHERE UserId=${userId}`;
            if (c.recordset.length) {
                await sql.query`UPDATE CustomerProfiles SET Location=${location||null}, WeddingDate=${weddingDate||null} WHERE UserId=${userId}`;
            } else {
                await sql.query`INSERT INTO CustomerProfiles (UserId, Location, WeddingDate) VALUES (${userId}, ${location||null}, ${weddingDate||null})`;
            }
        } else {
            const p = await sql.query`SELECT UserId FROM ProviderProfiles WHERE UserId=${userId}`;
            if (p.recordset.length) {
                await sql.query`UPDATE ProviderProfiles SET Location=${location||null}, Bio=${bio||null}, Bank=${bank||null} WHERE UserId=${userId}`;
            } else {
                await sql.query`INSERT INTO ProviderProfiles (UserId, Location, Bio, Bank) VALUES (${userId}, ${location||null}, ${bio||null}, ${bank||null})`;
            }
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/auth/password', authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Thiß║┐u th├┤ng tin.' });
    const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passRegex.test(newPassword)) return res.status(400).json({ error: 'Mß║¡t khß║⌐u mß╗¢i phß║úi c├│ ├¡t nhß║Ñt 6 k├╜ tß╗▒, gß╗ôm 1 chß╗» in hoa v├á 1 k├╜ tß╗▒ ─æß║╖c biß╗çt.' });
    try {
        const r = await sql.query`SELECT PasswordHash FROM Users WHERE Id=${req.user.userId}`;
        if (!r.recordset.length) return res.status(404).json({ error: 'User not found' });
        const user = r.recordset[0];
        let valid = false;
        if (user.PasswordHash && user.PasswordHash.startsWith('$2')) {
            valid = await bcrypt.compare(oldPassword, user.PasswordHash);
        } else {
            valid = (oldPassword === user.PasswordHash);
        }
        if (!valid) return res.status(401).json({ error: 'Mß║¡t khß║⌐u hiß╗çn tß║íi kh├┤ng ─æ├║ng.' });
        const hash = await bcrypt.hash(newPassword, 10);
        await sql.query`UPDATE Users SET PasswordHash=${hash}, UpdatedAt=GETDATE() WHERE Id=${req.user.userId}`;
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 3. TRANSACTIONS
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

app.post('/api/transactions', authMiddleware, async (req, res) => {
    const { serviceId, date, time, address, note, paymentMethod } = req.body;
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    if (selectedDate < today) return res.status(400).json({ error: 'Ng├áy tß╗ò chß╗⌐c phß║úi tß╗½ h├┤m nay trß╗ƒ ─æi.' });
    if (!address || address.length < 10) return res.status(400).json({ error: 'Vui l├▓ng nhß║¡p ─æß╗ïa chß╗ë cß╗Ñ thß╗â (tß╗æi thiß╗âu 10 k├╜ tß╗▒).' });
    try {
        const svcRes = await sql.query`SELECT * FROM Services WHERE Id=${serviceId} AND Active=true`;
        if (!svcRes.recordset.length) return res.status(404).json({ error: 'Dß╗ïch vß╗Ñ kh├┤ng tß╗ôn tß║íi.' });
        const svc = svcRes.recordset[0];
        // Kiß╗âm tra ─æß║╖t tr├╣ng: c├╣ng kh├ích, c├╣ng dß╗ïch vß╗Ñ, c├╣ng ng├áy, ch╞░a bß╗ï huß╗╖
        const dupCheck = await sql.query`
            SELECT Id FROM Transactions
            WHERE CustomerId=${req.user.userId} AND ServiceId=${serviceId}
              AND Date=${date} AND Status IN ('pending','confirmed')`;
        if (dupCheck.recordset.length) {
            return res.status(400).json({ error: 'Bß║ín ─æ├ú ─æß║╖t dß╗ïch vß╗Ñ n├áy v├áo ng├áy n├áy rß╗ôi. Vui l├▓ng chß╗ìn ng├áy kh├íc.' });
        }
        let finalName = svc.Name;
        let finalPrice = svc.Price;

        const id = 'TXN_' + uid().toUpperCase();
        await sql.query`
            INSERT INTO Transactions (Id, CustomerId, ProviderId, ServiceId, ServiceName, Price, Date, Time, Address, Note, PaymentMethod)
            VALUES (${id}, ${req.user.userId}, ${svc.ProviderId}, ${serviceId}, ${finalName}, ${finalPrice},
                    ${date}, ${time}, ${address}, ${note||null}, ${paymentMethod||null})`;
        res.json({ id });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Admin verify provider
app.put('/api/admin/providers/:id/verify', authMiddleware, adminOnly, async (req, res) => {
    try {
        await sql.query`UPDATE Users SET Verified = true WHERE Id = ${req.params.id} AND Role = 'provider'`;
        res.json({ success: true, message: 'Provider has been verified.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/transactions/:userId', authMiddleware, async (req, res) => {
    if (req.user.userId !== req.params.userId && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Forbidden' });
    try {
        const result = await sql.query`
            SELECT t.*, u.Name AS CustomerName, u.Phone AS CustomerPhone,
                   s.Category AS ServiceCategory
            FROM Transactions t
            LEFT JOIN Users u ON t.CustomerId = u.Id
            LEFT JOIN Services s ON t.ServiceId = s.Id
            WHERE t.CustomerId=${req.params.userId} OR t.ProviderId=${req.params.userId}
            ORDER BY t.CreatedAt DESC`;
        res.json(result.recordset.map(mapTxn));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/transaction/:id', authMiddleware, async (req, res) => {
    try {
        const result = await sql.query`
            SELECT t.*, u.Name AS CustomerName, u.Phone AS CustomerPhone,
                   s.Category AS ServiceCategory
            FROM Transactions t
            LEFT JOIN Users u ON t.CustomerId = u.Id
            LEFT JOIN Services s ON t.ServiceId = s.Id
            WHERE t.Id=${req.params.id}`;
        if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
        const t = result.recordset[0];
        if (t.CustomerId !== req.user.userId && t.ProviderId !== req.user.userId)
            return res.status(403).json({ error: 'Forbidden' });
        res.json(mapTxn(t));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/transaction/:id/status', authMiddleware, async (req, res) => {
    const { status, paymentMethod, paymentStatus, cancelReason } = req.body;
    const allowed = ['pending','confirmed','done','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Trß║íng th├íi kh├┤ng hß╗úp lß╗ç.' });
    // Kiß╗âm tra l├╜ do khi tß╗½ chß╗æi
    if (status === 'cancelled' && req.user.role === 'provider' && !cancelReason?.trim())
        return res.status(400).json({ error: 'Vui l├▓ng nhß║¡p l├╜ do tß╗½ chß╗æi.' });
    try {
        const check = await sql.query`SELECT CustomerId, ProviderId FROM Transactions WHERE Id=${req.params.id}`;
        if (!check.recordset.length) return res.status(404).json({ error: 'Not found' });
        const { CustomerId, ProviderId } = check.recordset[0];
        if (req.user.userId !== CustomerId && req.user.userId !== ProviderId)
            return res.status(403).json({ error: 'Forbidden' });
        if (paymentMethod && paymentStatus) {
            await sql.query`UPDATE Transactions SET Status=${status}, PaymentMethod=${paymentMethod},
                PaymentStatus=${paymentStatus}, CancelReason=${cancelReason||null}, UpdatedAt=GETDATE() WHERE Id=${req.params.id}`;
        } else {
            await sql.query`UPDATE Transactions SET Status=${status}, CancelReason=${cancelReason||null}, UpdatedAt=GETDATE() WHERE Id=${req.params.id}`;
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

function mapTxn(t) {
    return {
        id: t.Id, customerId: t.CustomerId, providerId: t.ProviderId,
        serviceId: t.ServiceId, serviceName: t.ServiceName,
        serviceCategory: t.ServiceCategory || null,
        price: t.Price,
        date: t.Date ? (t.Date instanceof Date ? t.Date.toISOString().split('T')[0] : t.Date) : null,
        time: t.Time, address: t.Address, note: t.Note, status: t.Status,
        cancelReason: t.CancelReason || null,
        paymentMethod: t.PaymentMethod, paymentStatus: t.PaymentStatus,
        customerName: t.CustomerName || null,
        customerPhone: t.CustomerPhone || null,
        createdAt: t.CreatedAt, updatedAt: t.UpdatedAt
    };
}



// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 5. REVIEWS
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

app.get('/api/reviews/service/:id', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT r.*, u.Name AS CustomerName, u.Avatar AS CustomerAvatar
            FROM Reviews r LEFT JOIN Users u ON r.CustomerId = u.Id
            WHERE r.ServiceId=${req.params.id} ORDER BY r.CreatedAt DESC`;
        res.json(result.recordset.map(r => ({
            id: r.Id, serviceId: r.ServiceId, customerId: r.CustomerId,
            customerName: r.CustomerName, customerAvatar: r.CustomerAvatar,
            transactionId: r.TransactionId, rating: r.Rating,
            comment: r.Comment, createdAt: r.CreatedAt,
            providerReply: r.ProviderReply, repliedAt: r.RepliedAt
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/reviews', authMiddleware, async (req, res) => {
    const { serviceId, transactionId, rating, comment } = req.body;
    if (!serviceId || !transactionId || !rating) return res.status(400).json({ error: 'Thiß║┐u th├┤ng tin ─æ├ính gi├í.' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating phß║úi tß╗½ 1 ─æß║┐n 5.' });
    try {
        // Check ─æ├ú review ch╞░a
        const exist = await sql.query`SELECT Id FROM Reviews WHERE TransactionId=${transactionId}`;
        if (exist.recordset.length) return res.status(400).json({ error: 'Bß║ín ─æ├ú ─æ├ính gi├í ─æ╞ín h├áng n├áy rß╗ôi.' });
        // Verify transaction belongs to user
        const txn = await sql.query`SELECT CustomerId FROM Transactions WHERE Id=${transactionId} AND Status='done'`;
        if (!txn.recordset.length) return res.status(400).json({ error: '─É╞ín h├áng ch╞░a ho├án th├ánh hoß║╖c kh├┤ng tß╗ôn tß║íi.' });
        if (txn.recordset[0].CustomerId !== req.user.userId) return res.status(403).json({ error: 'Kh├┤ng c├│ quyß╗ün.' });

        const id = 'REV_' + uid();
        await sql.query`
            INSERT INTO Reviews (Id, ServiceId, CustomerId, TransactionId, Rating, Comment)
            VALUES (${id}, ${serviceId}, ${req.user.userId}, ${transactionId}, ${rating}, ${comment||null})`;
        // Update service avg rating
        const avg = await sql.query`SELECT AVG(CAST(Rating AS FLOAT)) AS Avg, COUNT(*) AS Cnt FROM Reviews WHERE ServiceId=${serviceId}`;
        await sql.query`UPDATE Services SET Rating=${avg.recordset[0].Avg}, ReviewCount=${avg.recordset[0].Cnt}, UpdatedAt=GETDATE() WHERE Id=${serviceId}`;
        res.json({ id, message: '─É├ính gi├í th├ánh c├┤ng!' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Check review exists for a transaction
app.get('/api/reviews/check/:transactionId', authMiddleware, async (req, res) => {
    try {
        const r = await sql.query`SELECT Id FROM Reviews WHERE TransactionId=${req.params.transactionId}`;
        res.json({ hasReview: r.recordset.length > 0 });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET reviews by provider ΓÇö Nh├á cung cß║Ñp xem tß║Ñt cß║ú ─æ├ính gi├í cß╗ºa dß╗ïch vß╗Ñ m├¼nh
app.get('/api/reviews/provider/:providerId', authMiddleware, async (req, res) => {
    if (req.user.userId !== req.params.providerId && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Forbidden' });
    try {
        const result = await sql.query`
            SELECT r.*, u.Name AS CustomerName, u.Avatar AS CustomerAvatar,
                   s.Name AS ServiceName
            FROM Reviews r
            LEFT JOIN Users u ON r.CustomerId = u.Id
            LEFT JOIN Services s ON r.ServiceId = s.Id
            WHERE s.ProviderId = ${req.params.providerId}
            ORDER BY r.CreatedAt DESC`;
        res.json(result.recordset.map(r => ({
            id: r.Id, serviceId: r.ServiceId, serviceName: r.ServiceName,
            customerId: r.CustomerId, customerName: r.CustomerName, customerAvatar: r.CustomerAvatar,
            transactionId: r.TransactionId, rating: r.Rating,
            comment: r.Comment, createdAt: r.CreatedAt,
            providerReply: r.ProviderReply, repliedAt: r.RepliedAt
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT review reply - Provider replies to a review
app.put('/api/reviews/:id/reply', authMiddleware, providerOnly, async (req, res) => {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: 'Nß╗Öi dung trß║ú lß╗¥i kh├┤ng ─æ╞░ß╗úc ─æß╗â trß╗æng.' });
    
    try {
        // Verify review belongs to provider
        const check = await sql.query`
            SELECT r.Id, s.ProviderId 
            FROM Reviews r
            JOIN Services s ON r.ServiceId = s.Id
            WHERE r.Id = ${req.params.id}`;
            
        if (!check.recordset.length) return res.status(404).json({ error: 'Kh├┤ng t├¼m thß║Ñy ─æ├ính gi├í.' });
        if (check.recordset[0].ProviderId !== req.user.userId) return res.status(403).json({ error: 'Kh├┤ng c├│ quyß╗ün.' });
        
        await sql.query`
            UPDATE Reviews 
            SET ProviderReply = ${reply}, RepliedAt = CURRENT_TIMESTAMP
            WHERE Id = ${req.params.id}`;
            
        res.json({ success: true, message: '─É├ú trß║ú lß╗¥i ─æ├ính gi├í.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 6. STATS
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

app.get('/api/stats/global', async (req, res) => {
    try {
        const [txns, revCount, avgRat] = await Promise.all([
            sql.query`SELECT COUNT(*) AS TotalDone FROM Transactions WHERE Status='done'`,
            sql.query`SELECT COUNT(*) AS TotalReviews FROM Reviews`,
            sql.query`SELECT AVG(CAST(Rating AS FLOAT)) AS AvgRating FROM Reviews`
        ]);
        res.json({
            doneTxns: txns.recordset[0].TotalDone || 0,
            totalReviews: revCount.recordset[0].TotalReviews || 0,
            avgRating: avgRat.recordset[0].AvgRating || 5
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/stats/customer', authMiddleware, async (req, res) => {
    const uid = req.user.userId;
    try {
        const r = await sql.query`
            SELECT COUNT(*) AS Total,
                   SUM(CASE WHEN Status='pending'   THEN 1 ELSE 0 END) AS Pending,
                   SUM(CASE WHEN Status='confirmed' THEN 1 ELSE 0 END) AS Confirmed,
                   SUM(CASE WHEN Status='done'      THEN 1 ELSE 0 END) AS Done,
                   SUM(CASE WHEN Status='cancelled' THEN 1 ELSE 0 END) AS Cancelled
            FROM Transactions WHERE CustomerId=${uid}`;
        const s = r.recordset[0];
        res.json({ total: s.Total||0, pending: s.Pending||0, confirmed: s.Confirmed||0, done: s.Done||0, cancelled: s.Cancelled||0        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/stats/admin', authMiddleware, adminOnly, async (req, res) => {
    try {
        const txnStats = await sql.query`
            SELECT COUNT(*) AS Total,
                   SUM(CASE WHEN Status='pending'   THEN 1 ELSE 0 END) AS Pending,
                   SUM(CASE WHEN Status='confirmed' THEN 1 ELSE 0 END) AS Confirmed,
                   SUM(CASE WHEN Status='done'      THEN 1 ELSE 0 END) AS Done,
                   SUM(CASE WHEN Status='cancelled' THEN 1 ELSE 0 END) AS Cancelled
            FROM Transactions`;
        
        // Revenue by month (last 6 months)
        const revenue = await sql.query`
            SELECT TO_CHAR(CreatedAt, 'YYYY-MM') as month, 
                   SUM(s.Price) as total_revenue
            FROM Transactions t
            JOIN Services s ON t.ServiceId = s.Id
            WHERE t.Status = 'done' 
              AND t.CreatedAt >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY TO_CHAR(CreatedAt, 'YYYY-MM')
            ORDER BY month ASC`;
            
        res.json({
            transactions: txnStats.recordset[0] || { Total:0, Pending:0, Confirmed:0, Done:0, Cancelled:0 },
            revenue: revenue.recordset.map(r => ({ month: r.month, amount: r.total_revenue || 0 }))
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/stats/provider', authMiddleware, providerOnly, async (req, res) => {
    const uid = req.user.userId;
    try {
        const [orders, monthly, svcs] = await Promise.all([
            sql.query`SELECT COUNT(*) AS Total,
                SUM(CASE WHEN Status='pending' THEN 1 ELSE 0 END) AS Pending,
                SUM(CASE WHEN Status='done'    THEN 1 ELSE 0 END) AS Done,
                SUM(CASE WHEN PaymentStatus='paid' THEN Price ELSE 0 END) AS Revenue
                FROM Transactions WHERE ProviderId=${uid}`,
            sql.query`SELECT TO_CHAR(CreatedAt,'YYYY-MM') AS Month,
                SUM(CASE WHEN PaymentStatus='paid' THEN Price ELSE 0 END) AS Revenue,
                COUNT(*) AS Orders
                FROM Transactions WHERE ProviderId=${uid}
                GROUP BY TO_CHAR(CreatedAt,'YYYY-MM') ORDER BY Month DESC`,
            sql.query`SELECT COUNT(*) AS Total FROM Services WHERE ProviderId=${uid} AND Active=true`
        ]);
        const s = orders.recordset[0];
        res.json({
            orders: s.Total||0, pending: s.Pending||0, done: s.Done||0, revenue: s.Revenue||0,
            services: svcs.recordset[0].Total||0,
            monthly: monthly.recordset.map(m => ({ month: m.Month, revenue: m.Revenue||0, orders: m.Orders||0 }))
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 7. CHAT (Conversations & Messages)
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

app.get('/api/conversations', authMiddleware, async (req, res) => {
    const uid = req.user.userId;
    try {
        const result = await sql.query`
            SELECT c.*, cp2.UserId AS OtherUserId, u.Name AS OtherName, u.Avatar AS OtherAvatar, u.Role AS OtherRole,
                   (SELECT COUNT(*) FROM Messages m WHERE m.ConversationId=c.Id AND m.SenderId<>${uid} AND m.IsRead=0) AS UnreadCount
            FROM Conversations c
            JOIN ConversationParticipants cp ON cp.ConversationId=c.Id AND cp.UserId=${uid}
            JOIN ConversationParticipants cp2 ON cp2.ConversationId=c.Id AND cp2.UserId<>${uid}
            JOIN Users u ON u.Id=cp2.UserId
            ORDER BY c.LastAt DESC`;
        res.json(result.recordset.map(c => ({
            id: c.Id, serviceId: c.ServiceId, lastMessage: c.LastMessage, lastAt: c.LastAt,
            otherUser: { id: c.OtherUserId, name: c.OtherName, avatar: c.OtherAvatar, role: c.OtherRole },
            unreadCount: c.UnreadCount || 0
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/conversations', authMiddleware, async (req, res) => {
    const { providerId, serviceId } = req.body;
    const myId = req.user.userId;
    if (!providerId) return res.status(400).json({ error: 'Missing providerId' });
    try {
        // Find existing conversation
        const exist = await sql.query`
            SELECT c.Id FROM Conversations c
            JOIN ConversationParticipants cp1 ON cp1.ConversationId=c.Id AND cp1.UserId=${myId}
            JOIN ConversationParticipants cp2 ON cp2.ConversationId=c.Id AND cp2.UserId=${providerId}`;
        if (exist.recordset.length) return res.json({ id: exist.recordset[0].Id });
        // Create new
        const id = 'CONV_' + uid();
        await sql.query`INSERT INTO Conversations (Id, ServiceId) VALUES (${id}, ${serviceId||null})`;
        await sql.query`INSERT INTO ConversationParticipants (ConversationId, UserId) VALUES (${id}, ${myId})`;
        await sql.query`INSERT INTO ConversationParticipants (ConversationId, UserId) VALUES (${id}, ${providerId})`;
        res.json({ id });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/messages/:convId', authMiddleware, async (req, res) => {
    const { convId } = req.params;
    const uid = req.user.userId;
    try {
        // Verify user is participant
        const check = await sql.query`SELECT UserId FROM ConversationParticipants WHERE ConversationId=${convId} AND UserId=${uid}`;
        if (!check.recordset.length) return res.status(403).json({ error: 'Forbidden' });
        // Mark as read
        await sql.query`UPDATE Messages SET IsRead=1 WHERE ConversationId=${convId} AND SenderId<>${uid}`;
        const msgs = await sql.query`SELECT * FROM Messages WHERE ConversationId=${convId} ORDER BY CreatedAt ASC`;
        res.json(msgs.recordset.map(m => ({
            id: m.Id, conversationId: m.ConversationId, senderId: m.SenderId,
            content: m.Content, read: m.IsRead, createdAt: m.CreatedAt
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/messages', authMiddleware, async (req, res) => {
    const { conversationId, content } = req.body;
    if (!conversationId || !content?.trim()) return res.status(400).json({ error: 'Missing data' });
    const uid = req.user.userId;
    try {
        const check = await sql.query`SELECT UserId FROM ConversationParticipants WHERE ConversationId=${conversationId} AND UserId=${uid}`;
        if (!check.recordset.length) return res.status(403).json({ error: 'Forbidden' });
        const id = 'MSG_' + uid + '_' + Date.now();
        await sql.query`INSERT INTO Messages (Id, ConversationId, SenderId, Content) VALUES (${id}, ${conversationId}, ${uid}, ${content.trim()})`;
        await sql.query`UPDATE Conversations SET LastMessage=${content.trim()}, LastAt=GETDATE(), UpdatedAt=GETDATE() WHERE Id=${conversationId}`;
        res.json({ id, conversationId, senderId: uid, content: content.trim(), read: false, createdAt: new Date() });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 8. FAVORITES (Wishlist)
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

app.get('/api/favorites', authMiddleware, async (req, res) => {
    try {
        const result = await sql.query`
            SELECT s.*, u.Name AS ProviderName FROM Favorites f
            JOIN Services s ON s.Id=f.ServiceId
            LEFT JOIN Users u ON u.Id=s.ProviderId
            WHERE f.UserId=${req.user.userId} AND s.Active=true ORDER BY f.CreatedAt DESC`;
        res.json(result.recordset.map(s => ({
            id: s.Id, providerId: s.ProviderId, providerName: s.ProviderName,
            category: s.Category, name: s.Name, description: s.Description,
            price: s.Price, unit: s.Unit, image: s.Image, location: s.Location,
            rating: s.Rating, reviewCount: s.ReviewCount,
            tags: s.Tags ? (typeof s.Tags === 'string' ? JSON.parse(s.Tags) : s.Tags) : []
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/favorites/:serviceId', authMiddleware, async (req, res) => {
    const { serviceId } = req.params;
    const uid = req.user.userId;
    try {
        const exist = await sql.query`SELECT UserId FROM Favorites WHERE UserId=${uid} AND ServiceId=${serviceId}`;
        if (exist.recordset.length) {
            await sql.query`DELETE FROM Favorites WHERE UserId=${uid} AND ServiceId=${serviceId}`;
            res.json({ favorited: false });
        } else {
            await sql.query`INSERT INTO Favorites (UserId, ServiceId) VALUES (${uid}, ${serviceId})`;
            res.json({ favorited: true });
        }
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/favorites/check/:serviceId', authMiddleware, async (req, res) => {
    try {
        const r = await sql.query`SELECT UserId FROM Favorites WHERE UserId=${req.user.userId} AND ServiceId=${req.params.serviceId}`;
        res.json({ favorited: r.recordset.length > 0 });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 9. CONSULTATIONS
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

app.post('/api/consultations', authMiddleware, async (req, res) => {
    const { serviceId, date, time, address, note } = req.body;
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    if (selectedDate < today) return res.status(400).json({ error: 'Ng├áy hß║╣n phß║úi tß╗½ h├┤m nay trß╗ƒ ─æi.' });
    if (!address || address.length < 5) return res.status(400).json({ error: 'Vui l├▓ng nhß║¡p ─æß╗ïa chß╗ë cß╗Ñ thß╗â.' });
    try {
        let providerId = null;
        let svcName = 'T╞░ Vß║Ñn Chung';
        let sId = null;
        
        if (serviceId) {
            const svcRes = await sql.query`SELECT * FROM Services WHERE Id=${serviceId} AND Active=true`;
            if (!svcRes.recordset.length) return res.status(404).json({ error: 'Dß╗ïch vß╗Ñ kh├┤ng tß╗ôn tß║íi.' });
            const svc = svcRes.recordset[0];
            providerId = svc.ProviderId;
            svcName = svc.Name;
            sId = serviceId;
        }
        
        const id = 'CON_' + uid().toUpperCase();
        await sql.query`
            INSERT INTO Consultations (Id, CustomerId, ProviderId, ServiceId, ServiceName, Date, Time, Address, Note)
            VALUES (${id}, ${req.user.userId}, ${providerId}, ${sId}, ${svcName},
                    ${date}, ${time}, ${address}, ${note||null})`;
        res.json({ id });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/consultations/customer', authMiddleware, async (req, res) => {
    try {
        const result = await sql.query`
            SELECT c.*, u.Name AS ProviderName, u.Phone AS ProviderPhone FROM Consultations c
            LEFT JOIN Users u ON c.ProviderId = u.Id
            WHERE c.CustomerId=${req.user.userId}
            ORDER BY c.CreatedAt DESC`;
        res.json(result.recordset.map(mapConsultation));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/consultations/provider', authMiddleware, providerOnly, async (req, res) => {
    try {
        const result = await sql.query`
            SELECT c.*, u.Name AS CustomerName, u.Phone AS CustomerPhone FROM Consultations c
            LEFT JOIN Users u ON c.CustomerId = u.Id
            WHERE c.ProviderId=${req.user.userId}
            ORDER BY c.CreatedAt DESC`;
        res.json(result.recordset.map(mapConsultation));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/consultations/:id/status', authMiddleware, async (req, res) => {
    const { status, providerNote } = req.body;
    const allowed = ['pending','confirmed','done','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Trß║íng th├íi kh├┤ng hß╗úp lß╗ç.' });
    try {
        const check = await sql.query`SELECT CustomerId, ProviderId FROM Consultations WHERE Id=${req.params.id}`;
        if (!check.recordset.length) return res.status(404).json({ error: 'Not found' });
        const { CustomerId, ProviderId } = check.recordset[0];
        if (req.user.userId !== CustomerId && req.user.userId !== ProviderId)
            return res.status(403).json({ error: 'Forbidden' });
            
        await sql.query`UPDATE Consultations SET Status=${status}, ProviderNote=${providerNote||null}, UpdatedAt=GETDATE() WHERE Id=${req.params.id}`;
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

function mapConsultation(c) {
    return {
        id: c.Id, customerId: c.CustomerId, providerId: c.ProviderId,
        serviceId: c.ServiceId, serviceName: c.ServiceName,
        date: c.Date ? (c.Date instanceof Date ? c.Date.toISOString().split('T')[0] : c.Date) : null,
        time: c.Time ? (c.Time instanceof Date ? c.Time.toISOString().substring(11, 16) : c.Time.toString().substring(0, 5)) : null,
        address: c.Address, note: c.Note, status: c.Status,
        providerNote: c.ProviderNote || null,
        customerName: c.CustomerName || null,
        customerPhone: c.CustomerPhone || null,
        providerName: c.ProviderName || null,
        providerPhone: c.ProviderPhone || null,
        createdAt: c.CreatedAt, updatedAt: c.UpdatedAt
    };
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 7. ADMIN ENDPOINTS
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await sql.query`SELECT Id, Name, Email, Role, Phone, Verified, CreatedAt FROM Users ORDER BY CreatedAt DESC`;
        res.json(result.recordset);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/providers', authMiddleware, adminOnly, async (req, res) => {
    const { name, email, password, phone, location } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Vui l├▓ng ─æiß╗ün ─æß║ºy ─æß╗º th├┤ng tin.' });
    try {
        const check = await sql.query`SELECT Id FROM Users WHERE Email = ${email.toLowerCase()}`;
        if (check.recordset.length) return res.status(400).json({ error: 'Email ─æ├ú tß╗ôn tß║íi.' });
        const id = 'U_' + uid();
        const avatar = name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
        const hash = await bcrypt.hash(password, 10);
        await sql.query`
            INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Phone, Avatar, Verified)
            VALUES (${id}, ${email.toLowerCase()}, ${hash}, ${name}, 'provider', ${phone||null}, ${avatar}, true)`;
        await sql.query`INSERT INTO ProviderProfiles (UserId, Location) VALUES (${id}, ${location||null})`;
        res.json({ id, message: 'Tß║ío nh├á cung cß║Ñp th├ánh c├┤ng' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/admin/users/:id/toggle', authMiddleware, adminOnly, async (req, res) => {
    try {
        const check = await sql.query`SELECT Verified, Role FROM Users WHERE Id = ${req.params.id}`;
        if (!check.recordset.length) return res.status(404).json({ error: 'Kh├┤ng t├¼m thß║Ñy ng╞░ß╗¥i d├╣ng' });
        if (check.recordset[0].Role === 'admin') return res.status(403).json({ error: 'Kh├┤ng thß╗â kho├í quß║ún trß╗ï vi├¬n' });
        
        const currentVerified = check.recordset[0].Verified;
        const newVerified = currentVerified ? false : true;
        await sql.query`UPDATE Users SET Verified=${newVerified}, UpdatedAt=GETDATE() WHERE Id=${req.params.id}`;
        // Khi kho├í provider ΓåÆ ß║⌐n to├án bß╗Ö dß╗ïch vß╗Ñ cß╗ºa hß╗ì; khi mß╗ƒ kho├í ΓåÆ hiß╗çn lß║íi
        if (check.recordset[0].Role === 'provider') {
            await sql.query`UPDATE Services SET Active=${newVerified}, UpdatedAt=GETDATE() WHERE ProviderId=${req.params.id}`;
        }
        res.json({ success: true, verified: newVerified === true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/services', authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await sql.query`
            SELECT s.Id, s.Name, s.Category, s.Price, s.Active, s.CreatedAt, u.Name as ProviderName, u.Verified as ProviderVerified 
            FROM Services s
            LEFT JOIN Users u ON s.ProviderId = u.Id
            ORDER BY s.CreatedAt DESC`;
        res.json(result.recordset);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/admin/services/:id/toggle', authMiddleware, adminOnly, async (req, res) => {
    try {
        const check = await sql.query`SELECT Active FROM Services WHERE Id = ${req.params.id}`;
        if (!check.recordset.length) return res.status(404).json({ error: 'Kh├┤ng t├¼m thß║Ñy dß╗ïch vß╗Ñ' });
        
        const currentActive = check.recordset[0].Active;
        const newActive = currentActive ? false : true;
        await sql.query`UPDATE Services SET Active=${newActive}, UpdatedAt=GETDATE() WHERE Id=${req.params.id}`;
        res.json({ success: true, active: newActive === true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/transactions', authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await sql.query`
            SELECT t.Id, t.ServiceName, t.Price, t.Status, t.Date, t.Time, t.CreatedAt,
                   c.Name AS CustomerName, p.Name AS ProviderName
            FROM Transactions t
            LEFT JOIN Users c ON t.CustomerId = c.Id
            LEFT JOIN Users p ON t.ProviderId = p.Id
            ORDER BY t.CreatedAt DESC`;
        res.json(result.recordset);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 8. BLOG
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

app.get('/api/blogs', async (req, res) => {
    try {
        const { year, month, limit, offset, all, search } = req.query;
        let query = `SELECT Id, Title, Slug, CoverImage, Published, PublishedAt, CreatedAt 
                     FROM BlogPosts WHERE 1=1`;
        const params = [];
        if (year && month) {
            params.push(parseInt(year), parseInt(month));
            query += ` AND EXTRACT(YEAR FROM PublishedAt) = $${params.length-1} AND EXTRACT(MONTH FROM PublishedAt) = $${params.length}`;
        }
        if (all !== 'true') {
            query += ` AND Published=true`;
        }
        if (search) {
            params.push(`%${search.replace(/[%_]/g, '')}%`);
            query += ` AND Title ILIKE $${params.length}`;
        }
        query += ` ORDER BY CreatedAt DESC`;
        if (limit) query += ` LIMIT ${parseInt(limit)}`;
        if (offset) query += ` OFFSET ${parseInt(offset)}`;
        
        const result = await pool.query(query, params);
        const mapped = result.rows.map(p => ({
            Id: p.id || p.Id,
            Title: p.title || p.Title,
            Slug: p.slug || p.Slug,
            CoverImage: p.coverimage || p.CoverImage,
            Published: p.published || p.Published,
            PublishedAt: p.publishedat || p.PublishedAt,
            CreatedAt: p.createdat || p.CreatedAt
        }));
        res.json(mapped);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/blogs/months', async (req, res) => {
    try {
        const { offset = 0 } = req.query;
        const result = await sql.query`
            SELECT DISTINCT EXTRACT(YEAR FROM PublishedAt) as year, EXTRACT(MONTH FROM PublishedAt) as month
            FROM BlogPosts WHERE Published=true AND PublishedAt IS NOT NULL
            ORDER BY year DESC, month DESC
            LIMIT 5 OFFSET ${parseInt(offset)}`;
        res.json(result.recordset.map(r => ({ year: r.year, month: r.month })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/blogs/:id', async (req, res) => {
    try {
        let isSlug = !req.params.id.startsWith('POST_');
        let postRes;
        if (isSlug) {
            postRes = await sql.query`SELECT * FROM BlogPosts WHERE Slug=${req.params.id}`;
        } else {
            postRes = await sql.query`SELECT * FROM BlogPosts WHERE Id=${req.params.id}`;
        }
        
        if (!postRes.recordset.length) return res.status(404).json({ error: 'Blog not found' });
        const p = postRes.recordset[0];
        const mappedPost = {
            Id: p.id || p.Id,
            Title: p.title || p.Title,
            Slug: p.slug || p.Slug,
            CoverImage: p.coverimage || p.CoverImage,
            Published: p.published || p.Published,
            PublishedAt: p.publishedat || p.PublishedAt,
            CreatedAt: p.createdat || p.CreatedAt
        };
        const blocksRes = await sql.query`SELECT * FROM BlogBlocks WHERE PostId=${p.id || p.Id} ORDER BY Position ASC`;
        mappedPost.blocks = blocksRes.recordset.map(b => ({
            Id: b.id || b.Id,
            Type: b.type || b.Type,
            Content: b.content || b.Content,
            Position: b.position || b.Position
        }));
        res.json(mappedPost);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/blogs', authMiddleware, adminOnly, async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Missing title' });
    try {
        const id = 'POST_' + uid();
        const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + uid().slice(0, 4);
        await sql.query`INSERT INTO BlogPosts (Id, AuthorId, Title, Slug) VALUES (${id}, ${req.user.userId}, ${title}, ${slug})`;
        res.json({ id, slug, message: 'Created successfully' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/blogs/:id', authMiddleware, adminOnly, async (req, res) => {
    const { title, coverImage, published } = req.body;
    try {
        let updateQ = `UPDATE BlogPosts SET UpdatedAt=CURRENT_TIMESTAMP`;
        if (title !== undefined) updateQ += `, Title='${title.replace(/'/g,"''")}'`;
        if (coverImage !== undefined) updateQ += `, CoverImage=${coverImage ? `'${coverImage}'` : 'NULL'}`;
        if (published !== undefined) {
            updateQ += `, Published=${published ? 'true' : 'false'}`;
            if (published) updateQ += `, PublishedAt=COALESCE(PublishedAt, CURRENT_TIMESTAMP)`;
        }
        updateQ += ` WHERE Id='${req.params.id}'`;
        await sql.query(updateQ);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/blogs/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await sql.query`DELETE FROM BlogPosts WHERE Id=${req.params.id}`;
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/blogs/:id/blocks', authMiddleware, adminOnly, async (req, res) => {
    const { type, content, position } = req.body;
    if (!type) return res.status(400).json({ error: 'Missing block type' });
    try {
        const blockId = 'BLK_' + uid();
        const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
        await sql.query`INSERT INTO BlogBlocks (Id, PostId, Type, Content, Position) VALUES (${blockId}, ${req.params.id}, ${type}, ${contentStr}, ${position || 0})`;
        res.json({ id: blockId, message: 'Block added' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/blogs/:id/blocks/:blockId', authMiddleware, adminOnly, async (req, res) => {
    const { content, position } = req.body;
    try {
        let updateQ = `UPDATE BlogBlocks SET Id=Id`;
        if (content !== undefined) {
            const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
            updateQ += `, Content='${contentStr.replace(/'/g,"''")}'`;
        }
        if (position !== undefined) updateQ += `, Position=${position}`;
        updateQ += ` WHERE Id='${req.params.blockId}' AND PostId='${req.params.id}'`;
        await sql.query(updateQ);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/blogs/:id/blocks/:blockId', authMiddleware, adminOnly, async (req, res) => {
    try {
        await sql.query`DELETE FROM BlogBlocks WHERE Id=${req.params.blockId} AND PostId=${req.params.id}`;
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/blogs/:id/blocks/reorder', authMiddleware, adminOnly, async (req, res) => {
    const { blocks } = req.body;
    if (!Array.isArray(blocks)) return res.status(400).json({ error: 'Invalid data' });
    try {
        for (let b of blocks) {
            await sql.query(`UPDATE BlogBlocks SET Position=${b.position} WHERE Id='${b.id}' AND PostId='${req.params.id}'`);
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// 9. TRAP-AODAI LINKS
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

// GET danh s├ích ├ío d├ái ─æ├ú li├¬n kß║┐t vß╗¢i 1 Tr├íp
app.get('/api/services/:id/aodai', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT s.Id, s.Name, s.Image, s.Description, s.Location, s.ProviderId
            FROM TrapAodaiLinks t
            JOIN Services s ON s.Id = t.AodaiId
            WHERE t.TrapId = ${req.params.id} AND s.Active = true
            ORDER BY s.Name`;
        const items = result.recordset.map(s => ({
            id: s.id || s.Id,
            name: s.name || s.Name,
            image: s.image || s.Image,
            description: s.description || s.Description,
            location: s.location || s.Location,
            providerId: s.providerid || s.ProviderId
        }));
        res.json(items);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT cß║¡p nhß║¡t danh s├ích ├ío d├ái li├¬n kß║┐t vß╗¢i Tr├íp (provider only)
app.put('/api/services/:id/aodai-links', authMiddleware, providerOnly, async (req, res) => {
    const { aodaiIds } = req.body;
    if (!Array.isArray(aodaiIds)) return res.status(400).json({ error: 'aodaiIds must be an array' });
    try {
        // Kiß╗âm tra provider sß╗ƒ hß╗»u tr├íp n├áy
        const check = await sql.query`SELECT ProviderId FROM Services WHERE Id = ${req.params.id}`;
        if (!check.recordset.length) return res.status(404).json({ error: 'Service not found' });
        const row = check.recordset[0];
        if ((row.providerid || row.ProviderId) !== req.user.userId)
            return res.status(403).json({ error: 'Kh├┤ng c├│ quyß╗ün.' });
        // X├│a to├án bß╗Ö li├¬n kß║┐t c┼⌐ rß╗ôi th├¬m lß║íi
        await sql.query`DELETE FROM TrapAodaiLinks WHERE TrapId = ${req.params.id}`;
        for (const aodaiId of aodaiIds) {
            const linkId = 'LNK_' + uid();
            await sql.query`INSERT INTO TrapAodaiLinks (Id, TrapId, AodaiId) VALUES (${linkId}, ${req.params.id}, ${aodaiId})`;
        }
        res.json({ success: true, linked: aodaiIds.length });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ΓöÇΓöÇ Health check ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.get('/', (req, res) => res.json({ message: 'B├¬Tr├íp API v2.0 ΓÇö Running Γ£à' }));

// ΓöÇΓöÇ Global Error Handler ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.use((err, req, res, next) => {
    console.error('Express Global Error:', err);
    res.status(500).json({ error: err.message || 'Lß╗ùi hß╗ç thß╗æng hoß║╖c dß╗ïch vß╗Ñ Cloudinary.' });
});

// Auto-migration for Vercel
sql.query(`ALTER TABLE Services ADD COLUMN Gallery VARCHAR(5000);`).catch(() => {});
sql.query(`ALTER TABLE Services ALTER COLUMN Description TYPE TEXT;`).catch(() => {});
sql.query(`ALTER TABLE Reviews ADD COLUMN ProviderReply TEXT;`).catch(() => {});
sql.query(`ALTER TABLE Reviews ADD COLUMN RepliedAt TIMESTAMP;`).catch(() => {});
sql.query(`
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
    );
`).catch(e => console.error(e));
sql.query(`
    CREATE TABLE IF NOT EXISTS BlogBlocks (
        Id        VARCHAR(50) PRIMARY KEY,
        PostId    VARCHAR(50) NOT NULL REFERENCES BlogPosts(Id) ON DELETE CASCADE,
        Type      VARCHAR(50) NOT NULL,
        Content   TEXT,
        Position  INT NOT NULL DEFAULT 0,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`).catch(e => console.error(e));
sql.query(`ALTER TABLE BlogBlocks RENAME COLUMN "Position" TO position;`).catch(() => {});
sql.query(`ALTER TABLE BlogBlocks RENAME COLUMN "Type" TO type;`).catch(() => {});
sql.query(`
    CREATE TABLE IF NOT EXISTS TrapAodaiLinks (
        Id        VARCHAR(50) PRIMARY KEY,
        TrapId    VARCHAR(50) NOT NULL REFERENCES Services(Id) ON DELETE CASCADE,
        AodaiId   VARCHAR(50) NOT NULL REFERENCES Services(Id) ON DELETE CASCADE,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(TrapId, AodaiId)
    );
`).catch(e => console.error('TrapAodaiLinks:', e));

// Test kß║┐t nß╗æi
if (require.main === module) {
    app.listen(PORT, () => console.log(`≡ƒÜÇ B├¬Tr├íp Server running on http://localhost:${PORT}`));
}
module.exports = app;
