require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Configuration
const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'your_password',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'BeTrapDB',
    options: {
        encrypt: false, // For local dev
        trustServerCertificate: true
    }
};

// Connect to Database
async function connectDB() {
    try {
        await sql.connect(dbConfig);
        console.log('✅ Connected to SQL Server');
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    }
}
connectDB();

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to BêTráp API' });
});

// ==========================================
// ROUTES (Controllers can be split later)
// ==========================================

// 1. SERVICES
app.get('/api/services', async (req, res) => {
    try {
        let query = `SELECT * FROM Services WHERE Active = 1`;
        const result = await sql.query(query);
        const services = result.recordset.map(s => ({ ...s, Tags: s.Tags ? JSON.parse(s.Tags) : [] }));
        res.json(services);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. AUTH
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Vui lòng cung cấp email và password.' });
    
    try {
        const result = await sql.query`SELECT * FROM Users WHERE Email = ${email}`;
        if (result.recordset.length === 0) return res.status(401).json({ error: 'Email không tồn tại.' });
        
        const user = result.recordset[0];
        if (user.PasswordHash !== password) return res.status(401).json({ error: 'Mật khẩu không đúng.' });
        
        let profile = {};
        if (user.Role === 'customer') {
            const profResult = await sql.query`SELECT * FROM CustomerProfiles WHERE UserId = ${user.Id}`;
            if (profResult.recordset.length > 0) profile = profResult.recordset[0];
        } else {
            const profResult = await sql.query`SELECT * FROM ProviderProfiles WHERE UserId = ${user.Id}`;
            if (profResult.recordset.length > 0) profile = profResult.recordset[0];
        }
        
        delete user.PasswordHash;
        res.json({ session: { 
            userId: user.Id, 
            role: user.Role, 
            name: user.Name, 
            avatar: user.Avatar,
            email: user.Email,
            phone: user.Phone,
            location: profile.Location || '',
            bio: profile.Bio || '',
            bank: profile.Bank || '',
            weddingDate: profile.WeddingDate ? profile.WeddingDate.toISOString().split('T')[0] : ''
        }});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, phone, location } = req.body;
    
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin.' });
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Email không đúng định dạng.' });
    
    const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passRegex.test(password)) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự, gồm 1 chữ in hoa và 1 ký tự đặc biệt.' });
    
    if (role === 'provider') {
        const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
        if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ (Phải là ĐTDĐ Việt Nam 10 số).' });
    }

    try {
        const check = await sql.query`SELECT * FROM Users WHERE Email = ${email}`;
        if (check.recordset.length > 0) return res.status(400).json({ error: 'Email đã tồn tại.' });
        
        const id = 'U_' + Math.random().toString(36).substr(2, 9);
        const avatar = name.trim().split(' ').map(w=>w[0]).slice(-2).join('').toUpperCase();
        
        await sql.query`
            INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Phone, Avatar, Verified)
            VALUES (${id}, ${email}, ${password}, ${name}, ${role}, ${phone}, ${avatar}, 0)
        `;
        
        if (role === 'customer') {
            await sql.query`INSERT INTO CustomerProfiles (UserId, Location) VALUES (${id}, ${location})`;
        } else {
            await sql.query`INSERT INTO ProviderProfiles (UserId, Location) VALUES (${id}, ${location})`;
        }
        
        res.json({ session: { userId: id, role, name, avatar, email, phone, location } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/auth/profile', async (req, res) => {
    const { userId, role, name, phone, location, bio, bank, weddingDate } = req.body;
    if (!userId || !role) return res.status(400).json({ error: 'Missing userId or role' });

    try {
        await sql.query`UPDATE Users SET Name = ${name}, Phone = ${phone} WHERE Id = ${userId}`;
        
        if (role === 'customer') {
            const check = await sql.query`SELECT * FROM CustomerProfiles WHERE UserId = ${userId}`;
            if (check.recordset.length > 0) {
                await sql.query`UPDATE CustomerProfiles SET Location = ${location}, WeddingDate = ${weddingDate || null} WHERE UserId = ${userId}`;
            } else {
                await sql.query`INSERT INTO CustomerProfiles (UserId, Location, WeddingDate) VALUES (${userId}, ${location}, ${weddingDate || null})`;
            }
        } else if (role === 'provider') {
            const check = await sql.query`SELECT * FROM ProviderProfiles WHERE UserId = ${userId}`;
            if (check.recordset.length > 0) {
                await sql.query`UPDATE ProviderProfiles SET Location = ${location}, Bio = ${bio}, Bank = ${bank} WHERE UserId = ${userId}`;
            } else {
                await sql.query`INSERT INTO ProviderProfiles (UserId, Location, Bio, Bank) VALUES (${userId}, ${location}, ${bio}, ${bank})`;
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. TRANSACTIONS
app.post('/api/transactions', async (req, res) => {
    const { customerId, serviceId, date, time, address, note, paymentMethod } = req.body;
    
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    if (selectedDate < today) return res.status(400).json({ error: 'Ngày tổ chức phải từ hôm nay trở đi.' });
    if (!address || address.length < 10) return res.status(400).json({ error: 'Vui lòng nhập địa chỉ cụ thể (tối thiểu 10 ký tự).' });

    try {
        const svcRes = await sql.query`SELECT * FROM Services WHERE Id = ${serviceId}`;
        if (svcRes.recordset.length === 0) return res.status(404).json({ error: 'Service not found' });
        const svc = svcRes.recordset[0];
        
        const id = 'TXN_' + Math.random().toString(36).substr(2, 9);
        await sql.query`
            INSERT INTO Transactions (Id, CustomerId, ProviderId, ServiceId, ServiceName, Price, Date, Time, Address, Note, PaymentMethod)
            VALUES (${id}, ${customerId}, ${svc.ProviderId}, ${serviceId}, ${svc.Name}, ${svc.Price}, ${date}, ${time}, ${address}, ${note}, ${paymentMethod})
        `;
        res.json({ id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/transactions/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await sql.query`SELECT * FROM Transactions WHERE CustomerId = ${userId} OR ProviderId = ${userId}`;
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
