const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Import DB
const db = require('./config/db');

// Import Cloudinary & Multer
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes').router;
const transactionRoutes = require('./routes/transactionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const featureRoutes = require('./routes/featureRoutes');

const { authMiddleware } = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize DB columns
db.connectDB().then(() => db.initDB());

// ── Cấu hình Cloudinary ──────────────────────────────────────────────────────
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

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Phục vụ các file tĩnh (Frontend) từ thư mục gốc
app.use(express.static(path.join(__dirname, '../')));

// ── Setup Database Endpoints ──────────────────────────────────────────────────
app.get('/api/setup-db', async (req, res) => {
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await db.pool.query(schema);
        res.send('✅ Database setup completed successfully!');
    } catch (err) {
        console.error(err);
        res.status(500).send('❌ Error setting up database: ' + err.message);
    }
});

app.get('/api/setup-admin', async (req, res) => {
    try {
        const hash = await bcrypt.hash('123456', 10);
        await db.query(
            `INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Avatar, Verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['U_ADMIN', 'admin@betrap.vn', hash, 'Quản Trị Viên', 'admin', 'AD', true]
        );
        res.send('✅ Admin account created: admin@betrap.vn / 123456');
    } catch (err) {
        res.status(500).send('❌ Error: ' + err.message);
    }
});

// ── Image Upload Route ────────────────────────────────────────────────────────
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file được tải lên.' });
    res.json({ url: req.file.path });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/transactions', transactionRoutes);
// The old frontend uses /api/transaction/:id for GET and /api/transaction/:id/status for PUT, so I'll alias them
app.use('/api/transaction', transactionRoutes); 

app.use('/api/reviews', reviewRoutes);
app.use('/api', messageRoutes);

// Alias for old frontend routes calling /api/admin, /api/stats, /api/favorites, /api/consultations
app.use('/api', adminRoutes);
app.use('/api', featureRoutes);

// Alias for provider services
const serviceController = require('./controllers/serviceController');
const { providerOnly } = require('./routes/serviceRoutes');
app.get('/api/provider/services', authMiddleware, providerOnly, serviceController.getProviderServices);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
