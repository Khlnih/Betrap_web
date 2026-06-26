const db = require('../config/db');

// --- Public API ---
exports.recordVisit = async (req, res) => {
    try {
        const { urlCode, visitorId } = req.body;
        const userAgent = req.headers['user-agent'] || '';

        if (!urlCode || !visitorId) {
            return res.status(400).json({ error: 'Missing urlCode or visitorId' });
        }

        // 1. Find the link
        const linkResult = await db.query('SELECT Id FROM TrackingLinks WHERE UrlCode = $1', [urlCode]);
        if (linkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }
        const linkId = linkResult.rows[0].id;

        // 2. Check if this visitor already visited this link (optional, if we only want unique clicks in the table. 
        // But usually we log every click and aggregate unique visitors later. We'll log every event).
        // For strict unique counting without inflating the DB, we can insert only if not exists.
        const existingEvent = await db.query(
            'SELECT Id FROM TrackingEvents WHERE LinkId = $1 AND VisitorId = $2',
            [linkId, visitorId]
        );

        if (existingEvent.rows.length === 0) {
            const newEventId = 'ev_' + Date.now() + Math.floor(Math.random() * 1000);
            await db.query(
                'INSERT INTO TrackingEvents (Id, LinkId, VisitorId, UserAgent) VALUES ($1, $2, $3, $4)',
                [newEventId, linkId, visitorId, userAgent]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Tracking Visit Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// --- Admin APIs ---
exports.getLinksAdmin = async (req, res) => {
    try {
        // Fetch all links and count unique visitors
        const result = await db.query(`
            SELECT 
                L.Id, L.AppSource, L.UrlCode, L.TargetUrl, L.CreatedAt,
                COUNT(E.Id) as UniqueVisitors
            FROM TrackingLinks L
            LEFT JOIN TrackingEvents E ON L.Id = E.LinkId
            GROUP BY L.Id
            ORDER BY L.CreatedAt DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get Links Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.createLink = async (req, res) => {
    try {
        const { appSource, urlCode, targetUrl } = req.body;

        if (!appSource || !urlCode || !targetUrl) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if urlCode already exists
        const check = await db.query('SELECT Id FROM TrackingLinks WHERE UrlCode = $1', [urlCode]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Mã link (UrlCode) đã tồn tại' });
        }

        const newId = 'tr_' + Date.now();
        await db.query(
            'INSERT INTO TrackingLinks (Id, AppSource, UrlCode, TargetUrl) VALUES ($1, $2, $3, $4)',
            [newId, appSource, urlCode, targetUrl]
        );

        res.json({ success: true, id: newId });
    } catch (error) {
        console.error('Create Link Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.deleteLink = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM TrackingLinks WHERE Id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Link Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};
