const db = require('../config/db');
const { uid } = require('../utils/helpers');

exports.getAll = async (req, res) => {
    try {
        const { year, month, limit, offset, all, search } = req.query;
        let query = `SELECT Id, Title, Slug, CoverImage, Published, PublishedAt, CreatedAt 
                     FROM BlogPosts WHERE 1=1`;
        const params = [];
        if (year && month) {
            params.push(parseInt(year), parseInt(month));
            query += ` AND EXTRACT(YEAR FROM PublishedAt) = $${params.length-1} AND EXTRACT(MONTH FROM PublishedAt) = $${params.length}`;
        }
        if (all !== 'true') {
            query += ` AND Published=true`;
        }
        if (search) {
            params.push(`%${search.replace(/[%_]/g, '')}%`);
            query += ` AND Title ILIKE $${params.length}`;
        }
        query += ` ORDER BY CreatedAt DESC`;
        if (limit) query += ` LIMIT ${parseInt(limit)}`;
        if (offset) query += ` OFFSET ${parseInt(offset)}`;
        
        const result = await db.query(query, params);
        const mapped = result.recordset.map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            coverImage: p.coverimage,
            published: p.published,
            publishedAt: p.publishedat,
            createdAt: p.createdat
        }));
        res.json(mapped);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getMonths = async (req, res) => {
    try {
        const { offset = 0 } = req.query;
        const result = await db.query(`
            SELECT DISTINCT EXTRACT(YEAR FROM PublishedAt) as year, EXTRACT(MONTH FROM PublishedAt) as month
            FROM BlogPosts WHERE Published=true AND PublishedAt IS NOT NULL
            ORDER BY year DESC, month DESC
            LIMIT 5 OFFSET $1`, [parseInt(offset)]);
        res.json(result.recordset.map(r => ({ year: r.year, month: r.month })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getById = async (req, res) => {
    try {
        let isSlug = !req.params.id.startsWith('POST_');
        let postRes;
        if (isSlug) {
            postRes = await db.query('SELECT * FROM BlogPosts WHERE Slug=$1', [req.params.id]);
        } else {
            postRes = await db.query('SELECT * FROM BlogPosts WHERE Id=$1', [req.params.id]);
        }
        
        if (!postRes.recordset.length) return res.status(404).json({ error: 'Blog not found' });
        const p = postRes.recordset[0];
        const mappedPost = {
            id: p.id,
            title: p.title,
            slug: p.slug,
            coverImage: p.coverimage,
            published: p.published,
            publishedAt: p.publishedat,
            createdAt: p.createdat
        };
        const blocksRes = await db.query('SELECT * FROM BlogBlocks WHERE PostId=$1 ORDER BY Position ASC', [p.id]);
        mappedPost.blocks = blocksRes.recordset.map(b => ({
            id: b.id,
            type: b.type,
            content: b.content,
            position: b.position
        }));
        res.json(mappedPost);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.create = async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Missing title' });
    try {
        const id = 'POST_' + uid();
        const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\\w-]+/g, '') + '-' + uid().slice(0, 4);
        await db.query(
            'INSERT INTO BlogPosts (Id, AuthorId, Title, Slug) VALUES ($1, $2, $3, $4)',
            [id, req.user.userId, title, slug]
        );
        res.json({ id, slug, message: 'Created successfully' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.update = async (req, res) => {
    const { title, coverImage, published } = req.body;
    try {
        let updates = [];
        let params = [];
        let pIndex = 1;
        
        if (title !== undefined) {
            updates.push(`Title=$${pIndex++}`);
            params.push(title);
        }
        if (coverImage !== undefined) {
            updates.push(`CoverImage=$${pIndex++}`);
            params.push(coverImage ? coverImage : null);
        }
        if (published !== undefined) {
            updates.push(`Published=$${pIndex++}`);
            params.push(published ? true : false);
            if (published) {
                updates.push(`PublishedAt=COALESCE(PublishedAt, CURRENT_TIMESTAMP)`);
            }
        }
        
        if (updates.length > 0) {
            updates.push(`UpdatedAt=CURRENT_TIMESTAMP`);
            params.push(req.params.id);
            const query = `UPDATE BlogPosts SET ${updates.join(', ')} WHERE Id=$${pIndex}`;
            await db.query(query, params);
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.delete = async (req, res) => {
    try {
        await db.query('DELETE FROM BlogPosts WHERE Id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.addBlock = async (req, res) => {
    const { type, content, position } = req.body;
    if (!type) return res.status(400).json({ error: 'Missing block type' });
    try {
        const blockId = 'BLK_' + uid();
        const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
        await db.query(
            'INSERT INTO BlogBlocks (Id, PostId, Type, Content, Position) VALUES ($1, $2, $3, $4, $5)',
            [blockId, req.params.id, type, contentStr, position || 0]
        );
        res.json({ id: blockId, message: 'Block added' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.updateBlock = async (req, res) => {
    const { content, position } = req.body;
    try {
        let updates = [];
        let params = [];
        let pIndex = 1;
        
        if (content !== undefined) {
            updates.push(`Content=$${pIndex++}`);
            params.push(typeof content === 'object' ? JSON.stringify(content) : content);
        }
        if (position !== undefined) {
            updates.push(`Position=$${pIndex++}`);
            params.push(position);
        }
        
        if (updates.length > 0) {
            params.push(req.params.blockId);
            params.push(req.params.id);
            const query = `UPDATE BlogBlocks SET ${updates.join(', ')} WHERE Id=$${pIndex} AND PostId=$${pIndex+1}`;
            await db.query(query, params);
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.deleteBlock = async (req, res) => {
    try {
        await db.query('DELETE FROM BlogBlocks WHERE Id=$1 AND PostId=$2', [req.params.blockId, req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.reorderBlocks = async (req, res) => {
    const { blocks } = req.body;
    if (!Array.isArray(blocks)) return res.status(400).json({ error: 'Invalid data' });
    try {
        for (let b of blocks) {
            await db.query('UPDATE BlogBlocks SET Position=$1 WHERE Id=$2 AND PostId=$3', [b.position, b.id, req.params.id]);
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};
