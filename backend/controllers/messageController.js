const db = require('../config/db');
const { uid } = require('../utils/helpers');

exports.getConversations = async (req, res) => {
    const userId = req.user.userId;
    try {
        const result = await db.query(`
            SELECT c.*, cp2.UserId AS OtherUserId, u.Name AS OtherName, u.Avatar AS OtherAvatar, u.Role AS OtherRole,
                   (SELECT COUNT(*) FROM Messages m WHERE m.ConversationId=c.Id AND m.SenderId<>$1 AND m.IsRead=0) AS UnreadCount
            FROM Conversations c
            JOIN ConversationParticipants cp ON cp.ConversationId=c.Id AND cp.UserId=$1
            JOIN ConversationParticipants cp2 ON cp2.ConversationId=c.Id AND cp2.UserId<>$1
            JOIN Users u ON u.Id=cp2.UserId
            ORDER BY c.LastAt DESC`, [userId]);
            
        res.json(result.recordset.map(c => ({
            id: c.id, serviceId: c.serviceid, lastMessage: c.lastmessage, lastAt: c.lastat,
            otherUser: { id: c.otheruserid, name: c.othername, avatar: c.otheravatar, role: c.otherrole },
            unreadCount: c.unreadcount || 0
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.createConversation = async (req, res) => {
    const { providerId, serviceId } = req.body;
    const myId = req.user.userId;
    if (!providerId) return res.status(400).json({ error: 'Missing providerId' });
    
    try {
        const exist = await db.query(`
            SELECT c.Id FROM Conversations c
            JOIN ConversationParticipants cp1 ON cp1.ConversationId=c.Id AND cp1.UserId=$1
            JOIN ConversationParticipants cp2 ON cp2.ConversationId=c.Id AND cp2.UserId=$2`,
            [myId, providerId]
        );
        
        if (exist.recordset.length) return res.json({ id: exist.recordset[0].id });
        
        const id = 'CONV_' + uid();
        await db.query('INSERT INTO Conversations (Id, ServiceId) VALUES ($1, $2)', [id, serviceId || null]);
        await db.query('INSERT INTO ConversationParticipants (ConversationId, UserId) VALUES ($1, $2)', [id, myId]);
        await db.query('INSERT INTO ConversationParticipants (ConversationId, UserId) VALUES ($1, $2)', [id, providerId]);
        
        res.json({ id });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.getMessages = async (req, res) => {
    const { convId } = req.params;
    const userId = req.user.userId;
    
    try {
        const check = await db.query('SELECT UserId FROM ConversationParticipants WHERE ConversationId=$1 AND UserId=$2', [convId, userId]);
        if (!check.recordset.length) return res.status(403).json({ error: 'Forbidden' });
        
        await db.query('UPDATE Messages SET IsRead=1 WHERE ConversationId=$1 AND SenderId<>$2', [convId, userId]);
        
        const msgs = await db.query('SELECT * FROM Messages WHERE ConversationId=$1 ORDER BY CreatedAt ASC', [convId]);
        res.json(msgs.recordset.map(m => ({
            id: m.id, conversationId: m.conversationid, senderId: m.senderid,
            content: m.content, read: m.isread, createdAt: m.createdat
        })));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

exports.sendMessage = async (req, res) => {
    const { conversationId, content } = req.body;
    if (!conversationId || !content?.trim()) return res.status(400).json({ error: 'Missing data' });
    
    const userId = req.user.userId;
    try {
        const check = await db.query('SELECT UserId FROM ConversationParticipants WHERE ConversationId=$1 AND UserId=$2', [conversationId, userId]);
        if (!check.recordset.length) return res.status(403).json({ error: 'Forbidden' });
        
        const id = 'MSG_' + userId + '_' + Date.now();
        await db.query(
            'INSERT INTO Messages (Id, ConversationId, SenderId, Content) VALUES ($1, $2, $3, $4)',
            [id, conversationId, userId, content.trim()]
        );
        
        await db.query(
            'UPDATE Conversations SET LastMessage=$1, LastAt=CURRENT_TIMESTAMP, UpdatedAt=CURRENT_TIMESTAMP WHERE Id=$2',
            [content.trim(), conversationId]
        );
        
        res.json({ id, conversationId, senderId: userId, content: content.trim(), read: false, createdAt: new Date() });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};
