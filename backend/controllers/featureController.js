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
