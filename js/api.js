/**
 * BêTráp — Business Logic Layer
 *
 * All UI code calls only this file (API.*).
 * This file calls only DB.* — never localStorage directly.
 *
 * MIGRATION → Real backend:
 *   Replace DB.* calls with fetch('/api/...') calls.
 *   UI code stays the same.
 */

const API = (() => {

  const BASE_URL = 'http://localhost:3000/api';

  // ─── AUTH ───────────────────────────────────────────────────────────────
  const auth = {
    register: async (data) => {
      if (!data.name || !data.email || !data.password || !data.role) throw new Error('Vui lòng điền đầy đủ thông tin.');
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) throw new Error('Email không đúng định dạng.');
      
      const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
      if (!passRegex.test(data.password)) throw new Error('Mật khẩu phải có ít nhất 6 ký tự, gồm 1 chữ in hoa và 1 ký tự đặc biệt.');
      
      if (data.role === 'provider') {
        const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
        if (!phoneRegex.test(data.phone)) throw new Error('Số điện thoại không hợp lệ (Phải là ĐTDĐ Việt Nam 10 số).');
      }

      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Đăng ký thất bại');
      localStorage.setItem('bt_session', JSON.stringify(result.session));
      return result;
    },

    login: async ({ email, password }) => {
      if (!email || !password) throw new Error('Vui lòng nhập email và mật khẩu.');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error('Email không đúng định dạng.');

      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Đăng nhập thất bại');
      localStorage.setItem('bt_session', JSON.stringify(result.session));
      return result;
    },

    logout: () => { localStorage.removeItem('bt_session'); window.location.href = rootPath() + 'index.html'; },

    currentSession: () => JSON.parse(localStorage.getItem('bt_session')),

    updateProfile: async (data) => {
      const sess = auth.currentSession();
      if (!sess) throw new Error('Chưa đăng nhập.');
      
      const payload = { ...data, userId: sess.userId, role: sess.role };
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Cập nhật thất bại');

      const updated = { ...sess, ...data };
      localStorage.setItem('bt_session', JSON.stringify(updated));
      return updated;
    },

    currentUser: () => {
      // Mocked for now until we have a /me endpoint
      return JSON.parse(localStorage.getItem('bt_session'));
    },

    requireAuth: (redirectTo) => {
      const s = DB.session.get();
      if (!s) { window.location.href = (redirectTo || rootPath() + 'pages/login.html'); return null; }
      return s;
    },

    requireRole: (role) => {
      const s = auth.requireAuth();
      if (s && s.role !== role) { window.location.href = rootPath() + 'pages/dashboard.html'; return null; }
      return s;
    },
  };

  // ─── SERVICES ───────────────────────────────────────────────────────────
  const svc = {
    getAll: async (filters = {}) => {
      const res = await fetch(`${BASE_URL}/services`);
      if (!res.ok) return [];
      let list = await res.json();
      
      if (filters.category) list = list.filter(s => s.Category === filters.category);
      if (filters.search)   list = list.filter(s => s.Name.toLowerCase().includes(filters.search.toLowerCase()));
      if (filters.location) list = list.filter(s => s.Location && s.Location.includes(filters.location));
      if (filters.maxPrice) list = list.filter(s => s.Price <= filters.maxPrice);
      if (filters.sort === 'price_asc')  list.sort((a,b) => a.Price - b.Price);
      if (filters.sort === 'price_desc') list.sort((a,b) => b.Price - a.Price);
      if (filters.sort === 'rating')     list.sort((a,b) => b.Rating - a.Rating);
      
      // Map to camelCase to maintain frontend compatibility
      return list.map(s => ({
        id: s.Id, providerId: s.ProviderId, category: s.Category, name: s.Name,
        description: s.Description, price: s.Price, unit: s.Unit, image: s.Image,
        location: s.Location, rating: s.Rating, reviewCount: s.ReviewCount, tags: s.Tags
      }));
    },
    getById:   async (id)  => DB.services.findById(id), // Temporarily keep DB for details not implemented yet
    getByProvider: async (pid) => DB.services.findByProvider(pid),
    create:    async (data) => {
      const s = auth.currentSession();
      if (!s || s.role !== 'provider') throw new Error('Chỉ nhà cung cấp mới có thể đăng dịch vụ.');
      return DB.services.create({ ...data, providerId: s.userId });
    },
    update:    async (id, data) => DB.services.update(id, data),
    getProviderName: (pid) => { const u = DB.users.findById(pid); return u?.name || 'Nhà cung cấp'; },
  };

  // ─── TRANSACTIONS ───────────────────────────────────────────────────────
  const txn = {
    create: async ({ serviceId, date, time, address, note, paymentMethod }) => {
      const s   = auth.requireAuth();
      if (!s) return null;

      const selectedDate = new Date(date + 'T00:00:00');
      const today = new Date();
      today.setHours(0,0,0,0);
      if (selectedDate < today) throw new Error('Ngày tổ chức phải từ hôm nay trở đi.');
      if (!address || address.length < 10) throw new Error('Vui lòng nhập địa chỉ cụ thể (tối thiểu 10 ký tự).');

      const res = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: s.userId, serviceId, date, time, address, note, paymentMethod })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Đặt dịch vụ thất bại');
      return result;
    },
    getMyOrders: async () => {
      const s = auth.currentSession();
      if (!s) return [];
      const res = await fetch(`${BASE_URL}/transactions/${s.userId}`);
      if (!res.ok) return [];
      const list = await res.json();
      return list.map(t => ({
        id: t.Id, customerId: t.CustomerId, providerId: t.ProviderId, serviceId: t.ServiceId,
        serviceName: t.ServiceName, price: t.Price, date: t.Date, time: t.Time,
        address: t.Address, status: t.Status, paymentMethod: t.PaymentMethod, paymentStatus: t.PaymentStatus
      }));
    },
    getById: async (id) => DB.transactions.findById(id),
    updateStatus: async (id, status) => DB.transactions.updateStatus(id, status),
    // Mock pay
    pay: async (txnId, method) => {
      await new Promise(r => setTimeout(r, 1200)); // simulate delay
      return DB.transactions.updateStatus(txnId, 'confirmed', { paymentMethod: method, paymentStatus: 'paid', paidAt: DB.now() });
    },
  };

  // ─── CHAT ───────────────────────────────────────────────────────────────
  const chat = {
    getConversations: async () => {
      const s = auth.currentSession();
      if (!s) return [];
      const convs = DB.conversations.findByUser(s.userId);
      return convs.map(c => {
        const otherId = c.participants.find(p => p !== s.userId);
        const other   = DB.users.findById(otherId);
        const unread  = DB.messages.findByConversation(c.id).filter(m => !m.read && m.senderId !== s.userId).length;
        return { ...c, otherUser: other, unreadCount: unread };
      }).sort((a,b) => new Date(b.lastAt) - new Date(a.lastAt));
    },

    getMessages: async (convId) => {
      const s = auth.currentSession();
      if (!s) return [];
      DB.messages.markRead(convId, s.userId);
      return DB.messages.findByConversation(convId).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    },

    sendMessage: async (convId, content) => {
      const s = auth.currentSession();
      if (!s || !content.trim()) return null;
      const msg = DB.messages.create({ conversationId: convId, senderId: s.userId, content: content.trim() });
      DB.conversations.update(convId, { lastMessage: content.trim(), lastAt: DB.now() });
      return msg;
    },

    startConversation: async (providerId, serviceId) => {
      const s = auth.currentSession();
      if (!s) return null;
      let conv = DB.conversations.findByParticipants(s.userId, providerId);
      if (!conv) conv = DB.conversations.create({ participants: [s.userId, providerId], serviceId: serviceId||null });
      return conv;
    },
  };

  // ─── REVIEWS ────────────────────────────────────────────────────────────
  const review = {
    getByService: async (sid) => {
      const revs = DB.reviews.findByService(sid);
      return revs.map(r => ({ ...r, user: DB.users.findById(r.customerId) }));
    },
    create: async ({ serviceId, transactionId, rating, comment }) => {
      const s = auth.requireAuth();
      if (!s) return null;
      if (DB.reviews.findByTxn(transactionId)) throw new Error('Bạn đã đánh giá đơn hàng này rồi.');
      return DB.reviews.create({ serviceId, transactionId, customerId: s.userId, rating, comment });
    },
  };

  // ─── USERS ──────────────────────────────────────────────────────────────
  const users = {
    getProfile: async (id) => DB.users.findById(id),
    updateProfile: async (data) => {
      const s = auth.currentSession();
      if (!s) return null;
      return DB.users.update(s.userId, data);
    },
    getProviders: async () => DB.users.getAll().filter(u => u.role === 'provider'),
  };

  // ─── DASHBOARD STATS ────────────────────────────────────────────────────
  const stats = {
    customer: async () => {
      const s = auth.currentSession();
      const orders = DB.transactions.findByCustomer(s.userId);
      return {
        total:     orders.length,
        pending:   orders.filter(o => o.status === 'pending').length,
        done:      orders.filter(o => o.status === 'done').length,
        spent:     orders.filter(o => o.paymentStatus === 'paid').reduce((sum,o) => sum + o.price, 0),
      };
    },
    provider: async () => {
      const s = auth.currentSession();
      const orders = DB.transactions.findByProvider(s.userId);
      const myServices = DB.services.findByProvider(s.userId);
      return {
        orders:    orders.length,
        pending:   orders.filter(o => o.status === 'pending').length,
        done:      orders.filter(o => o.status === 'done').length,
        revenue:   orders.filter(o => o.paymentStatus === 'paid').reduce((sum,o) => sum + o.price, 0),
        services:  myServices.length,
      };
    },
  };

  return { auth, svc, txn, chat, review, users, stats };
})();

// Helper: get root path relative to current page
function rootPath() {
  return location.pathname.includes('/pages/') ? '../' : './';
}
