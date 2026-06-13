const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { uid } = require('../utils/helpers');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Vui lòng cung cấp email và password.' });
    try {
        const result = await db.query('SELECT * FROM Users WHERE Email = $1', [email.toLowerCase()]);
        if (!result.recordset.length) return res.status(401).json({ error: 'Email không tồn tại.' });
        const user = result.recordset[0];

        // Verify bcrypt password (support legacy plain text)
        let valid = false;
        if (user.passwordhash && user.passwordhash.startsWith('$2')) {
            valid = await bcrypt.compare(password, user.passwordhash);
        } else {
            valid = (password === user.passwordhash);
        }
        if (!valid) return res.status(401).json({ error: 'Mật khẩu không đúng.' });

        let profile = {};
        if (user.role === 'customer') {
            const p = await db.query('SELECT * FROM CustomerProfiles WHERE UserId = $1', [user.id]);
            if (p.recordset.length) profile = p.recordset[0];
        } else {
            const p = await db.query('SELECT * FROM ProviderProfiles WHERE UserId = $1', [user.id]);
            if (p.recordset.length) profile = p.recordset[0];
        }

        const session = {
            userId: user.id, role: user.role, name: user.name,
            avatar: user.avatar, email: user.email, phone: user.phone,
            verified: user.verified,
            location: profile.location || '',
            bio: profile.bio || '',
            bank: profile.bank || '',
            weddingDate: profile.weddingdate ? new Date(profile.weddingdate).toISOString().split('T')[0] : ''
        };
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ session, token });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.me = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Users WHERE Id = $1', [req.user.userId]);
        if (!result.recordset.length) return res.status(404).json({ error: 'User not found' });
        const user = result.recordset[0];

        let profile = {};
        if (user.role === 'customer') {
            const p = await db.query('SELECT * FROM CustomerProfiles WHERE UserId = $1', [user.id]);
            if (p.recordset.length) profile = p.recordset[0];
        } else {
            const p = await db.query('SELECT * FROM ProviderProfiles WHERE UserId = $1', [user.id]);
            if (p.recordset.length) profile = p.recordset[0];
        }

        const session = {
            userId: user.id, role: user.role, name: user.name,
            avatar: user.avatar, email: user.email, phone: user.phone,
            verified: user.verified,
            location: profile.location || '',
            bio: profile.bio || '',
            bank: profile.bank || '',
            weddingDate: profile.weddingdate ? new Date(profile.weddingdate).toISOString().split('T')[0] : ''
        };
        res.json({ session });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.register = async (req, res) => {
    const { name, email, password, role, phone, location } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin.' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Email không đúng định dạng.' });
    const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passRegex.test(password)) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự, gồm 1 chữ in hoa và 1 ký tự đặc biệt.' });
    if (role === 'provider') {
        const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
        if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ.' });
    }
    try {
        const check = await db.query('SELECT Id FROM Users WHERE Email = $1', [email.toLowerCase()]);
        if (check.recordset.length) return res.status(400).json({ error: 'Email đã tồn tại.' });
        const id = 'U_' + uid();
        const avatar = name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
        const hash = await bcrypt.hash(password, 10);
        
        await db.query(
            'INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Phone, Avatar, Verified) VALUES ($1, $2, $3, $4, $5, $6, $7, false)',
            [id, email.toLowerCase(), hash, name, role, phone || null, avatar]
        );
        
        if (role === 'customer') {
            await db.query('INSERT INTO CustomerProfiles (UserId, Location) VALUES ($1, $2)', [id, location || null]);
        } else {
            await db.query('INSERT INTO ProviderProfiles (UserId, Location) VALUES ($1, $2)', [id, location || null]);
        }
        
        const session = { userId: id, role, name, avatar, email: email.toLowerCase(), phone: phone||'', location: location||'', verified: false };
        const token = jwt.sign({ userId: id, role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ session, token });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.updateProfile = async (req, res) => {
    const { name, phone, location, bio, bank, weddingDate } = req.body;
    const { userId, role } = req.user;
    try {
        await db.query('UPDATE Users SET Name=$1, Phone=$2, UpdatedAt=CURRENT_TIMESTAMP WHERE Id=$3', [name, phone || null, userId]);
        if (role === 'customer') {
            const c = await db.query('SELECT UserId FROM CustomerProfiles WHERE UserId=$1', [userId]);
            if (c.recordset.length) {
                await db.query('UPDATE CustomerProfiles SET Location=$1, WeddingDate=$2 WHERE UserId=$3', [location || null, weddingDate || null, userId]);
            } else {
                await db.query('INSERT INTO CustomerProfiles (UserId, Location, WeddingDate) VALUES ($1, $2, $3)', [userId, location || null, weddingDate || null]);
            }
        } else {
            const p = await db.query('SELECT UserId FROM ProviderProfiles WHERE UserId=$1', [userId]);
            if (p.recordset.length) {
                await db.query('UPDATE ProviderProfiles SET Location=$1, Bio=$2, Bank=$3 WHERE UserId=$4', [location || null, bio || null, bank || null, userId]);
            } else {
                await db.query('INSERT INTO ProviderProfiles (UserId, Location, Bio, Bank) VALUES ($1, $2, $3, $4)', [userId, location || null, bio || null, bank || null]);
            }
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.updatePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Thiếu thông tin.' });
    try {
        const r = await db.query('SELECT PasswordHash FROM Users WHERE Id=$1', [req.user.userId]);
        const user = r.recordset[0];
        
        let valid = false;
        if (user.passwordhash && user.passwordhash.startsWith('$2')) {
            valid = await bcrypt.compare(oldPassword, user.passwordhash);
        } else {
            valid = (oldPassword === user.passwordhash);
        }
        
        if (!valid) return res.status(400).json({ error: 'Mật khẩu cũ không đúng.' });
        
        const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
        if (!passRegex.test(newPassword)) return res.status(400).json({ error: 'Mật khẩu mới không đủ mạnh.' });
        
        const hash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE Users SET PasswordHash=$1, UpdatedAt=CURRENT_TIMESTAMP WHERE Id=$2', [hash, req.user.userId]);
        res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};
