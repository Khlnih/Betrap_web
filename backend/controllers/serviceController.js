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
            price: s.price, unit: s.unit, image: s.image, location: s.location,
            active: s.active, rating: s.rating, reviewCount: s.reviewcount,
            tags: s.tags ? (typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags) : [],
            gallery: s.gallery ? (typeof s.gallery === 'string' ? JSON.parse(s.gallery) : s.gallery) : [],
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
            price: s.price, unit: s.unit, image: s.image, location: s.location,
            active: s.active, rating: s.rating, reviewCount: s.reviewcount,
            tags: s.tags ? (typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags) : [],
            gallery: s.gallery ? (typeof s.gallery === 'string' ? JSON.parse(s.gallery) : s.gallery) : [],
            createdAt: s.createdat
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.create = async (req, res) => {
    const { category, subCategory, name, description, price, unit, image, location, tags, gallery } = req.body;
    if (!category || !name || !price) return res.status(400).json({ error: 'Thiếu thông tin dịch vụ.' });
    try {
        const id = 'SVC_' + uid();
        const tagsStr = JSON.stringify(tags || []);
        const galleryStr = gallery && gallery.length ? JSON.stringify(gallery) : null;
        await db.query(
            `INSERT INTO Services (Id, ProviderId, Category, SubCategory, Name, Description, Price, Unit, Image, Location, Tags, Gallery)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [id, req.user.userId, category, subCategory || null, name, description || null, parseFloat(price), unit || 'buổi', image || null, location || null, tagsStr, galleryStr]
        );
        res.json({ id, message: 'Tạo dịch vụ thành công!' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.update = async (req, res) => {
    const { name, subCategory, description, price, unit, image, location, tags, gallery, active } = req.body;
    try {
        const check = await db.query('SELECT ProviderId FROM Services WHERE Id = $1', [req.params.id]);
        if (!check.recordset.length) return res.status(404).json({ error: 'Service not found' });
        if (check.recordset[0].providerid !== req.user.userId) return res.status(403).json({ error: 'Không có quyền.' });
        
        const tagsStr = tags ? JSON.stringify(tags) : null;
        const galleryStr = gallery && gallery.length ? JSON.stringify(gallery) : null;
        const isActive = active !== undefined ? active : true;
        
        await db.query(
            `UPDATE Services SET Name=$1, SubCategory=$2, Description=$3, Price=$4, Unit=$5, Image=$6,
             Location=$7, Tags=$8, Gallery=$9, Active=$10, UpdatedAt=CURRENT_TIMESTAMP
             WHERE Id=$11`,
            [name, subCategory || null, description || null, parseFloat(price), unit || 'buổi', image || null, location || null, tagsStr, galleryStr, isActive, req.params.id]
        );
        res.json({ success: true });
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
            price: s.price, unit: s.unit, image: s.image, location: s.location,
            active: s.active === 1 || s.active === true,
            rating: s.rating, reviewCount: s.reviewcount,
            tags: s.tags ? (typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags) : [],
            gallery: s.gallery ? (typeof s.gallery === 'string' ? JSON.parse(s.gallery) : s.gallery) : [],
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
