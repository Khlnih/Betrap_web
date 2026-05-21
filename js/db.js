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
      if (read(KEY.seeded)) return;

      // Providers
      const p1 = users.create({ name:'Lan Ngọc Wedding', email:'lan@betrap.vn', password:'123456', role:'provider', phone:'0901234567', avatar:'LN', location:'Hà Nội', bio:'Đội bê tráp chuyên nghiệp 5 năm kinh nghiệm', verified:true });
      const p2 = users.create({ name:'Áo Dài Thiên Phúc', email:'thienphuc@betrap.vn', password:'123456', role:'provider', phone:'0912345678', avatar:'TP', location:'TP. HCM', bio:'Cho thuê áo dài cao cấp', verified:true });
      const p3 = users.create({ name:'Studio Kim Cương', email:'kimcuong@betrap.vn', password:'123456', role:'provider', phone:'0923456789', avatar:'KC', location:'Đà Nẵng', bio:'Media & Make up chuyên nghiệp', verified:true });

      // Customer
      const c1 = users.create({ name:'Nguyễn Thị Mai', email:'mai@gmail.com', password:'123456', role:'customer', phone:'0934567890', avatar:'NM', location:'Hà Nội' });

      // Services — Bê Tráp
      const s1 = services.create({ providerId:p1.id, category:'be-trap', name:'Gói Bê Tráp Tiêu Chuẩn', description:'Đội bê tráp 6 người, trang phục áo dài đồng bộ, chuyên nghiệp và lịch sự.', price:2500000, unit:'buổi', image:'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80', rating:4.8, reviewCount:24, location:'Hà Nội', tags:['6 người','Áo dài','Chuyên nghiệp'] });
      const s2 = services.create({ providerId:p1.id, category:'be-trap', name:'Gói Bê Tráp Cao Cấp', description:'Đội bê tráp 10 người, trang phục sang trọng, có ban nhạc đệm, xe hoa.', price:5000000, unit:'buổi', image:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80', rating:4.9, reviewCount:18, location:'Hà Nội', tags:['10 người','Xe hoa','Ban nhạc'] });

      // Services — Áo Dài
      const s3 = services.create({ providerId:p2.id, category:'ao-dai', name:'Thuê Áo Dài Cô Dâu', description:'Bộ sưu tập áo dài cô dâu cao cấp, đa dạng màu sắc, kích cỡ, thêu tay tinh xảo.', price:800000, unit:'ngày', image:'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80', rating:4.7, reviewCount:32, location:'TP. HCM', tags:['Cô dâu','Thêu tay','Đa màu'] });
      const s4 = services.create({ providerId:p2.id, category:'ao-dai', name:'Thuê Áo Dài Đội Bê', description:'Áo dài đồng phục đội bê tráp, nhiều màu sắc phù hợp với chủ đề đám hỏi.', price:150000, unit:'bộ/ngày', image:'https://images.unsplash.com/photo-1610041518868-e7c3de54c626?w=600&q=80', rating:4.6, reviewCount:45, location:'TP. HCM', tags:['Đồng phục','Nhiều màu'] });

      // Services — Làm Tráp
      const s5 = services.create({ providerId:p1.id, category:'lam-trap', name:'Làm Tráp Truyền Thống', description:'Trang trí mâm tráp theo phong cách truyền thống, hoa tươi đẹp, ý nghĩa.', price:3500000, unit:'bộ', image:'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80', rating:4.9, reviewCount:15, location:'Hà Nội', tags:['Hoa tươi','Truyền thống'] });

      // Services — Media
      const s6 = services.create({ providerId:p3.id, category:'media', name:'Chụp & Quay Đám Hỏi Full', description:'Gói chụp ảnh + quay phim đám hỏi trọn gói, edit màu chuyên nghiệp, giao file trong 7 ngày.', price:8000000, unit:'buổi', image:'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=80', rating:5.0, reviewCount:22, location:'Đà Nẵng', tags:['Ảnh+Video','Edit màu','7 ngày'] });

      // Services — Make Up
      const s7 = services.create({ providerId:p3.id, category:'makeup', name:'Trang Điểm Cô Dâu', description:'Make up cô dâu đám hỏi, phong cách tự nhiên hoặc glamour, bền màu cả ngày.', price:1200000, unit:'lần', image:'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80', rating:4.8, reviewCount:38, location:'Đà Nẵng', tags:['Cô dâu','Bền màu','Tự nhiên'] });

      // Sample transaction
      transactions.create({ customerId:c1.id, providerId:p1.id, serviceId:s1.id, serviceName:s1.name, price:s1.price, date:'2024-03-15', time:'08:00', address:'123 Hoàng Mai, Hà Nội', note:'Vui lòng đến trước 30 phút', status:'done', paymentMethod:'momo', paymentStatus:'paid' });
      transactions.create({ customerId:c1.id, providerId:p3.id, serviceId:s6.id, serviceName:s6.name, price:s6.price, date:'2024-03-15', time:'09:00', address:'123 Hoàng Mai, Hà Nội', note:'', status:'confirmed', paymentMethod:'bank', paymentStatus:'paid' });

      // Sample conversation
      const conv = conversations.create({ participants:[c1.id, p1.id], serviceId:s1.id });
      messages.create({ conversationId:conv.id, senderId:c1.id, content:'Chào bạn, mình muốn hỏi về gói bê tráp tiêu chuẩn ạ!' });
      messages.create({ conversationId:conv.id, senderId:p1.id, content:'Chào bạn! Gói tiêu chuẩn của mình gồm 6 người, trang phục áo dài đồng bộ. Bạn dự định tổ chức vào ngày nào vậy?' });
      messages.create({ conversationId:conv.id, senderId:c1.id, content:'Mình dự định ngày 15/3 ạ, khoảng 8 giờ sáng.' });
      conversations.update(conv.id, { lastMessage:'Mình dự định ngày 15/3 ạ', lastAt: now() });

      // Sample review
      reviews.create({ serviceId:s1.id, customerId:c1.id, transactionId:'sample', rating:5, comment:'Đội bê tráp rất chuyên nghiệp, đúng giờ và lịch sự. Trang phục đẹp và gọn gàng. Rất hài lòng!' });

      write(KEY.seeded, true);
    }
  };

  return { users, session, services, transactions, conversations, messages, reviews, SEED, uid, now };
})();
