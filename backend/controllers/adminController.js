const db = require('../config/db');
const bcrypt = require('bcrypt');
const { uid } = require('../utils/helpers');

exports.verifyProvider = async (req, res) => {
    try {
        await db.query('UPDATE Users SET Verified = true WHERE Id = $1 AND Role = $2', [req.params.id, 'provider']);
        res.json({ success: true, message: 'Provider has been verified.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getTransactions = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.*, u.Name AS CustomerName, u.Phone AS CustomerPhone,
                   p.Name AS ProviderName,
                   s.Category AS ServiceCategory
            FROM Transactions t
            LEFT JOIN Users u ON t.CustomerId = u.Id
            LEFT JOIN Users p ON t.ProviderId = p.Id
            LEFT JOIN Services s ON t.ServiceId = s.Id
            ORDER BY t.CreatedAt DESC
        `);
        res.json(result.recordset.map(t => ({
            id: t.id, customerId: t.customerid, providerId: t.providerid,
            serviceId: t.serviceid, serviceName: t.servicename,
            serviceCategory: t.servicecategory || null,
            price: t.price,
            date: t.date ? (t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date) : null,
            time: t.time, address: t.address, note: t.note, status: t.status,
            cancelReason: t.cancelreason || null,
            paymentMethod: t.paymentmethod, paymentStatus: t.paymentstatus,
            customerName: t.customername || null,
            customerPhone: t.customerphone || null,
            providerName: t.providername || null,
            createdAt: t.createdat, updatedAt: t.updatedat
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getGlobalStats = async (req, res) => {
    try {
        const [txns, revCount, avgRat] = await Promise.all([
            db.query("SELECT COUNT(*) AS TotalDone FROM Transactions WHERE Status='done'"),
            db.query("SELECT COUNT(*) AS TotalReviews FROM Reviews"),
            db.query("SELECT AVG(CAST(Rating AS FLOAT)) AS AvgRating FROM Reviews")
        ]);
        res.json({
            doneTxns: parseInt(txns.recordset[0].totaldone) || 0,
            totalReviews: parseInt(revCount.recordset[0].totalreviews) || 0,
            avgRating: parseFloat(avgRat.recordset[0].avgrating) || 5
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getCustomerStats = async (req, res) => {
    const uid = req.user.userId;
    try {
        const r = await db.query(`
            SELECT COUNT(*) AS Total,
                   SUM(CASE WHEN Status='pending'   THEN 1 ELSE 0 END) AS Pending,
                   SUM(CASE WHEN Status='confirmed' THEN 1 ELSE 0 END) AS Confirmed,
                   SUM(CASE WHEN Status='done'      THEN 1 ELSE 0 END) AS Done,
                   SUM(CASE WHEN Status='cancelled' THEN 1 ELSE 0 END) AS Cancelled
            FROM Transactions WHERE CustomerId=$1`, [uid]);
            
        const s = r.recordset[0];
        res.json({ 
            total: parseInt(s.total)||0, 
            pending: parseInt(s.pending)||0, 
            confirmed: parseInt(s.confirmed)||0, 
            done: parseInt(s.done)||0, 
            cancelled: parseInt(s.cancelled)||0 
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getProviderStats = async (req, res) => {
    const uid = req.user.userId;
    try {
        const [orders, monthly, svcs] = await Promise.all([
            db.query(`SELECT COUNT(*) AS Total,
                SUM(CASE WHEN Status='pending' THEN 1 ELSE 0 END) AS Pending,
                SUM(CASE WHEN Status='done'    THEN 1 ELSE 0 END) AS Done,
                SUM(CASE WHEN PaymentStatus='paid' THEN Price ELSE 0 END) AS Revenue
                FROM Transactions WHERE ProviderId=$1`, [uid]),
            db.query(`SELECT TO_CHAR(CreatedAt,'YYYY-MM') AS Month,
                SUM(CASE WHEN PaymentStatus='paid' THEN Price ELSE 0 END) AS Revenue,
                COUNT(*) AS Orders
                FROM Transactions WHERE ProviderId=$1
                GROUP BY TO_CHAR(CreatedAt,'YYYY-MM') ORDER BY Month DESC`, [uid]),
            db.query(`SELECT COUNT(*) AS Total FROM Services WHERE ProviderId=$1 AND Active=true`, [uid])
        ]);
        
        const s = orders.recordset[0];
        res.json({
            orders: parseInt(s.total)||0, 
            pending: parseInt(s.pending)||0, 
            done: parseInt(s.done)||0, 
            revenue: parseFloat(s.revenue)||0,
            services: parseInt(svcs.recordset[0].total)||0,
            monthly: monthly.recordset.map(m => ({ 
                month: m.month, 
                revenue: parseFloat(m.revenue)||0, 
                orders: parseInt(m.orders)||0 
            }))
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getAdminStats = async (req, res) => {
    try {
        const txnStats = await db.query(`
            SELECT COUNT(*) AS Total,
                   SUM(CASE WHEN Status='pending'   THEN 1 ELSE 0 END) AS Pending,
                   SUM(CASE WHEN Status='confirmed' THEN 1 ELSE 0 END) AS Confirmed,
                   SUM(CASE WHEN Status='done'      THEN 1 ELSE 0 END) AS Done,
                   SUM(CASE WHEN Status='cancelled' THEN 1 ELSE 0 END) AS Cancelled
            FROM Transactions`);
        
        const revenue = await db.query(`
            SELECT TO_CHAR(CreatedAt, 'YYYY-MM') as month, 
                   SUM(Price) as total_revenue
            FROM Transactions 
            WHERE Status = 'done' 
              AND CreatedAt >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY TO_CHAR(CreatedAt, 'YYYY-MM')
            ORDER BY month ASC`);
            
        const s = txnStats.recordset[0] || { total:0, pending:0, confirmed:0, done:0, cancelled:0 };
        res.json({
            transactions: {
                Total: parseInt(s.total), Pending: parseInt(s.pending), 
                Confirmed: parseInt(s.confirmed), Done: parseInt(s.done), Cancelled: parseInt(s.cancelled)
            },
            revenue: revenue.recordset.map(r => ({ month: r.month, amount: parseFloat(r.total_revenue) || 0 }))
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

// ── QUẢN LÝ NGƯỜI DÙNG ──
exports.getUsers = async (req, res) => {
    try {
        const result = await db.query(`SELECT Id, Email, Name, Role, Phone, Verified, CreatedAt FROM Users ORDER BY CreatedAt DESC`);
        res.json(result.recordset);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.createProvider = async (req, res) => {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Vui lòng điền đủ thông tin.' });
    try {
        const check = await db.query('SELECT Id FROM Users WHERE Email = $1', [email.toLowerCase()]);
        if (check.recordset.length) return res.status(400).json({ error: 'Email đã tồn tại.' });
        
        const id = 'U_' + uid();
        const avatar = name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
        const hash = await bcrypt.hash(password, 10);
        
        await db.query(
            'INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Phone, Avatar, Verified) VALUES ($1, $2, $3, $4, $5, $6, $7, true)',
            [id, email.toLowerCase(), hash, name, 'provider', phone || null, avatar]
        );
        await db.query('INSERT INTO ProviderProfiles (UserId) VALUES ($1)', [id]);
        
        res.json({ success: true, id });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.toggleUser = async (req, res) => {
    try {
        const result = await db.query('UPDATE Users SET Verified = NOT Verified, UpdatedAt=CURRENT_TIMESTAMP WHERE Id = $1 RETURNING Verified', [req.params.id]);
        if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, verified: result.recordset[0].verified });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

// ── QUẢN LÝ DỊCH VỤ ──
exports.getServices = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.Name AS ProviderName, u.Verified AS ProviderVerified
            FROM Services s
            LEFT JOIN Users u ON s.ProviderId = u.Id
            ORDER BY s.CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.toggleService = async (req, res) => {
    try {
        const result = await db.query('UPDATE Services SET Active = NOT Active, UpdatedAt=CURRENT_TIMESTAMP WHERE Id = $1 RETURNING Active', [req.params.id]);
        if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, active: result.recordset[0].active });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};
