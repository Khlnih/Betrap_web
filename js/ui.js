/**
 * BêTráp — UI Utilities
 * Shared across all pages: nav render, toast, modal, helpers
 */

const UI = (() => {

  // ─── INIT PAGE ──────────────────────────────────────────────────────────
  function initPage() {
    // DB.SEED.run() -- Removed: seed data is now handled by SQL Server schema.sql
    renderNav();
    initScrollNav();
    initReveal();
    initInteractions();
  }

  function initInteractions() {
    document.querySelectorAll('.btn').forEach(btn => addRipple(btn));
    
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width/2;
        const y = e.clientY - rect.top - rect.height/2;
        el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0px, 0px)';
      });
    });
  }

  // ─── NAVIGATION ─────────────────────────────────────────────────────────
  function renderNav(options = {}) {
    const container = document.getElementById('nav-container');
    if (!container) return;
    const sess    = JSON.parse(localStorage.getItem('bt_session') || 'null');
    const root    = rootPath();
    const isLanding = !location.pathname.includes('/pages/');
    const links = `
      <a href="${root}pages/services.html">Dịch vụ</a>
      <a href="${root}pages/blog.html">Blog</a>
      <a href="${root}index.html#about">Về chúng tôi</a>
      <a href="${root}index.html#contact">Liên hệ</a>
    `;

    const actions = sess
      ? `
         <a href="${root}pages/chat.html" class="nav-icon-btn" title="Tin nhắn" style="position:relative;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--cream);color:var(--text-dark);text-decoration:none;font-size:1.1rem;transition:all .2s">
           <i class="ri-chat-3-line"></i>
         </a>
         <div class="nav-dropdown" id="user-menu">
           <div class="navbar-avatar" onclick="UI.toggleDropdown()" id="nav-avatar">${sess.avatar}</div>
           <div class="nav-dropdown-menu" id="nav-dropdown">
             <div class="nav-dropdown-item" onclick="window.location.href='${root}pages/${sess.role==='provider'?'provider-dashboard':'dashboard'}.html'"><i class="ri-dashboard-line"></i> Dashboard</div>
             <div class="nav-dropdown-item" onclick="window.location.href='${root}pages/history.html'"><i class="ri-history-line"></i> Lịch sử</div>
             <div class="nav-dropdown-item" onclick="window.location.href='${root}pages/settings.html'"><i class="ri-settings-3-line"></i> Cài đặt</div>
             <div class="nav-dropdown-divider"></div>
             <div class="nav-dropdown-item" style="color:var(--error)" onclick="API.auth.logout()"><i class="ri-logout-box-line"></i> Đăng xuất</div>
           </div>
         </div>`
      : `<a href="${root}pages/login.html" class="btn btn-outline btn-sm">Đăng nhập</a>
         <a href="${root}pages/register.html" class="btn btn-gold btn-sm">Đăng ký</a>`;

    container.innerHTML = `
      <nav class="navbar" id="navbar">
        <a class="navbar-brand" href="${root}index.html" style="display:flex; align-items:center; gap:10px; text-decoration:none;">
          <img src="${root}assets/images/logo.jpg" alt="Trap Connect" style="height:48px; width:auto; object-fit:contain;">
          <span style="font-family:var(--font-heading); font-weight:700; font-size:1.4rem; color:var(--text-dark);">Trap Connect</span>
        </a>
        <div class="navbar-links" id="nav-links">${links}</div>
        <div class="navbar-actions">
          ${actions}
          <button class="navbar-hamburger" id="hamburger" onclick="UI.toggleMobile()">
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>`;

    // Close dropdown on outside click
    document.addEventListener('click', e => {
      const menu = document.getElementById('nav-dropdown');
      const avatar = document.getElementById('nav-avatar');
      if (menu && !menu.contains(e.target) && avatar && !avatar.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }

  function toggleDropdown() {
    document.getElementById('nav-dropdown')?.classList.toggle('open');
  }

  function toggleMobile() {
    document.getElementById('nav-links')?.classList.toggle('mobile-open');
  }

  function initScrollNav() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ─── SCROLL REVEAL ───────────────────────────────────────────────────────
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
  }

  // ─── TOAST ───────────────────────────────────────────────────────────────
  function toast(message, type = 'success', duration = 3500) {
    const icons = { success:'ri-checkbox-circle-fill', error:'ri-error-warning-fill', info:'ri-information-fill', warning:'ri-alert-fill' };
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="${icons[type]||icons.info}"></i><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => { el.style.animation = 'fadeIn .3s ease reverse'; setTimeout(() => el.remove(), 300); }, duration);
  }

  // ─── MODAL ───────────────────────────────────────────────────────────────
  function modal({ title, body, onConfirm, confirmText = 'Xác nhận', confirmClass = 'btn-primary', cancelText = 'Huỷ' }) {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.classList.add('modal-overlay');
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="UI.closeModal()"><i class="ri-close-line"></i></button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="UI.closeModal()">${cancelText}</button>
          ${onConfirm ? `<button class="btn ${confirmClass}" id="modal-confirm">${confirmText}</button>` : ''}
        </div>
      </div>`;
    overlay.classList.add('open');
    if (onConfirm) {
      // Hỗ trợ async: nếu onConfirm trả về false thì KHÔNG đóng modal
      document.getElementById('modal-confirm').onclick = async () => {
        const btn = document.getElementById('modal-confirm');
        if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
        try {
          const result = await onConfirm();
          if (result !== false) closeModal();
        } catch(e) {
          UI.toast(e.message || 'Đã xảy ra lỗi', 'error');
        } finally {
          if (btn) { btn.disabled = false; btn.style.opacity = ''; }
        }
      };
    }
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }

  function openModal(id) {
    document.getElementById(id)?.classList.add('open');
  }

  function closeModal(id) {
    if (id && typeof id === 'string') {
      document.getElementById(id)?.classList.remove('open');
    } else {
      document.getElementById('modal-overlay')?.classList.remove('open');
    }
  }

  // ─── LOADING ─────────────────────────────────────────────────────────────
  function showLoading() {
    let el = document.getElementById('loading-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-overlay';
      el.className = 'loading-overlay';
      el.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(el);
    }
    el.classList.add('active');
  }
  function hideLoading() { document.getElementById('loading-overlay')?.classList.remove('active'); }

  // ─── FORMAT HELPERS ───────────────────────────────────────────────────────
  function formatCurrency(n) { return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n); }
  function formatDate(s) { return new Date(s).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}); }
  function formatDateTime(s) { return new Date(s).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  function timeAgo(s) {
    const diff = (Date.now() - new Date(s)) / 1000;
    if (diff < 60) return 'vừa xong';
    if (diff < 3600) return Math.floor(diff/60) + ' phút trước';
    if (diff < 86400) return Math.floor(diff/3600) + ' giờ trước';
    return Math.floor(diff/86400) + ' ngày trước';
  }

  function statusLabel(s) {
    const m = { pending:'Chờ xác nhận', confirmed:'Đã xác nhận', active:'Đang thực hiện', done:'Hoàn thành', cancelled:'Đã huỷ' };
    return m[s] || s;
  }
  function statusBadge(s) {
    return `<span class="badge badge-${s}">${statusLabel(s)}</span>`;
  }
  function stars(rating) {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5-full);
  }
  function categoryLabel(c) {
    const m = { 'be-trap':'Cưới Hỏi', 'ao-dai':'Áo Dài', 'lam-trap':'Tráp Ăn Hỏi', 'media':'Media', 'makeup':'Make Up', 'mc-su-kien':'MC Sự Kiện' };
    return m[c] || c;
  }
  function categoryIcon(c) {
    const m = { 'be-trap':'👰', 'ao-dai':'👘', 'lam-trap':'🎁', 'media':'📸', 'makeup':'💄', 'mc-su-kien':'🎤' };
    return m[c] || '✨';
  }

  // ─── COUNTER ANIMATION ────────────────────────────────────────────────────
  function animateCounter(el, target, duration = 1500) {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const val = Math.round(progress * target);
      el.textContent = val.toLocaleString('vi-VN');
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ─── RENDER FOOTER ────────────────────────────────────────────────────────
  function renderFooter(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const root = rootPath();
    el.innerHTML = `
      <footer>
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <div class="navbar-brand" style="color:var(--gold-light);font-size:1.4rem; display:flex; align-items:center; gap:10px;">
                <img src="${root}assets/images/logo.jpg" alt="Trap Connect" style="height:56px; width:auto; object-fit:contain;">
                <span style="font-family:var(--font-heading); font-weight:700;">Trap Connect</span>
              </div>
              <p class="brand-desc">Nền tảng kết nối dịch vụ đám hỏi truyền thống Việt Nam — uy tín, chuyên nghiệp, đáng nhớ.</p>
              <div class="social-links mt-md">
                <a class="social-link" href="#"><i class="ri-facebook-fill"></i></a>
                <a class="social-link" href="#"><i class="ri-instagram-line"></i></a>
                <a class="social-link" href="#"><i class="ri-tiktok-line"></i></a>
                <a class="social-link" href="#"><i class="ri-youtube-line"></i></a>
              </div>
            </div>
            <div>
              <p class="footer-heading">Dịch vụ</p>
              <div class="footer-links">
                <a href="${root}pages/services.html?cat=be-trap">Cưới Hỏi</a>
                <a href="${root}pages/services.html?cat=ao-dai">Thuê Áo Dài</a>
                <a href="${root}pages/services.html?cat=lam-trap">Tráp Ăn Hỏi</a>
                <a href="${root}pages/services.html?cat=media">Media</a>
                <a href="${root}pages/services.html?cat=mc-su-kien">MC Sự Kiện</a>
              </div>
            </div>
            <div>
              <p class="footer-heading">Hỗ trợ</p>
              <div class="footer-links">
                <a href="#">Hướng dẫn đặt dịch vụ</a>
                <a href="#">Chính sách huỷ</a>
                <a href="#">Giải quyết tranh chấp</a>
                <a href="#">Câu hỏi thường gặp</a>
              </div>
            </div>
            <div>
              <p class="footer-heading">Liên hệ</p>
              <div class="footer-links">
                <a href="tel:0915650548"><i class="ri-phone-line"></i> 0915650548</a>
                <a href="mailto:trapconnect24@gmail.com"><i class="ri-mail-line"></i> trapconnect24@gmail.com</a>
                <a href="#"><i class="ri-map-pin-line"></i> Hà Nội</a>
              </div>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© 2026 BêTráp. Tất cả quyền được bảo lưu.</span>
            <span>Được làm với ❤️ cho đám hỏi Việt Nam</span>
          </div>
        </div>
      </footer>`;
  }

  // ─── CONFETTI ─────────────────────────────────────────────────────────────
  function launchConfetti(count = 60) {
    const colors = ['#C8963E','#D4AF37','#8B1A1A','#FF6B35','#FFF8EF','#27AE60'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.cssText = `left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:${Math.random()>0.5?'50%':'2px'};animation-duration:${2+Math.random()*2}s;animation-delay:${Math.random()*0.5}s`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
      }, i * 30);
    }
  }

  // ─── RIPPLE ───────────────────────────────────────────────────────────────
  function addRipple(btn) {
    if (btn.hasAttribute('data-ripple')) return;
    btn.setAttribute('data-ripple', 'true');
    btn.addEventListener('click', e => {
      const rect = btn.getBoundingClientRect();
      const r = document.createElement('span');
      r.className = 'ripple-wave';
      const size = Math.max(rect.width, rect.height) * 2.5;
      r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
      btn.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  }

  // ─── SKELETON LOADING ───────────────────────────────────────────────
  function skeleton(n = 3, type = 'card') {
    if (type === 'card') {
      return Array(n).fill(0).map(() => `
        <div class="skeleton-card">
          <div class="skeleton-img"></div>
          <div class="skeleton-body">
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-80"></div>
            <div class="skeleton-line w-40"></div>
          </div>
        </div>`).join('');
    }
    if (type === 'list') {
      return Array(n).fill(0).map(() => `
        <div class="skeleton-list-item">
          <div class="skeleton-circle"></div>
          <div style="flex:1">
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-40"></div>
          </div>
        </div>`).join('');
    }
    return '';
  }

  // ─── FAVORITE BUTTON ────────────────────────────────────────────────
  function favBtn(serviceId, isFav = false) {
    return `<button id="fav-btn-${serviceId}" onclick="window.__toggleFav && window.__toggleFav('${serviceId}')" class="fav-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Bỏ yêu thích' : 'Yêu thích'}">
      ${isFav ? '♥' : '♡'} ${isFav ? 'Yêu thích' : 'Yêu thích'}
    </button>`;
  }

  return {
    initPage, renderNav, renderFooter, toggleDropdown, toggleMobile,
    toast, modal, openModal, closeModal, showLoading, hideLoading,
    formatCurrency, formatDate, formatDateTime, timeAgo,
    statusLabel, statusBadge, stars, categoryLabel, categoryIcon,
    animateCounter, launchConfetti, addRipple, skeleton, favBtn,
  };
})();
