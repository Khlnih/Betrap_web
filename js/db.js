/**
 * BêTráp — Data Access Layer (localStorage)
 *
 * MIGRATION GUIDE → SQL/REST API:
 *   Replace each method body with a fetch() call to your API endpoint.
 *   api.js and all UI layers call only this file — nothing else needs to change.
 *
 * Example migration:
 *   DB.users.getAll()  →  await fetch('/api/users').then(r=>r.json())
 *   DB.users.create(u) →  await fetch('/api/users',{method:'POST',body:JSON.stringify(u)})
 */

const DB = (() => {
  const KEY = {
    users:         'bt_users',
    session:       'bt_session',
    services:      'bt_services',
    transactions:  'bt_transactions',
    conversations: 'bt_conversations',
    messages:      'bt_messages',
    reviews:       'bt_reviews',
    seeded:        'bt_seeded',
  };

  const read  = k => JSON.parse(localStorage.getItem(k) || 'null');
  const write = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const uid   = () => '_' + Math.random().toString(36).slice(2,11);
  const now   = () => new Date().toISOString();

  // ─── USERS ───────────────────────────────────────────────────────────────
  const users = {
    getAll:      ()   => read(KEY.users) || [],
    save:        (arr)=> write(KEY.users, arr),
    findById:    (id) => users.getAll().find(u => u.id === id) || null,
    findByEmail: (em) => users.getAll().find(u => u.email === em.toLowerCase()) || null,
    create: (data) => {
      const list = users.getAll();
      const user = { id: uid(), createdAt: now(), ...data, email: data.email.toLowerCase() };
      list.push(user);
      users.save(list);
      return user;
    },
    update: (id, data) => {
      const list = users.getAll().map(u => u.id === id ? { ...u, ...data, updatedAt: now() } : u);
      users.save(list);
      return users.findById(id);
    },
  };

  // ─── SESSION ─────────────────────────────────────────────────────────────
  const session = {
    get:   ()  => read(KEY.session),
    set:   (s) => write(KEY.session, s),
    clear: ()  => localStorage.removeItem(KEY.session),
  };

  // ─── SERVICES ────────────────────────────────────────────────────────────
  const services = {
    getAll:          ()   => read(KEY.services) || [],
    save:            (arr)=> write(KEY.services, arr),
    findById:        (id) => services.getAll().find(s => s.id === id) || null,
    findByCategory:  (cat)=> services.getAll().filter(s => s.category === cat && s.active),
    findByProvider:  (pid)=> services.getAll().filter(s => s.providerId === pid),
    create: (data) => {
      const list = services.getAll();
      const svc  = { id: uid(), createdAt: now(), active: true, rating: 0, reviewCount: 0, ...data };
      list.push(svc);
      services.save(list);
      return svc;
    },
    update: (id, data) => {
      const list = services.getAll().map(s => s.id === id ? { ...s, ...data, updatedAt: now() } : s);
      services.save(list);
      return services.findById(id);
    },
  };

  // ─── TRANSACTIONS ────────────────────────────────────────────────────────
  const transactions = {
    getAll:        ()    => read(KEY.transactions) || [],
    save:          (arr) => write(KEY.transactions, arr),
    findById:      (id)  => transactions.getAll().find(t => t.id === id) || null,
    findByUser:    (uid) => transactions.getAll().filter(t => t.customerId === uid || t.providerId === uid),
    findByCustomer:(uid) => transactions.getAll().filter(t => t.customerId === uid),
    findByProvider:(pid) => transactions.getAll().filter(t => t.providerId === pid),
    create: (data) => {
      const list = transactions.getAll();
      const txn  = { id: 'TXN' + uid().toUpperCase(), createdAt: now(), status: 'pending', ...data };
      list.push(txn);
      transactions.save(list);
      return txn;
    },
    updateStatus: (id, status, extra = {}) => {
      const list = transactions.getAll().map(t =>
        t.id === id ? { ...t, status, ...extra, updatedAt: now() } : t
      );
      transactions.save(list);
      return transactions.findById(id);
    },
  };

  // ─── CONVERSATIONS ───────────────────────────────────────────────────────
  const conversations = {
    getAll:  ()    => read(KEY.conversations) || [],
    save:    (arr) => write(KEY.conversations, arr),
    findById:(id)  => conversations.getAll().find(c => c.id === id) || null,
    findByParticipants: (a, b) =>
      conversations.getAll().find(c =>
        c.participants.includes(a) && c.participants.includes(b)
      ) || null,
    findByUser: (uid) =>
      conversations.getAll().filter(c => c.participants.includes(uid)),
    create: (data) => {
      const list = conversations.getAll();
      const conv = { id: uid(), createdAt: now(), lastMessage: null, lastAt: now(), ...data };
      list.push(conv);
      conversations.save(list);
      return conv;
    },
    update: (id, data) => {
      const list = conversations.getAll().map(c =>
        c.id === id ? { ...c, ...data, updatedAt: now() } : c
      );
      conversations.save(list);
    },
  };

  // ─── MESSAGES ────────────────────────────────────────────────────────────
  const messages = {
    getAll:              ()    => read(KEY.messages) || [],
    save:                (arr) => write(KEY.messages, arr),
    findByConversation:  (cid) => messages.getAll().filter(m => m.conversationId === cid),
    create: (data) => {
      const list = messages.getAll();
      const msg  = { id: uid(), createdAt: now(), read: false, ...data };
      list.push(msg);
      messages.save(list);
      return msg;
    },
    markRead: (convId, readerId) => {
      const list = messages.getAll().map(m =>
        m.conversationId === convId && m.senderId !== readerId ? { ...m, read: true } : m
      );
      messages.save(list);
    },
  };

  // ─── REVIEWS ─────────────────────────────────────────────────────────────
  const reviews = {
    getAll:         ()    => read(KEY.reviews) || [],
    save:           (arr) => write(KEY.reviews, arr),
    findByService:  (sid) => reviews.getAll().filter(r => r.serviceId === sid),
    findByTxn:      (tid) => reviews.getAll().find(r => r.transactionId === tid) || null,
    create: (data) => {
      const list = reviews.getAll();
      const rev  = { id: uid(), createdAt: now(), ...data };
      list.push(rev);
      reviews.save(list);
      // update service avg rating
      const svcRevs = reviews.findByService(data.serviceId);
      const avg = (svcRevs.reduce((s,r) => s + r.rating, 0) / svcRevs.length).toFixed(1);
      services.update(data.serviceId, { rating: parseFloat(avg), reviewCount: svcRevs.length });
      return rev;
    },
  };

  // ─── SEED DATA ───────────────────────────────────────────────────────────
  const SEED = {
    run() {
      const VERSION = 'v4_betrap_fixed_ids';
      if (read('bt_seed_version') === VERSION) return;
      
      // Clear all to start fresh
      localStorage.clear();
      write('bt_seed_version', VERSION);

      // Providers
      const p1 = users.create({ id:'p1', name:'Lan Ngọc Wedding', email:'lan@betrap.vn', password:'123456', role:'provider', phone:'0901234567', avatar:'LN', location:'Hà Nội', bio:'Đội bê tráp chuyên nghiệp 5 năm kinh nghiệm', verified:true });
      const p2 = users.create({ id:'p2', name:'Áo Dài Thiên Phúc', email:'thienphuc@betrap.vn', password:'123456', role:'provider', phone:'0912345678', avatar:'TP', location:'TP. HCM', bio:'Cho thuê áo dài cao cấp', verified:true });
      const p3 = users.create({ id:'p3', name:'Studio Kim Cương', email:'kimcuong@betrap.vn', password:'123456', role:'provider', phone:'0923456789', avatar:'KC', location:'Đà Nẵng', bio:'Media & Make up chuyên nghiệp', verified:true });

      // Customer
      const c1 = users.create({ id:'c1', name:'Nguyễn Thị Mai', email:'mai@gmail.com', password:'123456', role:'customer', phone:'0934567890', avatar:'NM', location:'Hà Nội' });

      // Services — Bê Tráp
      services.create({ id:'s1', providerId:p1.id, category:'be-trap', name:'Gói Bê Tráp Tiêu Chuẩn (Nam)', description:'Đội bê tráp 5 nam thanh lịch, trang phục áo dài truyền thống đỏ.', price:1500000, unit:'buổi', image:'assets/images/betrap-1.jpg', rating:4.8, reviewCount:24, location:'Hà Nội', tags:['5 người','Nam','Truyền thống'] });
      services.create({ id:'s2', providerId:p1.id, category:'be-trap', name:'Gói Bê Tráp Tiêu Chuẩn (Nữ)', description:'Đội bê tráp 5 nữ xinh xắn, áo dài hồng pastel nhẹ nhàng.', price:1500000, unit:'buổi', image:'assets/images/betrap-2.jpg', rating:4.7, reviewCount:18, location:'Hà Nội', tags:['5 người','Nữ'] });
      services.create({ id:'s3', providerId:p2.id, category:'be-trap', name:'Gói Bê Tráp Áo Dài Đỏ', description:'Đội hình 7 người, áo dài đỏ rực rỡ mang lại may mắn cho ngày cưới.', price:2100000, unit:'buổi', image:'assets/images/betrap-4.jpg', rating:4.9, reviewCount:35, location:'TP. HCM', tags:['7 người','Áo dài đỏ'] });
      services.create({ id:'s4', providerId:p2.id, category:'be-trap', name:'Gói Bê Tráp Áo Dài Vàng', description:'Đội hình 7 người, trang phục áo dài vàng kim sang trọng.', price:2200000, unit:'buổi', image:'assets/images/betrap-5.jpg', rating:4.8, reviewCount:21, location:'TP. HCM', tags:['7 người','Áo dài vàng'] });
      services.create({ id:'s5', providerId:p1.id, category:'be-trap', name:'Gói Bê Tráp Cao Cấp (VIP)', description:'Đội hình 9 người cao ráo, trang phục thiết kế riêng, chuyên nghiệp.', price:3500000, unit:'buổi', image:'assets/images/betrap-7.jpg', rating:5.0, reviewCount:42, location:'Hà Nội', tags:['9 người','VIP','Thiết kế'] });
      services.create({ id:'s6', providerId:p3.id, category:'be-trap', name:'Gói Bê Tráp Kèm Xe Hoa', description:'Đội bê tráp 5 người kèm dịch vụ xe hoa sang trọng phục vụ đưa rước.', price:5000000, unit:'ngày', image:'assets/images/betrap-25.jpg', rating:4.9, reviewCount:12, location:'Đà Nẵng', tags:['5 người','Xe hoa'] });
      services.create({ id:'s7', providerId:p3.id, category:'be-trap', name:'Gói Bê Tráp Truyền Thống Xưa', description:'Đội hình 7 người mặc áo tấc, khăn vấn đậm chất truyền thống Bắc Bộ.', price:2800000, unit:'buổi', image:'assets/images/betrap-12.jpg', rating:4.8, reviewCount:15, location:'Đà Nẵng', tags:['7 người','Áo tấc','Cổ điển'] });
      services.create({ id:'s8', providerId:p2.id, category:'be-trap', name:'Gói Bê Tráp Hiện Đại', description:'Đội hình 9 người, trang phục suit và áo dài cách tân hiện đại.', price:3200000, unit:'buổi', image:'assets/images/betrap-22.jpg', rating:4.6, reviewCount:28, location:'TP. HCM', tags:['9 người','Hiện đại'] });

      // Only be-trap services are seeded
    }
  };

  return { users, session, services, transactions, conversations, messages, reviews, SEED, uid, now };
})();
