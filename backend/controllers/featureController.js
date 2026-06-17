const db = require('../config/db');
const { uid } = require('../utils/helpers');

const safeJSONParse = (data, defaultVal = []) => {
    if (!data) return defaultVal;
    if (typeof data !== 'string') return data;
    try { return JSON.parse(data); } catch { return defaultVal; }
};

exports.getFavorites = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.Name AS ProviderName FROM Favorites f
            JOIN Services s ON s.Id=f.ServiceId
            LEFT JOIN Users u ON u.Id=s.ProviderId
            WHERE f.UserId=$1 AND s.Active=true ORDER BY f.CreatedAt DESC`, [req.user.userId]
        );
        res.json(result.recordset.map(s => ({
            id: s.id, providerId: s.providerid, providerName: s.providername,
            category: s.category, name: s.name, description: s.description,
            price: s.price, unit: s.unit, image: s.image, location: s.location,
            rating: s.rating, reviewCount: s.reviewcount,
            tags: safeJSONParse(s.tags, [])
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.toggleFavorite = async (req, res) => {
    const { serviceId } = req.params;
    const userId = req.user.userId;
    try {
        const exist = await db.query('SELECT UserId FROM Favorites WHERE UserId=$1 AND ServiceId=$2', [userId, serviceId]);
        if (exist.recordset.length) {
            await db.query('DELETE FROM Favorites WHERE UserId=$1 AND ServiceId=$2', [userId, serviceId]);
            res.json({ favorited: false });
        } else {
            await db.query('INSERT INTO Favorites (UserId, ServiceId) VALUES ($1, $2)', [userId, serviceId]);
            res.json({ favorited: true });
        }
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.checkFavorite = async (req, res) => {
    try {
        const r = await db.query('SELECT UserId FROM Favorites WHERE UserId=$1 AND ServiceId=$2', [req.user.userId, req.params.serviceId]);
        res.json({ favorited: r.recordset.length > 0 });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

exports.createConsultation = async (req, res) => {
    const { serviceId, date, time, address, note } = req.body;
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    
    if (selectedDate < today) return res.status(400).json({ error: 'Ngày hẹn phải từ hôm nay trở đi.' });
    if (!address || address.length < 5) return res.status(400).json({ error: 'Vui lòng nhập địa chỉ cụ thể.' });
    
    try {
        let providerId = null;
        let svcName = 'Tư Vấn Chung';
        let sId = null;
        
        if (serviceId) {
            const svcRes = await db.query('SELECT * FROM Services WHERE Id=$1 AND Active=true', [serviceId]);
            if (!svcRes.recordset.length) return res.status(404).json({ error: 'Dịch vụ không tồn tại.' });
            const svc = svcRes.recordset[0];
            providerId = svc.providerid;
            svcName = svc.name;
            sId = serviceId;
        }
        
        const id = 'CON_' + uid().toUpperCase();
        await db.query(`
            INSERT INTO Consultations (Id, CustomerId, ProviderId, ServiceId, ServiceName, Date, Time, Address, Note)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, req.user.userId, providerId, sId, svcName, date, time, address, note || null]
        );
        res.json({ id });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

// ── LEADS (yêu cầu tư vấn công khai từ trang chủ) ──────────────────────────
const cleanPhone = (p) => (p || '').replace(/[\s.\-]/g, '');
const isPhone = (p) => /^(0\d{9}|(\+?84)\d{9})$/.test(cleanPhone(p));

// POST /api/leads  (PUBLIC — không cần đăng nhập)
exports.createLead = async (req, res) => {
    try {
        const b = req.body || {};
        const c = b.lienHe || {};
        const name = (c.hoTen || '').trim();
        const phone = cleanPhone(c.soDienThoai);

        if (!name) return res.status(400).json({ error: 'Vui lòng nhập họ tên.' });
        if (!isPhone(phone)) return res.status(400).json({ error: 'Số điện thoại chưa hợp lệ.' });

        const mt = b.mamTrap || null;
        const id = 'LEAD_' + uid().toUpperCase();
        
        let weddingDate = b.ngayAnHoi || null;
        if (weddingDate === 'undecided' || weddingDate === '') weddingDate = null;

        await db.query(`
            INSERT INTO Leads
              (Id, Name, Phone, Zalo, Email, Services, TrayCount, Trays, TrayNote,
               Style, Region, WeddingDate, Location, Budget, ContactTime, ContactChannel, RequestType)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
            [
                id, name, phone, (c.zalo || null), (c.email || null),
                JSON.stringify(b.services || []),
                mt ? (mt.soTrap != null ? String(mt.soTrap) : null) : null,
                JSON.stringify(mt ? (mt.cacTrap || []) : []),
                mt ? (mt.yeuCauRieng || null) : null,
                b.phongCach || null, b.khuVuc || null, weddingDate,
                b.diaDiem || null, b.nganSach || null,
                c.thoiGian || null, c.kenh || null, b.loaiYeuCau || 'day-du'
            ]
        );

        res.json({ id });
    } catch (err) {
        console.error('createLead error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/leads  (ADMIN — danh sách yêu cầu cho đội CSKH)
exports.getLeads = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Chỉ admin mới xem được danh sách yêu cầu.' });
        }
        // Đảm bảo bảng tồn tại (safety net nếu initDB chưa kịp chạy)
        await db.query(`
            CREATE TABLE IF NOT EXISTS Leads (
                Id             VARCHAR(50) PRIMARY KEY,
                Name           VARCHAR(200) NOT NULL,
                Phone          VARCHAR(30)  NOT NULL,
                Zalo           VARCHAR(30),
                Email          VARCHAR(150),
                Services       TEXT,
                TrayCount      VARCHAR(20),
                Trays          TEXT,
                TrayNote       TEXT,
                Style          VARCHAR(50),
                Region         VARCHAR(30),
                WeddingDate    VARCHAR(30),
                Location       VARCHAR(300),
                Budget         VARCHAR(50),
                ContactTime    VARCHAR(30),
                ContactChannel VARCHAR(30),
                RequestType    VARCHAR(30) DEFAULT 'day-du',
                Status         VARCHAR(20) DEFAULT 'new',
                CreatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UpdatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        const r = await db.query('SELECT * FROM leads ORDER BY createdat DESC LIMIT 500');
        const leads = r.recordset.map(row => ({
            ...row,
            services: safeJSONParse(row.services, []),
            trays: safeJSONParse(row.trays, []),
        }));
        res.json(leads);
    } catch (err) {
        console.error('getLeads error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};


// PUT /api/leads/:id/status  (ADMIN — đổi trạng thái yêu cầu)
exports.updateLeadStatus = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Chỉ admin mới được cập nhật.' });
        }
        const { status } = req.body || {};
        const allowed = ['new', 'contacted', 'quoted', 'won', 'lost'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
        }
        const r = await db.query('UPDATE Leads SET Status=$1 WHERE Id=$2', [status, req.params.id]);
        if (!r.rowCount) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });
        res.json({ id: req.params.id, status });
    } catch (err) {
        console.error('updateLeadStatus error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

