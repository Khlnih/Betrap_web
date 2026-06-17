/**
 * BêTráp — API Layer v2.0
 * Tất cả UI chỉ gọi API.* — không bao giờ trực tiếp fetch hay localStorage
 * Backend: Express + SQL Server (localhost:3000)
 */

const API = (() => {

  // ── Cấu hình (thay đổi URL khi deploy) ───────────────────────────────────
  const hostname = window.location.hostname;
  // Tự động nhận diện API (nếu chạy local thì gọi 3000, nếu trên mạng thì gọi /api)
  const BASE_URL = (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') 
    ? 'http://localhost:3000/api' 
    : '/api';

  // ── Token helpers ─────────────────────────────────────────────────────────
  const getToken  = ()      => localStorage.getItem('bt_token');
  const setToken  = (t)     => localStorage.setItem('bt_token', t);
  const clearToken= ()      => localStorage.removeItem('bt_token');

  const getSession  = ()    => JSON.parse(localStorage.getItem('bt_session') || 'null');
  const setSession  = (s)   => localStorage.setItem('bt_session', JSON.stringify(s));
  const clearSession= ()    => localStorage.removeItem('bt_session');

  async function req(method, path, body, needAuth = false) {
    const headers = { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    const token = getToken();
    if (needAuth) {
      if (!token) throw new Error('Chưa đăng nhập.');
      headers['Authorization'] = 'Bearer ' + token;
    } else if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE_URL + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  const get  = (path, auth)       => req('GET',    path, null, auth);
  const post = (path, body, auth) => req('POST',   path, body, auth);
  const put  = (path, body, auth) => req('PUT',    path, body, auth);
  const del  = (path, auth)       => req('DELETE', path, null, auth);

  // ── Upload ────────────────────────────────────────────────────────────────
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('bt_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(BASE_URL + '/upload', { method: 'POST', headers, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  };

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const auth = {
    currentSession: getSession,
    currentUser:    getSession,
    updateSession:  setSession,
    me: async () => await get('/auth/me', true),

    login: async ({ email, password }) => {
      if (!email || !password) throw new Error('Vui lòng nhập email và mật khẩu.');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error('Email không đúng định dạng.');
      const result = await post('/auth/login', { email, password });
      setToken(result.token);
      setSession(result.session);
      return result;
    },

    register: async (data) => {
      if (!data.name || !data.email || !data.password || !data.role)
        throw new Error('Vui lòng điền đầy đủ thông tin.');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) throw new Error('Email không đúng định dạng.');
      const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
      if (!passRegex.test(data.password))
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự, gồm 1 chữ in hoa và 1 ký tự đặc biệt.');
      if (data.role === 'provider') {
        const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
        if (!phoneRegex.test(data.phone)) throw new Error('Số điện thoại không hợp lệ (Phải là ĐTDĐ Việt Nam 10 số).');
      }
      const result = await post('/auth/register', data);
      setToken(result.token);
      setSession(result.session);
      return result;
    },

    logout: () => {
      clearToken();
      clearSession();
      window.location.href = rootPath() + 'index.html';
    },

    updateProfile: async (data) => {
      const result = await put('/auth/profile', data, true);
      // Update local session
      const sess = getSession();
      if (sess) setSession({ ...sess, ...data });
      return result;
    },

    changePassword: async ({ oldPassword, newPassword }) => {
      return await put('/auth/password', { oldPassword, newPassword }, true);
    },

    requireAuth: (redirectTo) => {
      const s = getSession();
      if (!s || !getToken()) {
        window.location.href = redirectTo || rootPath() + 'pages/login.html';
        return null;
      }
      return s;
    },

    requireRole: (role) => {
      const s = auth.requireAuth();
      if (s && s.role !== role) {
        window.location.href = rootPath() + 'pages/dashboard.html';
        return null;
      }
      return s;
    },
  };

  // ── SERVICES ──────────────────────────────────────────────────────────────
  const svc = {
    getAll: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.subCategory) params.set('subCategory', filters.subCategory);
      if (filters.location) params.set('location', filters.location);
      if (filters.search)   params.set('search', filters.search);
      if (filters.sort)     params.set('sort', filters.sort);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.all)      params.set('all', '1');
      if (filters.page)     params.set('page', filters.page);
      if (filters.limit)    params.set('limit', filters.limit);
      const qs = params.toString();
      return await get('/services' + (qs ? '?' + qs : ''));
    },

    getById: async (id) => {
      try { return await get('/services/' + id); }
      catch { return null; }
    },

    create: async (data) => {
      return await post('/services', data, true);
    },

    update: async (id, data) => {
      return await put('/services/' + id, data, true);
    },

    remove: async (id) => {
      return await del('/services/' + id, true);
    },

    // Lấy dịch vụ của chính nhà cung cấp (bao gồm cả đang ẩn)
    getMyServices: async () => {
      return await get('/provider/services', true);
    },

    // Bật/tắt ẩn dịch vụ
    toggle: async (id) => {
      return await req('PATCH', '/services/' + id + '/toggle', null, true);
    },

    // Lấy danh sách áo dài liên kết với 1 Tráp
    getAodaiLinks: async (trapId) => {
      try { return await get('/services/' + trapId + '/aodai'); }
      catch { return []; }
    },

    // Provider cập nhật liên kết Tráp-Áo dài
    setAodaiLinks: async (trapId, aodaiIds) => {
      return await put('/services/' + trapId + '/aodai-links', { aodaiIds }, true);
    },

    getProviderName: (providerId) => {
      // Fallback — name thường đã có trong service object từ API
      return 'Nhà cung cấp';
    },
  };

  // ── TRANSACTIONS ──────────────────────────────────────────────────────────
  const txn = {
    create: async ({ serviceId, date, time, address, note, paymentMethod }) => {
      if (!date || !address) throw new Error('Vui lòng điền ngày và địa chỉ.');
      const selectedDate = new Date(date + 'T00:00:00');
      const today = new Date(); today.setHours(0,0,0,0);
      if (selectedDate < today) throw new Error('Ngày tổ chức phải từ hôm nay trở đi.');
      if (address.length < 10) throw new Error('Vui lòng nhập địa chỉ cụ thể (tối thiểu 10 ký tự).');
      const s = auth.requireAuth();
      if (!s) return null;
      return await post('/transactions', { serviceId, date, time, address, note, paymentMethod }, true);
    },

    getMyOrders: async () => {
      const s = auth.currentSession();
      if (!s) return [];
      try { return await get('/transactions/' + s.userId, true); }
      catch { return []; }
    },

    getById: async (id) => {
      try { return await get('/transaction/' + id, true); }
      catch { return null; }
    },

    updateStatus: async (id, status, extra = {}) => {
      return await put('/transaction/' + id + '/status', { status, ...extra }, true);
    },

    pay: async (txnId, method, amount = 1000000) => {
      await new Promise(r => setTimeout(r, 800));
      await put('/transaction/' + txnId + '/status',
        { status: 'confirmed', paymentMethod: method, paymentStatus: 'paid' }, true);
      return true;
    },
  };

  // ── CONSULTATIONS ──────────────────────────────────────────────────────────
  const consultation = {
    create: async (data) => await post('/consultations', data, true),
    getCustomer: async () => await get('/consultations/customer', true),
    getProvider: async () => await get('/consultations/provider', true),
    updateStatus: async (id, status, providerNote) => {
      return await put('/consultations/' + id + '/status', { status, providerNote }, true);
    }
  };

  // ── CHAT ──────────────────────────────────────────────────────────────────
  const chat = {
    getConversations: async () => {
      try { return await get('/conversations', true); }
      catch { return []; }
    },

    getMessages: async (convId) => {
      try { return await get('/messages/' + convId, true); }
      catch { return []; }
    },

    sendMessage: async (convId, content) => {
      if (!content?.trim()) return null;
      return await post('/messages', { conversationId: convId, content }, true);
    },

    startConversation: async (providerId, serviceId) => {
      const s = auth.currentSession();
      if (!s) return null;
      return await post('/conversations', { providerId, serviceId: serviceId || null }, true);
    },
  };

  // ── REVIEWS ───────────────────────────────────────────────────────────────
  const review = {
    getByService: async (serviceId) => {
      try { return await get('/reviews/service/' + serviceId); }
      catch { return []; }
    },

    create: async ({ serviceId, transactionId, rating, comment }) => {
      const s = auth.requireAuth();
      if (!s) return null;
      return await post('/reviews', { serviceId, transactionId, rating, comment }, true);
    },

    hasReview: async (transactionId) => {
      try {
        const r = await get('/reviews/check/' + transactionId, true);
        return r.hasReview;
      } catch { return false; }
    },

    getByProvider: async (providerId) => {
      try { return await get('/reviews/provider/' + providerId, true); }
      catch { return []; }
    },

    reply: async (id, reply) => {
      return await put('/reviews/' + id + '/reply', { reply }, true);
    },
  };

  // ── FAVORITES (Wishlist) ──────────────────────────────────────────────────
  const favorites = {
    getAll: async () => {
      try { return await get('/favorites', true); }
      catch { return []; }
    },

    toggle: async (serviceId) => {
      const s = auth.currentSession();
      if (!s) { window.location.href = rootPath() + 'pages/login.html'; return null; }
      return await post('/favorites/' + serviceId, {}, true);
    },

    check: async (serviceId) => {
      try {
        const r = await get('/favorites/check/' + serviceId, true);
        return r.favorited;
      } catch { return false; }
    },
  };

  // ── ADMIN ───────────────────────────────────────────────────────────────
  const admin = {
    getUsers: async () => {
      return await get('/admin/users', true);
    },
    createProvider: async (data) => {
      return await post('/admin/providers', data, true);
    },
    toggleUser: async (id) => {
      const token = localStorage.getItem('bt_token');
      const res = await fetch(BASE_URL + '/admin/users/' + id + '/toggle', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Lỗi');
      return data;
    },
    getServices: async () => {
      return await get('/admin/services', true);
    },
    verifyProvider: async (id) => {
      return await put('/admin/providers/' + id + '/verify', null, true);
    },
    toggleService: async (id) => {
      const token = localStorage.getItem('bt_token');
      const res = await fetch(BASE_URL + '/admin/services/' + id + '/toggle', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Lỗi');
      return data;
    },
    getTransactions: async () => {
      return await get('/admin/transactions', true);
    }
  };

  // ── BLOG ──────────────────────────────────────────────────────────────────
  const blog = {
    getMonths: async (offset = 0) => get('/blogs/months?offset=' + offset),
    getByMonth: async (year, month) => get(`/blogs?year=${year}&month=${month}`),
    getAll: async (limit, offset, search) => {
      let q = [];
      if(limit) q.push(`limit=${limit}`);
      if(offset) q.push(`offset=${offset}`);
      if(search) q.push(`search=${encodeURIComponent(search)}`);
      return get('/blogs' + (q.length ? '?' + q.join('&') : ''));
    },
    getAllAdmin: async () => get('/blogs?all=true', true),
    getById: async (id) => get('/blogs/' + id),
    create: async (title) => post('/blogs', { title }, true),
    update: async (id, data) => put('/blogs/' + id, data, true),
    delete: async (id) => del('/blogs/' + id, true),
    addBlock: async (postId, type, content, position) =>
      post('/blogs/' + postId + '/blocks', { type, content, position }, true),
    updateBlock: async (postId, blockId, data) =>
      put('/blogs/' + postId + '/blocks/' + blockId, data, true),
    deleteBlock: async (postId, blockId) =>
      del('/blogs/' + postId + '/blocks/' + blockId, true),
    reorderBlocks: async (postId, blocks) =>
      put('/blogs/' + postId + '/blocks/reorder', { blocks }, true),
  };

  // ── STATS ─────────────────────────────────────────────────────────────────
  const stats = {
    global: async () => {
      try { return await get('/stats/global'); }
      catch { return { doneTxns: 0, totalReviews: 0, avgRating: 5 }; }
    },

    customer: async () => {
      try { return await get('/stats/customer', true); }
      catch { return { total: 0, pending: 0, done: 0, spent: 0 }; }
    },

    provider: async () => {
      try { return await get('/stats/provider', true); }
      catch { return { total: 0, pending: 0, done: 0, revenue: 0, avgRating: 5 }; }
    },

    admin: async () => {
      try { return await get('/stats/admin', true); }
      catch { return null; }
    },
  };

  // ── USERS ─────────────────────────────────────────────────────────────────
  const users = {
    getProfile: async (id) => {
      try { return await get('/services?providerId=' + id); }
      catch { return null; }
    },
  };

  const utils = {
    uploadImage: async (file) => {
      const data = await uploadImage(file);
      return data.url;
    }
  };

  // ── LEADS (yêu cầu tư vấn công khai từ trang chủ — không cần đăng nhập) ─────
  const lead = {
    create:       async (data)       => await post('/leads', data, false),
    list:         async ()           => await get('/leads', true),                       // ADMIN
    updateStatus: async (id, status) => await put('/leads/' + id + '/status', { status }, true), // ADMIN
  };

  return { auth, svc, txn, consultation, lead, chat, review, favorites, stats, users, utils, admin, blog };
})();

// Helper: get root path relative to current page
function rootPath() {
  return location.pathname.includes('/pages/') ? '../' : './';
}
