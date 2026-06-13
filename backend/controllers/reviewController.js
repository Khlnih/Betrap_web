const db = require('../config/db');
const { uid } = require('../utils/helpers');

exports.getByServiceId = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.*, u.Name AS CustomerName, u.Avatar AS CustomerAvatar
            FROM Reviews r LEFT JOIN Users u ON r.CustomerId = u.Id
            WHERE r.ServiceId=$1 ORDER BY r.CreatedAt DESC`, [req.params.id]);
            
        res.json(result.recordset.map(r => ({
            id: r.id, serviceId: r.serviceid, customerId: r.customerid,
            customerName: r.customername, customerAvatar: r.customeravatar,
            transactionId: r.transactionid, rating: r.rating,
            comment: r.comment, createdAt: r.createdat,
            providerReply: r.providerreply, repliedAt: r.repliedat
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.create = async (req, res) => {
    const { serviceId, transactionId, rating, comment } = req.body;
    if (!serviceId || !transactionId || !rating) return res.status(400).json({ error: 'Thiếu thông tin đánh giá.' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating phải từ 1 đến 5.' });
    try {
        const exist = await db.query('SELECT Id FROM Reviews WHERE TransactionId=$1', [transactionId]);
        if (exist.recordset.length) return res.status(400).json({ error: 'Bạn đã đánh giá đơn hàng này rồi.' });
        
        const txn = await db.query('SELECT CustomerId FROM Transactions WHERE Id=$1 AND Status=$2', [transactionId, 'done']);
        if (!txn.recordset.length) return res.status(400).json({ error: 'Đơn hàng chưa hoàn thành hoặc không tồn tại.' });
        if (txn.recordset[0].customerid !== req.user.userId) return res.status(403).json({ error: 'Không có quyền.' });

        const id = 'REV_' + uid();
        await db.query(
            `INSERT INTO Reviews (Id, ServiceId, CustomerId, TransactionId, Rating, Comment)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, serviceId, req.user.userId, transactionId, rating, comment || null]
        );
        
        const avg = await db.query('SELECT AVG(CAST(Rating AS FLOAT)) AS Avg, COUNT(*) AS Cnt FROM Reviews WHERE ServiceId=$1', [serviceId]);
        await db.query('UPDATE Services SET Rating=$1, ReviewCount=$2, UpdatedAt=CURRENT_TIMESTAMP WHERE Id=$3', [avg.recordset[0].avg, avg.recordset[0].cnt, serviceId]);
        
        res.json({ id, message: 'Đánh giá thành công!' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.checkExists = async (req, res) => {
    try {
        const r = await db.query('SELECT Id FROM Reviews WHERE TransactionId=$1', [req.params.transactionId]);
        res.json({ hasReview: r.recordset.length > 0 });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

exports.getByProvider = async (req, res) => {
    if (req.user.userId !== req.params.providerId && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Forbidden' });
    try {
        const result = await db.query(`
            SELECT r.*, u.Name AS CustomerName, u.Avatar AS CustomerAvatar,
                   s.Name AS ServiceName
            FROM Reviews r
            LEFT JOIN Users u ON r.CustomerId = u.Id
            LEFT JOIN Services s ON r.ServiceId = s.Id
            WHERE s.ProviderId = $1
            ORDER BY r.CreatedAt DESC`, [req.params.providerId]);
            
        res.json(result.recordset.map(r => ({
            id: r.id, serviceId: r.serviceid, serviceName: r.servicename,
            customerId: r.customerid, customerName: r.customername, customerAvatar: r.customeravatar,
            transactionId: r.transactionid, rating: r.rating,
            comment: r.comment, createdAt: r.createdat,
            providerReply: r.providerreply, repliedAt: r.repliedat
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.reply = async (req, res) => {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: 'Nội dung trả lời không được để trống.' });
    
    try {
        const check = await db.query(`
            SELECT r.Id, s.ProviderId 
            FROM Reviews r
            JOIN Services s ON r.ServiceId = s.Id
            WHERE r.Id = $1`, [req.params.id]);
            
        if (!check.recordset.length) return res.status(404).json({ error: 'Không tìm thấy đánh giá.' });
        if (check.recordset[0].providerid !== req.user.userId) return res.status(403).json({ error: 'Không có quyền.' });
        
        await db.query(
            'UPDATE Reviews SET ProviderReply = $1, RepliedAt = CURRENT_TIMESTAMP WHERE Id = $2',
            [reply, req.params.id]
        );
            
        res.json({ success: true, message: 'Đã trả lời đánh giá.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};
