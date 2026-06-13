const db = require('../config/db');
const { uid } = require('../utils/helpers');

function mapTxn(t) {
    return {
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
        createdAt: t.createdat, updatedAt: t.updatedat
    };
}

exports.create = async (req, res) => {
    const { serviceId, date, time, address, note, paymentMethod } = req.body;
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    
    if (selectedDate < today) return res.status(400).json({ error: 'Ngày tổ chức phải từ hôm nay trở đi.' });
    if (!address || address.length < 10) return res.status(400).json({ error: 'Vui lòng nhập địa chỉ cụ thể (tối thiểu 10 ký tự).' });
    
    try {
        const svcRes = await db.query('SELECT * FROM Services WHERE Id=$1 AND Active=true', [serviceId]);
        if (!svcRes.recordset.length) return res.status(404).json({ error: 'Dịch vụ không tồn tại.' });
        
        const svc = svcRes.recordset[0];
        
        const dupCheck = await db.query(
            `SELECT Id FROM Transactions
             WHERE CustomerId=$1 AND ServiceId=$2 AND Date=$3 AND Status IN ('pending','confirmed')`,
            [req.user.userId, serviceId, date]
        );
        
        if (dupCheck.recordset.length) {
            return res.status(400).json({ error: 'Bạn đã đặt dịch vụ này vào ngày này rồi. Vui lòng chọn ngày khác.' });
        }
        
        const id = 'TXN_' + uid().toUpperCase();
        await db.query(
            `INSERT INTO Transactions (Id, CustomerId, ProviderId, ServiceId, ServiceName, Price, Date, Time, Address, Note, PaymentMethod)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [id, req.user.userId, svc.providerid, serviceId, svc.name, svc.price, date, time, address, note || null, paymentMethod || null]
        );
        res.json({ id });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getByUserId = async (req, res) => {
    if (req.user.userId !== req.params.userId && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Forbidden' });
        
    try {
        const result = await db.query(`
            SELECT t.*, u.Name AS CustomerName, u.Phone AS CustomerPhone,
                   s.Category AS ServiceCategory
            FROM Transactions t
            LEFT JOIN Users u ON t.CustomerId = u.Id
            LEFT JOIN Services s ON t.ServiceId = s.Id
            WHERE t.CustomerId=$1 OR t.ProviderId=$1
            ORDER BY t.CreatedAt DESC`, [req.params.userId]
        );
        res.json(result.recordset.map(mapTxn));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getById = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.*, u.Name AS CustomerName, u.Phone AS CustomerPhone,
                   s.Category AS ServiceCategory
            FROM Transactions t
            LEFT JOIN Users u ON t.CustomerId = u.Id
            LEFT JOIN Services s ON t.ServiceId = s.Id
            WHERE t.Id=$1`, [req.params.id]
        );
        if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
        
        const t = result.recordset[0];
        if (t.customerid !== req.user.userId && t.providerid !== req.user.userId && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Forbidden' });
            
        res.json(mapTxn(t));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.updateStatus = async (req, res) => {
    const { status, paymentMethod, paymentStatus, cancelReason } = req.body;
    const allowed = ['pending','confirmed','done','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
    
    if (status === 'cancelled' && req.user.role === 'provider' && !cancelReason?.trim())
        return res.status(400).json({ error: 'Vui lòng nhập lý do từ chối.' });
        
    try {
        const check = await db.query('SELECT CustomerId, ProviderId FROM Transactions WHERE Id=$1', [req.params.id]);
        if (!check.recordset.length) return res.status(404).json({ error: 'Not found' });
        
        const { customerid, providerid } = check.recordset[0];
        if (req.user.userId !== customerid && req.user.userId !== providerid && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Forbidden' });
            
        if (paymentMethod && paymentStatus) {
            await db.query(
                `UPDATE Transactions SET Status=$1, PaymentMethod=$2, PaymentStatus=$3, CancelReason=$4, UpdatedAt=CURRENT_TIMESTAMP WHERE Id=$5`,
                [status, paymentMethod, paymentStatus, cancelReason || null, req.params.id]
            );
        } else {
            await db.query(
                `UPDATE Transactions SET Status=$1, CancelReason=$2, UpdatedAt=CURRENT_TIMESTAMP WHERE Id=$3`,
                [status, cancelReason || null, req.params.id]
            );
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};
