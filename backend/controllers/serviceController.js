const db = require('../config/db');
const { uid } = require('../utils/helpers');

exports.getAll = async (req, res) => {
    try {
        const { category, subCategory, providerId, page, limit, tags } = req.query;
        let queryText = `
            SELECT s.*, u.Name AS ProviderName 
            FROM Services s
            LEFT JOIN Users u ON s.ProviderId = u.Id
            WHERE s.Active = true
        `;
        const params = [];
        let pIndex = 1;

        if (category) {
            queryText += ` AND s.Category = $${pIndex++}`;
            params.push(category);
        }
        if (subCategory) {
            queryText += ` AND s.SubCategory = $${pIndex++}`;
            params.push(subCategory);
        }
        if (providerId) {
            queryText += ` AND s.ProviderId = $${pIndex++}`;
            params.push(providerId);
        }
        if (tags) {
            queryText += ` AND s.Tags LIKE $${pIndex++}`;
            params.push(`%${tags}%`);
        }

        queryText += ` ORDER BY s.CreatedAt DESC`;

        let total = 0;
        if (page && limit) {
            const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS countQuery`;
            const countResult = await db.query(countQuery, params);
            total = parseInt(countResult.recordset[0].count);

            queryText += ` LIMIT $${pIndex++} OFFSET $${pIndex++}`;
            params.push(parseInt(limit));
            params.push((parseInt(page) - 1) * parseInt(limit));
        }

        const result = await db.query(queryText, params);
        const services = result.recordset.map(s => ({
            id: s.id, providerId: s.providerid, providerName: s.providername,
            category: s.category, subCategory: s.subcategory, name: s.name, description: s.description,
            price: s.price, priceMax: s.pricemax, unit: s.unit, image: s.image, location: s.location,
            active: s.active, rating: s.rating, reviewCount: s.reviewcount,
            tags: safeJSONParse(s.tags, []),
            gallery: safeJSONParse(s.gallery, []),
            createdAt: s.createdat
        }));
        
        if (page && limit) {
            res.json({ data: services, total, page: parseInt(page), limit: parseInt(limit) });
        } else {
            res.json(services);
        }
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getById = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.Name AS ProviderName, u.Phone AS ProviderPhone,
                   pp.Bio, pp.Bank, pp.Location AS ProviderLocation
            FROM Services s
            LEFT JOIN Users u ON s.ProviderId = u.Id
            LEFT JOIN ProviderProfiles pp ON pp.UserId = u.Id
            WHERE s.Id = $1`, [req.params.id]);
        
        if (!result.recordset.length) return res.status(404).json({ error: 'Service not found' });
        const s = result.recordset[0];
        res.json({
            id: s.id, providerId: s.providerid, providerName: s.providername,
            providerPhone: s.providerphone, providerBio: s.bio,
            category: s.category, subCategory: s.subcategory, name: s.name, description: s.description,
            price: s.price, priceMax: s.pricemax, unit: s.unit, image: s.image, location: s.location,
            active: s.active, rating: s.rating, reviewCount: s.reviewcount,
            tags: safeJSONParse(s.tags, []),
            gallery: safeJSONParse(s.gallery, []),
            createdAt: s.createdat
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.create = async (req, res) => {
    const { category, subCategory, name, description, price, priceMax, unit, image, location, tags, gallery } = req.body;
    if (!category || !name || !price) return res.status(400).json({ error: 'Thiếu thông tin dịch vụ.' });
    try {
        const id = 'SVC_' + uid();
        const tagsStr = JSON.stringify(tags || []);
        const galleryStr = gallery && gallery.length ? JSON.stringify(gallery) : null;
        await db.query(
            `INSERT INTO Services (Id, ProviderId, Category, SubCategory, Name, Description, Price, PriceMax, Unit, Image, Location, Tags, Gallery)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [id, req.user.userId, category, subCategory || null, name, description || null, parseFloat(price), priceMax ? parseFloat(priceMax) : null, unit || 'buổi', image || null, location || null, tagsStr, galleryStr]
        );
        res.json({ id, message: 'Tạo dịch vụ thành công!' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.update = async (req, res) => {
    const { name, subCategory, description, price, priceMax, unit, image, location, tags, gallery, active } = req.body;
    try {
        const check = await db.query('SELECT ProviderId FROM Services WHERE Id = $1', [req.params.id]);
        if (!check.recordset.length) return res.status(404).json({ error: 'Service not found' });
        if (check.recordset[0].providerid !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

        const tagsStr = JSON.stringify(tags || []);
        const galleryStr = gallery && gallery.length ? JSON.stringify(gallery) : null;
        
        await db.query(
            `UPDATE Services 
             SET Name=$1, SubCategory=$2, Description=$3, Price=$4, PriceMax=$5, Unit=$6, Image=$7, Location=$8, Tags=$9, Gallery=$10, Active=$11, UpdatedAt=CURRENT_TIMESTAMP
             WHERE Id=$12`,
            [name, subCategory || null, description || null, parseFloat(price), priceMax ? parseFloat(priceMax) : null, unit || 'buổi', image || null, location || null, tagsStr, galleryStr, active !== false, req.params.id]
        );
        res.json({ message: 'Cập nhật thành công!' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.toggleActive = async (req, res) => {
    try {
        const check = await db.query('SELECT ProviderId, Active FROM Services WHERE Id = $1', [req.params.id]);
        if (!check.recordset.length) return res.status(404).json({ error: 'Service not found' });
        if (check.recordset[0].providerid !== req.user.userId) return res.status(403).json({ error: 'Không có quyền.' });
        
        const currentActive = check.recordset[0].active;
        const newActive = !currentActive;
        await db.query('UPDATE Services SET Active=$1, UpdatedAt=CURRENT_TIMESTAMP WHERE Id=$2', [newActive, req.params.id]);
        res.json({ success: true, active: newActive });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

const safeJSONParse = (data, defaultVal = []) => {
    if (!data) return defaultVal;
    if (typeof data !== 'string') return data;
    try { return JSON.parse(data); } catch { return defaultVal; }
};

exports.getProviderServices = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.Name AS ProviderName FROM Services s
            LEFT JOIN Users u ON s.ProviderId = u.Id
            WHERE s.ProviderId = $1
            ORDER BY s.CreatedAt DESC`, [req.user.userId]);
            
        const services = result.recordset.map(s => ({
            id: s.id, providerId: s.providerid, providerName: s.providername,
            category: s.category, subCategory: s.subcategory, name: s.name, description: s.description,
            price: s.price, priceMax: s.pricemax, unit: s.unit, image: s.image, location: s.location,
            active: s.active === 1 || s.active === true,
            rating: s.rating, reviewCount: s.reviewcount,
            tags: safeJSONParse(s.tags, []),
            gallery: safeJSONParse(s.gallery, []),
            createdAt: s.createdat
        }));
        res.json(services);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.delete = async (req, res) => {
    try {
        const check = await db.query('SELECT ProviderId FROM Services WHERE Id = $1', [req.params.id]);
        if (!check.recordset.length) return res.status(404).json({ error: 'Service not found' });
        if (check.recordset[0].providerid !== req.user.userId) return res.status(403).json({ error: 'Không có quyền.' });
        await db.query('UPDATE Services SET Active=false, UpdatedAt=CURRENT_TIMESTAMP WHERE Id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getAodaiLinks = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.Id, s.Name, s.Image, s.Description, s.Location, s.ProviderId
            FROM TrapAodaiLinks t
            JOIN Services s ON s.Id = t.AodaiId
            WHERE t.TrapId = $1 AND s.Active = true
            ORDER BY s.Name`, [req.params.id]
        );
        const items = result.recordset.map(s => ({
            id: s.id,
            name: s.name,
            image: s.image,
            description: s.description,
            location: s.location,
            providerId: s.providerid
        }));
        res.json(items);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.updateAodaiLinks = async (req, res) => {
    const { aodaiIds } = req.body;
    if (!Array.isArray(aodaiIds)) return res.status(400).json({ error: 'aodaiIds must be an array' });
    try {
        const check = await db.query('SELECT ProviderId FROM Services WHERE Id = $1', [req.params.id]);
        if (!check.recordset.length) return res.status(404).json({ error: 'Service not found' });
        const row = check.recordset[0];
        if (row.providerid !== req.user.userId) return res.status(403).json({ error: 'Không có quyền.' });
        
        await db.query('DELETE FROM TrapAodaiLinks WHERE TrapId = $1', [req.params.id]);
        for (const aodaiId of aodaiIds) {
            const linkId = 'LNK_' + uid();
            await db.query('INSERT INTO TrapAodaiLinks (Id, TrapId, AodaiId) VALUES ($1, $2, $3)', [linkId, req.params.id, aodaiId]);
        }
        res.json({ success: true, linked: aodaiIds.length });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};
