/**
 * BêTráp — "Tìm Dịch Vụ" wizard
 * Standalone module. Injects its own (namespaced) DOM, opens from any element
 * with id="open-service-wizard" (or [data-open-wizard]), and posts the result
 * to the public lead endpoint via API.lead.create().
 *
 * Depends on: css/wizard.css, and (optionally) api.js for API.lead + rootPath().
 */
(function () {
  "use strict";

  // ---- image paths (real assets; works on any page via rootPath) ----
  const RP = (typeof rootPath === 'function') ? rootPath() : '';
  const imgPath = (file) => RP + 'assets/images/' + file;
  const IMG = {
    trap5: imgPath('lamtrap-1.jpg'), trap7: imgPath('lamtrap-2.jpg'), trap9: imgPath('lamtrap-3.jpg'),
    'trau-cau': imgPath('lamtrap-4.jpg'), 'ruou-thuoc': imgPath('lamtrap-5.jpg'),
    'hoa-qua': imgPath('lamtrap-6.jpg'), 'lon-quay': imgPath('lamtrap-8.jpg'),
  };
  const ZALO_OA = "https://zalo.me/0915650548"; // ← Zalo của cửa hàng

  // ---- data ----
  const SERVICES = [
    {id:'mam-trap', ic:'ri-gift-2-line',     name:'Mâm tráp ăn hỏi'},
    {id:'be-trap',  ic:'ri-team-line',        name:'Đội bê tráp'},
    {id:'ao-dai',   ic:'ri-shirt-line',       name:'Thuê áo dài'},
    {id:'mc',       ic:'ri-mic-2-line',       name:'MC dẫn lễ'},
  ];
  // Northern (miền Bắc) trays. img = ảnh thật; nếu chưa có dùng swatch màu.
  const TRAYS = [
    {id:'trau-cau',  emoji:'🍃', name:'Trầu cau',          desc:'Lễ vật mở đầu, bắt buộc', locked:true, img:'trau-cau'},
    {id:'ruou-thuoc',emoji:'🍷', name:'Rượu & thuốc lá',   desc:'Mâm rượu, thuốc hoa lụa', img:'ruou-thuoc'},
    {id:'che',       emoji:'🍵', name:'Chè',               desc:'Chè sen / Thái Nguyên',  color:'#7E9E63'},
    {id:'mut-sen',   emoji:'🪷', name:'Mứt hạt sen',       desc:'Hạt sen sấy, mứt sen',   color:'#D8C29A'},
    {id:'banh-com',  emoji:'🍡', name:'Bánh cốm',          desc:'Đặc sản HN, giấy đỏ',    color:'#9CB07A'},
    {id:'phu-the',   emoji:'💞', name:'Bánh phu thê',      desc:'Cặp bánh su sê',         color:'#C98B8B'},
    {id:'hoa-qua',   emoji:'🍇', name:'Hoa quả – Ngũ quả', desc:'Kết long phụng',         img:'hoa-qua'},
    {id:'xoi-ga',    emoji:'🍙', name:'Xôi gấc & gà',      desc:'Xôi gấc đỏ, gà luộc',    color:'#CD7B5C'},
    {id:'lon-quay',  emoji:'🐷', name:'Lợn sữa quay',      desc:'Heo quay, mâm son',      img:'lon-quay'},
    {id:'banh-kem',  emoji:'🎂', name:'Bánh kem',          desc:'Mâm bánh hiện đại',      color:'#E0D2C0'},
  ];
  const TIERS = [
    {n:5, img:'trap5', name:'Tiêu chuẩn', price:'từ 3,5 triệu', desc:'Mâm truyền thống xếp tháp tròn, trang trí hoa lụa. Sính lễ phổ thông, phom dáng chuẩn theo mẫu.'},
    {n:7, img:'trap7', name:'Nâng cao', price:'từ 5,8 triệu', desc:'Mâm hiện đại, trang trí hoa lụa cao cấp hoặc điểm hoa tươi. Lễ vật thương hiệu, thiết kế sang trọng.', badge:'Chọn nhiều'},
    {n:9, img:'trap9', name:'Cao cấp', price:'từ 8,5 triệu', desc:'Mâm VIP nghệ thuật, 100% hoa tươi hoặc kết long phụng. Lễ vật thượng hạng, thiết kế độc bản.'},
  ];
  const DEFAULTS = {
    5:['trau-cau','ruou-thuoc','che','mut-sen','banh-com'],
    7:['trau-cau','ruou-thuoc','che','mut-sen','banh-com','phu-the','hoa-qua'],
    9:['trau-cau','ruou-thuoc','che','mut-sen','banh-com','phu-the','hoa-qua','xoi-ga','lon-quay'],
  };
  const STYLES=[{id:'truyen-thong',name:'Truyền thống',hint:'Tông đỏ rực rỡ'},{id:'hien-dai',name:'Hiện đại',hint:'Pastel nhẹ nhàng'},{id:'sang-trong',name:'Sang trọng',hint:'Vàng kim cao cấp'}];
  const REGIONS=[{id:'bac',name:'Miền Bắc'},{id:'trung',name:'Miền Trung'},{id:'nam',name:'Miền Nam'}];
  const BUDGETS=['Dưới 5 triệu','5 – 10 triệu','10 – 20 triệu','Trên 20 triệu','Chưa xác định'];
  const TIMES=[{id:'gio-hc',name:'Giờ hành chính'},{id:'toi',name:'Buổi tối (sau 18h)'},{id:'cuoi-tuan',name:'Cuối tuần'},{id:'bat-ky',name:'Bất cứ lúc nào'}];
  const CHANNELS=[{id:'goi',name:'Gọi điện'},{id:'zalo',name:'Zalo'},{id:'ca-hai',name:'Cả hai'}];

  // ---- state ----
  const state={
    services:new Set(['mam-trap']),
    trayCount:null, trays:new Set(), trayNote:'',
    style:null, region:'bac', date:'', location:'', budget:'',
    name:'', phone:'', zalo:'', email:'', consent:false,
    contactTime:'bat-ky', contactChannel:'ca-hai', quickMode:false,
  };
  let stepIdx=0, lastFocus=null, currentMeta='services';

  // ---- inject DOM ----
  const root=document.createElement('div');
  root.innerHTML=`
    <div id="bw-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bw-step-title">
      <div class="modal">
        <div class="m-head">
          <button class="m-close" id="bw-close" aria-label="Đóng"><i class="ri-close-line"></i></button>
          <div class="step-label" id="bw-step-label">Bước 1</div>
          <h2 id="bw-step-title">…</h2>
          <div class="sub" id="bw-step-sub"></div>
          <div class="progress"><i id="bw-bar"></i></div>
        </div>
        <div class="m-body" id="bw-body"></div>
        <div class="m-foot">
          <button class="btn btn-ghost" id="bw-back"><i class="ri-arrow-left-line"></i> Quay lại</button>
          <div class="helper" id="bw-help"></div>
          <button class="btn btn-primary" id="bw-next">Tiếp tục <i class="ri-arrow-right-line"></i></button>
        </div>
      </div>
    </div>
    <div id="bw-zoom-overlay" role="dialog" aria-modal="true">
      <button class="zoom-close" id="bw-zoom-close" aria-label="Đóng ảnh"><i class="ri-close-line"></i></button>
      <div class="zoom-stage" id="bw-zoom-stage"><img id="bw-zoom-img" alt=""></div>
      <div class="zoom-cap" id="bw-zoom-cap"></div>
      <div class="zoom-hint">Bấm vào ảnh để phóng to · màu sắc chỉ mang tính minh hoạ</div>
    </div>`;
  document.addEventListener('DOMContentLoaded', ()=>{ document.body.appendChild(root); init(); });

  // element refs (resolved after inject)
  let overlay, body, elLabel, elTitle, elSub, elBar, btnBack, btnNext, footHelp;
  let zOverlay, zStage, zImg, zCap;

  function init(){
    overlay=document.getElementById('bw-modal-overlay');
    body=document.getElementById('bw-body');
    elLabel=document.getElementById('bw-step-label');
    elTitle=document.getElementById('bw-step-title');
    elSub=document.getElementById('bw-step-sub');
    elBar=document.getElementById('bw-bar');
    btnBack=document.getElementById('bw-back');
    btnNext=document.getElementById('bw-next');
    footHelp=document.getElementById('bw-help');
    zOverlay=document.getElementById('bw-zoom-overlay');
    zStage=document.getElementById('bw-zoom-stage');
    zImg=document.getElementById('bw-zoom-img');
    zCap=document.getElementById('bw-zoom-cap');

    btnNext.onclick=onNext;
    btnBack.onclick=onBack;
    document.getElementById('bw-close').onclick=closeWizard;
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeWizard();});

    zStage.onclick=()=>zStage.classList.toggle('zoomed');
    document.getElementById('bw-zoom-close').onclick=closeZoom;
    zOverlay.addEventListener('click',e=>{if(e.target===zOverlay)closeZoom();});
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      if(zOverlay.classList.contains('open')){closeZoom();return;}
      if(overlay.classList.contains('open'))closeWizard();
    });

    // Wire triggers
    const triggers=[];
    const byId=document.getElementById('open-service-wizard'); if(byId)triggers.push(byId);
    document.querySelectorAll('[data-open-wizard]').forEach(el=>triggers.push(el));
    triggers.forEach(t=>t.addEventListener('click',e=>{e.preventDefault();openWizard();}));

    const sty=document.createElement('style');
    sty.textContent='@keyframes bw-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(sty);
  }

  // ---- steps ----
  function buildSteps(){
    const s=[renderServices];
    if(state.services.has('mam-trap')){
      s.push(renderCount);
      if(state.trayCount===5||state.trayCount===7||state.trayCount===9) s.push(renderTrays);
    }
    s.push(renderDetails, renderContact);
    return s;
  }
  const META={
    services:{label:'Dịch vụ',title:'Bạn đang cần dịch vụ nào?',sub:'Chọn một hoặc nhiều dịch vụ cho ngày ăn hỏi.'},
    count:{label:'Mâm tráp',title:'Bạn muốn bao nhiêu tráp?',sub:'Xem ảnh thật để hình dung màu sắc bộ tráp.'},
    trays:{label:'Tuỳ chọn tráp',title:'Chọn các tráp trong gói',sub:'Bấm để thêm/bỏ. Bấm kính lúp để xem ảnh thật.'},
    details:{label:'Chi tiết',title:'Phong cách & ngày tổ chức',sub:'Giúp đội tư vấn chuẩn bị đúng ý bạn.'},
    contact:{label:'Liên hệ',title:'Để lại thông tin liên hệ',sub:'CSKH sẽ tư vấn và báo giá miễn phí.'},
    quick:{label:'Gọi nhanh',title:'Để tư vấn gọi lại cho bạn',sub:'Chỉ cần tên và số điện thoại — tư vấn liên hệ trong ~15 phút.'},
  };

  function renderServices(){
    body.innerHTML=`
      <div class="trust"><i class="ri-star-fill"></i> 4.9 · 500+ đám hỏi · Tư vấn miễn phí, không ràng buộc</div>
      <div class="opt-grid">${SERVICES.map(s=>`<div class="chip ${state.services.has(s.id)?'on':''}" data-svc="${s.id}"><i class="ic ${s.ic}"></i><span>${s.name}</span><span class="tick"><i class="ri-check-line"></i></span></div>`).join('')}</div>
      <div class="quick-cta" id="bw-go-quick"><div class="q-ic"><i class="ri-phone-fill"></i></div><div><b>Bạn đang bận?</b><span>Để lại số, tư vấn viên gọi lại trong ~15 phút</span></div><i class="q-arrow ri-arrow-right-line"></i></div>`;
    body.querySelectorAll('[data-svc]').forEach(el=>el.onclick=()=>{const id=el.dataset.svc;state.services.has(id)?state.services.delete(id):state.services.add(id);el.classList.toggle('on');refreshNav();});
    body.querySelector('#bw-go-quick').onclick=()=>{state.quickMode=true;render();};
    return 'services';
  }
  function renderCount(){
    body.innerHTML=`
      <div class="opt-grid three">${TIERS.map(t=>`
        <div class="tier-card ${state.trayCount===t.n?'on':''}" data-count="${t.n}">
          <div class="photo"><img src="${IMG[t.img]}" alt="${t.name}">
            ${t.badge?`<span class="topbadge">${t.badge}</span>`:''}
            <button class="zoom-btn" data-zoom="${t.img}" data-cap="${t.name}" aria-label="Phóng to"><i class="ri-zoom-in-line"></i></button></div>
          <div class="body"><div class="t-name">${t.name}</div><div class="t-desc">${t.desc}</div></div>
          <span class="check"><i class="ri-check-line"></i></span></div>`).join('')}</div>
      <div class="advisor ${state.trayCount==='advisor'?'on':''}" data-count="advisor">
        <div class="a-ic"><i class="ri-customer-service-2-line"></i></div>
        <div><b>Mình chưa biết chọn</b><small>Để tư vấn viên gợi ý gói phù hợp theo ngân sách</small></div>
        <span class="tick"><i class="ri-check-line"></i></span></div>`;
    body.querySelectorAll('[data-count]').forEach(el=>el.onclick=(e)=>{
      if(e.target.closest('[data-zoom]'))return;
      const raw=el.dataset.count,n=raw==='advisor'?'advisor':+raw,changed=state.trayCount!==n;
      state.trayCount=n; if(changed&&typeof n==='number')state.trays=new Set(DEFAULTS[5]);
      body.querySelectorAll('[data-count]').forEach(c=>{const cn=c.dataset.count==='advisor'?'advisor':+c.dataset.count;c.classList.toggle('on',cn===n);});
      refreshNav();
    });
    bindZoom(); return 'count';
  }
  function renderTrays(){
    if(!state.trays || state.trays.size === 0 || !state.trays.has('trau-cau')){state.trays=new Set(DEFAULTS[5]);}
    body.innerHTML=`
      <div id="bw-pill" class="count-pill"></div>
      <div class="reassure"><i class="ri-information-line"></i><span>Chưa chắc nên chọn gì? Cứ để mặc định — tư vấn viên sẽ tinh chỉnh giúp bạn khi gọi.</span></div>
      <div class="tray-grid">${TRAYS.map(t=>{
        const on=state.trays.has(t.id);
        const thumb=t.img
          ? `<div class="thumb"><img src="${IMG[t.img]}" alt="${t.name}"><button class="zdot" data-zoom="${t.img}" data-cap="${t.name}" aria-label="Phóng to ${t.name}"><i class="ri-zoom-in-line"></i></button></div>`
          : `<div class="thumb swatch" style="background:linear-gradient(135deg,${shade(t.color,18)},${t.color})">${t.emoji}</div>`;
        return `<div class="tray ${on?'on':''} ${t.locked?'locked':''}" data-tray="${t.id}">${thumb}<div><div class="t-n">${t.name}</div><div class="t-d">${t.desc}</div>${t.locked?'<span class="lock-tag">Bắt buộc</span>':''}</div><span class="pick"><i class="ri-check-line"></i></span></div>`;
      }).join('')}</div>
      <div class="field" style="margin-top:16px"><label for="bw-tray-note">Yêu cầu riêng cho tráp <span style="color:var(--bw-muted);font-weight:400">(không bắt buộc)</span></label>
        <textarea class="in" id="bw-tray-note" placeholder="Ví dụ: tráp trầu cau kết hình trái tim, tông đỏ – vàng…">${esc(state.trayNote)}</textarea></div>`;
    const pill=()=>{const p=document.getElementById('bw-pill');const n=state.trays.size,need=5,full=n===need;p.className='count-pill'+(full?' full':'');p.innerHTML=`<i class="ri-${full?'checkbox-circle':'gift'}-line"></i> Đã chọn ${n}/${need} tráp`;};
    body.querySelectorAll('[data-tray]').forEach(el=>{const id=el.dataset.tray,item=TRAYS.find(t=>t.id===id);if(item.locked)return;
      el.onclick=(e)=>{if(e.target.closest('[data-zoom]'))return;if(state.trays.has(id))state.trays.delete(id);else{if(state.trays.size>=5){flash();return;}state.trays.add(id);}el.classList.toggle('on',state.trays.has(id));pill();refreshNav();};});
    body.querySelector('#bw-tray-note').oninput=e=>state.trayNote=e.target.value;
    bindZoom(); pill(); return 'trays';
  }
  function flash(){const p=document.getElementById('bw-pill');if(p)p.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:260});}
  function renderDetails(){
    body.innerHTML=`
      <div class="field"><label>Phong cách trang trí</label><div class="opt-grid three">${STYLES.map(s=>`<div class="chip sm center ${state.style===s.id?'on':''}" data-style="${s.id}" style="flex-direction:column;gap:2px;padding:12px 8px"><b style="color:var(--bw-dark)">${s.name}</b><small style="color:var(--bw-muted);font-size:.76rem">${s.hint}</small></div>`).join('')}</div></div>
      <div class="field"><label>Khu vực tổ chức</label><div class="opt-grid three">${REGIONS.map(r=>`<div class="chip sm center ${state.region===r.id?'on':''}" data-region="${r.id}">${r.name}</div>`).join('')}</div></div>
      <div class="two-col">
        <div class="field"><label for="bw-date">Ngày ăn hỏi (dự kiến)</label><input type="date" class="in" id="bw-date" value="${state.date==='undecided'?'':state.date}"><label class="consent" style="margin-top:7px"><input type="checkbox" id="bw-nodate" ${state.date==='undecided'?'checked':''}><span>Chưa chốt ngày</span></label></div>
        <div class="field"><label for="bw-budget">Ngân sách dự kiến</label><select class="in" id="bw-budget"><option value="">— Chọn mức —</option>${BUDGETS.map(b=>`<option ${state.budget===b?'selected':''}>${b}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="bw-loc">Địa điểm / tỉnh thành</label><input type="text" class="in" id="bw-loc" placeholder="Ví dụ: Cầu Giấy, Hà Nội" value="${esc(state.location)}"></div>`;
    body.querySelectorAll('[data-style]').forEach(el=>el.onclick=()=>{state.style=el.dataset.style;body.querySelectorAll('[data-style]').forEach(x=>x.classList.toggle('on',x.dataset.style===state.style));});
    body.querySelectorAll('[data-region]').forEach(el=>el.onclick=()=>{state.region=el.dataset.region;body.querySelectorAll('[data-region]').forEach(x=>x.classList.toggle('on',x.dataset.region===state.region));});
    const dEl=body.querySelector('#bw-date'),nd=body.querySelector('#bw-nodate');
    dEl.onchange=e=>{state.date=e.target.value;if(nd)nd.checked=false;};
    if(nd)nd.onchange=e=>{if(e.target.checked){state.date='undecided';dEl.value='';}else{state.date='';}};
    body.querySelector('#bw-budget').onchange=e=>state.budget=e.target.value;
    body.querySelector('#bw-loc').oninput=e=>state.location=e.target.value;
    return 'details';
  }
  function renderContact(){
    body.innerHTML=`
      ${summaryHTML()}
      <div class="two-col">
        <div class="field"><label for="bw-c-name">Họ và tên <span style="color:var(--bw-error)">*</span></label><input type="text" class="in" id="bw-c-name" placeholder="Cô dâu / chú rể" value="${esc(state.name)}"><div class="err-msg" id="bw-e-name">Vui lòng nhập họ tên.</div></div>
        <div class="field"><label for="bw-c-phone">Số điện thoại <span style="color:var(--bw-error)">*</span></label><input type="tel" class="in" id="bw-c-phone" placeholder="09xx xxx xxx" value="${esc(state.phone)}"><div class="err-msg" id="bw-e-phone">Số điện thoại chưa hợp lệ.</div></div>
      </div>
      <div class="two-col">
        <div class="field"><label for="bw-c-zalo">Zalo <span style="color:var(--bw-muted);font-weight:400">(nếu khác SĐT)</span></label><input type="tel" class="in" id="bw-c-zalo" placeholder="Số Zalo" value="${esc(state.zalo)}"></div>
        <div class="field"><label for="bw-c-email">Email <span style="color:var(--bw-muted);font-weight:400">(không bắt buộc)</span></label><input type="email" class="in" id="bw-c-email" placeholder="email@vidu.com" value="${esc(state.email)}"></div>
      </div>
      <div class="field"><label>Khi nào tiện liên hệ bạn?</label><div class="opt-grid two">${TIMES.map(t=>`<div class="chip sm center ${state.contactTime===t.id?'on':''}" data-time="${t.id}">${t.name}</div>`).join('')}</div></div>
      <div class="field"><label>Bạn muốn liên hệ qua?</label><div class="opt-grid three">${CHANNELS.map(c=>`<div class="chip sm center ${state.contactChannel===c.id?'on':''}" data-channel="${c.id}">${c.name}</div>`).join('')}</div></div>
      <label class="consent"><input type="checkbox" id="bw-c-consent" ${state.consent?'checked':''}><span>Tôi đồng ý để đội ngũ BêTráp liên hệ tư vấn qua điện thoại / Zalo về yêu cầu này.</span></label>`;
    const bind=(id,key)=>{const el=body.querySelector(id);el.oninput=e=>{state[key]=e.target.value;el.classList.remove('bad');const m=el.parentNode.querySelector('.err-msg');if(m)m.classList.remove('show');refreshNav();};};
    bind('#bw-c-name','name');bind('#bw-c-phone','phone');bind('#bw-c-zalo','zalo');bind('#bw-c-email','email');
    body.querySelector('#bw-c-consent').onchange=e=>{state.consent=e.target.checked;refreshNav();};
    body.querySelectorAll('[data-time]').forEach(el=>el.onclick=()=>{state.contactTime=el.dataset.time;body.querySelectorAll('[data-time]').forEach(x=>x.classList.toggle('on',x.dataset.time===state.contactTime));});
    body.querySelectorAll('[data-channel]').forEach(el=>el.onclick=()=>{state.contactChannel=el.dataset.channel;body.querySelectorAll('[data-channel]').forEach(x=>x.classList.toggle('on',x.dataset.channel===state.contactChannel));});
    return 'contact';
  }
  function renderQuick(){
    body.innerHTML=`
      <div class="trust"><i class="ri-time-line"></i> Tư vấn viên gọi lại trong ~15 phút</div>
      <div class="field"><label for="bw-q-name">Họ và tên <span style="color:var(--bw-error)">*</span></label><input type="text" class="in" id="bw-q-name" placeholder="Cô dâu / chú rể" value="${esc(state.name)}"><div class="err-msg" id="bw-qe-name">Vui lòng nhập họ tên.</div></div>
      <div class="field"><label for="bw-q-phone">Số điện thoại <span style="color:var(--bw-error)">*</span></label><input type="tel" class="in" id="bw-q-phone" placeholder="09xx xxx xxx" value="${esc(state.phone)}"><div class="err-msg" id="bw-qe-phone">Số điện thoại chưa hợp lệ.</div></div>
      <div class="field"><label>Khi nào tiện gọi bạn?</label><div class="opt-grid two">${TIMES.map(t=>`<div class="chip sm center ${state.contactTime===t.id?'on':''}" data-time="${t.id}">${t.name}</div>`).join('')}</div></div>
      <label class="consent"><input type="checkbox" id="bw-q-consent" ${state.consent?'checked':''}><span>Tôi đồng ý để đội ngũ BêTráp gọi tư vấn cho tôi.</span></label>`;
    body.querySelector('#bw-q-name').oninput=e=>{state.name=e.target.value;e.target.classList.remove('bad');body.querySelector('#bw-qe-name').classList.remove('show');refreshNav();};
    body.querySelector('#bw-q-phone').oninput=e=>{state.phone=e.target.value;e.target.classList.remove('bad');body.querySelector('#bw-qe-phone').classList.remove('show');refreshNav();};
    body.querySelector('#bw-q-consent').onchange=e=>{state.consent=e.target.checked;refreshNav();};
    body.querySelectorAll('[data-time]').forEach(el=>el.onclick=()=>{state.contactTime=el.dataset.time;body.querySelectorAll('[data-time]').forEach(x=>x.classList.toggle('on',x.dataset.time===state.contactTime));});
    return 'quick';
  }

  // ---- helpers ----
  const svcName=id=>(SERVICES.find(s=>s.id===id)||{}).name||id;
  const styleName=id=>(STYLES.find(s=>s.id===id)||{}).name||'—';
  const regionName=id=>(REGIONS.find(r=>r.id===id)||{}).name||'—';
  const timeName=id=>(TIMES.find(t=>t.id===id)||{}).name||'—';
  const channelName=id=>(CHANNELS.find(c=>c.id===id)||{}).name||'—';
  const trayNames=()=>[...state.trays].map(id=>(TRAYS.find(t=>t.id===id)||{}).name).filter(Boolean);
  function esc(s){return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=Math.min(255,(n>>16)+amt),g=Math.min(255,(n>>8&255)+amt),b=Math.min(255,(n&255)+amt);return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
  function summaryHTML(){
    const rows=[['Dịch vụ',[...state.services].map(svcName).join(', ')||'—']];
    if(state.services.has('mam-trap')&&state.trayCount){
      if(state.trayCount==='advisor')rows.push(['Mâm tráp','Để tư vấn viên gợi ý']);
      else{rows.push(['Gói mâm tráp',state.trayCount+' tráp']);rows.push(['Các tráp',trayNames().join(' · ')||'—']);}
    }
    if(state.style)rows.push(['Phong cách',styleName(state.style)]);
    rows.push(['Khu vực',regionName(state.region)]);
    rows.push(['Ngày ăn hỏi',state.date==='undecided'?'Chưa chốt':(state.date?new Date(state.date).toLocaleDateString('vi-VN'):'—')]);
    if(state.budget)rows.push(['Ngân sách',state.budget]);
    return `<div class="recap"><h4>Tóm tắt yêu cầu</h4>${rows.map(r=>`<div class="row"><span class="k">${r[0]}</span><span class="v">${esc(r[1])}</span></div>`).join('')}</div>`;
  }
  const phoneOK=v=>{const c=(v||'').replace(/[\s.\-]/g,'');return /^(0\d{9}|(\+?84)\d{9})$/.test(c);};
  function canContinue(meta){
    switch(meta){
      case 'services':return state.services.size>0;
      case 'count':return state.trayCount!==null;
      case 'trays':return state.trays.size===5;
      case 'details':return true;
      case 'contact':case 'quick':return state.name.trim()&&phoneOK(state.phone)&&state.consent;
      default:return true;
    }
  }
  function helperFor(meta){
    if(meta==='trays'){const n=state.trays.size,need=5;return n===need?'':`Chọn thêm ${need-n} tráp nữa`;}
    if((meta==='contact'||meta==='quick')&&!state.consent)return 'Vui lòng tích đồng ý để gửi';
    if(meta==='services'&&state.services.size===0)return 'Chọn ít nhất 1 dịch vụ';
    return '';
  }

  // ---- orchestration ----
  function render(){
    if(state.quickMode){
      currentMeta=renderQuick();const m=META.quick;
      elLabel.textContent=m.label;elTitle.textContent=m.title;elSub.textContent=m.sub;elBar.style.width='100%';
      btnBack.style.visibility='visible';btnBack.innerHTML='<i class="ri-arrow-left-line"></i> Đặt câu hỏi';
      btnNext.innerHTML='<i class="ri-phone-fill"></i> Gửi & nhận cuộc gọi';
      body.scrollTop=0;refreshNav();return;
    }
    const steps=buildSteps();
    stepIdx=Math.min(stepIdx,steps.length-1);
    currentMeta=steps[stepIdx]();
    const m=META[currentMeta];
    elLabel.textContent=`Bước ${stepIdx+1}/${steps.length} · ${m.label}`;
    elTitle.textContent=m.title;elSub.textContent=m.sub;
    elBar.style.width=((stepIdx+1)/steps.length*100)+'%';
    btnBack.style.visibility=stepIdx===0?'hidden':'visible';
    btnBack.innerHTML='<i class="ri-arrow-left-line"></i> Quay lại';
    btnNext.innerHTML=(stepIdx===steps.length-1)?'<i class="ri-send-plane-fill"></i> Gửi yêu cầu':'Tiếp tục <i class="ri-arrow-right-line"></i>';
    body.scrollTop=0;refreshNav();
  }
  function refreshNav(){btnNext.disabled=!canContinue(currentMeta);footHelp.textContent=helperFor(currentMeta);footHelp.className='helper'+(footHelp.textContent?' warn':'');}
  function onNext(){
    if(state.quickMode){if(!canContinue('quick')){showErrs('q');return;}submit('quick');return;}
    const steps=buildSteps();
    if(!canContinue(currentMeta)){if(currentMeta==='contact')showErrs('c');return;}
    if(stepIdx===steps.length-1){submit('full');return;}
    stepIdx++;render();
  }
  function onBack(){if(state.quickMode){state.quickMode=false;render();return;}if(stepIdx>0){stepIdx--;render();}}
  function showErrs(p){
    const nameId='bw-'+p+'-name',phoneId='bw-'+p+'-phone',errN='bw-'+(p==='q'?'qe':'e')+'-name',errP='bw-'+(p==='q'?'qe':'e')+'-phone';
    const n=body.querySelector('#'+nameId),ph=body.querySelector('#'+phoneId);
    if(n&&!state.name.trim()){n.classList.add('bad');document.getElementById(errN).classList.add('show');}
    if(ph&&!phoneOK(state.phone)){ph.classList.add('bad');document.getElementById(errP).classList.add('show');}
  }

  function buildPayload(mode){
    if(mode==='quick') return {
      loaiYeuCau:'goi-nhanh',
      lienHe:{hoTen:state.name,soDienThoai:state.phone,thoiGian:state.contactTime,kenh:'goi'},
      taoLuc:new Date().toISOString(),
    };
    return {
      loaiYeuCau:'day-du',
      services: Array.from(state.services),
      mamTrap: state.services.has('mam-trap') ? {
        soTrap: state.trayCount==='advisor'?'tu-van-goi-y':state.trayCount,
        cacTrap: state.trayCount==='advisor'?[]:Array.from(state.trays),
        yeuCauRieng: state.trayNote
      } : null,
      phongCach:state.style, khuVuc:state.region, ngayAnHoi:state.date,
      diaDiem:state.location, nganSach:state.budget,
      lienHe:{hoTen:state.name,soDienThoai:state.phone,zalo:state.zalo||state.phone,email:state.email,thoiGian:state.contactTime,kenh:state.contactChannel},
      taoLuc:new Date().toISOString(),
    };
  }

  async function submit(mode){
    btnNext.disabled=true; btnNext.innerHTML='<i class="ri-loader-4-line" style="animation:bw-spin 1s linear infinite"></i> Đang gửi…';
    const payload=buildPayload(mode);
    let code='BT-'+Math.random().toString(36).slice(2,8).toUpperCase();
    let apiSaved=false, apiOffline=false;
    try{
      if(window.API && API.lead && API.lead.create){
        const r=await API.lead.create(payload);
        if(r && r.id){ code=r.id; apiSaved=true; }
        else { apiSaved=true; }
      }else{
        apiOffline=true;
        console.warn('[wizard] API.lead.create không có — chạy chế độ offline.', payload);
      }
    }catch(err){
      console.error('[wizard] Gửi lead thất bại:', err && err.message, payload);
      const isNetwork=/Failed to fetch|NetworkError|net::ERR/i.test(err && err.message||'');
      if(isNetwork){
        apiOffline=true;
      } else {
        // Lỗi rõ ràng từ server (400/500) — báo lỗi cho user
        btnNext.disabled=false;
        btnNext.innerHTML='<i class="ri-send-plane-fill"></i> Gửi yêu cầu';
        footHelp.textContent='Gửi thất bại: '+(err && err.message||'Lỗi máy chủ. Vui lòng thử lại.');
        footHelp.className='helper warn';
        return;
      }
    }
    if(apiOffline){
      const pending = JSON.parse(localStorage.getItem('bt_pending_leads') || '[]');
      const b = payload.mamTrap;
      const c = payload.lienHe;
      pending.push({
        id: code,
        name: c?.hoTen,
        phone: c?.soDienThoai,
        zalo: c?.zalo,
        email: c?.email,
        services: payload.services || [],
        traycount: b?.soTrap,
        trays: b?.cacTrap || [],
        traynote: b?.yeuCauRieng,
        style: payload.phongCach,
        region: payload.khuVuc,
        weddingdate: payload.ngayAnHoi,
        location: payload.diaDiem,
        budget: payload.nganSach,
        contacttime: c?.thoiGian,
        contactchannel: c?.kenh,
        requesttype: payload.loaiYeuCau,
        status: 'new',
        createdat: payload.taoLuc
      });
      localStorage.setItem('bt_pending_leads', JSON.stringify(pending));
    }
    showSuccess(mode, code, apiSaved, apiOffline);
  }

  function showSuccess(mode, code, apiSaved, apiOffline){
    const extra = mode==='quick'
      ? `<p>Tư vấn viên sẽ gọi cho bạn qua số <b>${esc(state.phone)}</b> trong <b>~15 phút</b> (${timeName(state.contactTime)}).</p>`
      : `<p>Cảm ơn <b>${esc(state.name)||'bạn'}</b>. Đội ngũ CSKH sẽ liên hệ qua <b>${channelName(state.contactChannel)}</b> trong vòng <b>24 giờ</b> (${timeName(state.contactTime)}) để tư vấn và báo giá.</p>`;
    const offlineNote = apiOffline
      ? `<div style="margin-top:12px;padding:10px 14px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.4);border-radius:10px;font-size:.82rem;color:#92400e;"><i class="ri-wifi-off-line"></i> Lưu ý: Yêu cầu được ghi nhận nhưng chưa lưu vào hệ thống (server đang offline). Vui lòng <a href="https://zalo.me/" target="_blank" style="color:#b45309;font-weight:700;">nhắn Zalo</a> hoặc gọi lại sau.</div>`
      : '';
    body.innerHTML=`<div class="success">
      <div class="seal"><i class="ri-check-line"></i></div>
      <h2>Đã gửi yêu cầu!</h2>${extra}
      <div class="code-tag">Mã yêu cầu: ${esc(code)}</div>
      ${offlineNote}
      <div class="succ-actions">
        <a class="btn btn-zalo" href="${ZALO_OA}" target="_blank" rel="noopener"><i class="ri-wechat-line"></i> Nhắn Zalo ngay</a>
        <button class="btn btn-ghost" id="bw-succ-close"><i class="ri-home-4-line"></i> Đóng</button>
      </div>
      ${mode==='quick'?'':`<div style="margin-top:20px">${summaryHTML()}</div>`}
    </div>`;
    elLabel.textContent='Hoàn tất';elTitle.textContent='Yêu cầu đã được tiếp nhận';elSub.textContent='';
    elBar.style.width='100%';btnBack.style.visibility='hidden';btnNext.style.display='none';footHelp.textContent='';
    body.querySelector('#bw-succ-close').onclick=closeWizard;
    if(!matchMedia('(prefers-reduced-motion:reduce)').matches)confetti();
  }

  // ---- open / close ----
  function openWizard(){
    lastFocus=document.activeElement;
    // reset for a fresh session
    state.quickMode=false; stepIdx=0; btnNext.style.display='';
    render();
    overlay.classList.add('open'); document.body.style.overflow='hidden';
    setTimeout(()=>{const f=body.querySelector('button,input,select,textarea,[tabindex]');if(f)f.focus();},120);
  }
  function closeWizard(){overlay.classList.remove('open');document.body.style.overflow='';if(lastFocus&&lastFocus.focus)lastFocus.focus();}

  // ---- zoom ----
  function openZoom(key,cap){zImg.src=IMG[key]||key;zCap.textContent=cap||'';zStage.classList.remove('zoomed');zOverlay.classList.add('open');}
  function closeZoom(){zOverlay.classList.remove('open');zStage.classList.remove('zoomed');}
  function bindZoom(){body.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();openZoom(b.dataset.zoom,b.dataset.cap);});}

  // ---- confetti ----
  function confetti(){
    const colors=['#D4B996','#A68C6A','#EAE0D0','#6B8E23','#C9A96E'];
    const rect=overlay.getBoundingClientRect();
    for(let i=0;i<48;i++){
      const c=document.createElement('div'),size=Math.random()*8+5;
      c.style.cssText=`position:fixed;left:${rect.width/2}px;top:150px;width:${size}px;height:${size}px;background:${colors[i%colors.length]};border-radius:${Math.random()>.5?'50%':'2px'};z-index:1200;pointer-events:none`;
      overlay.appendChild(c);
      const a=Math.random()*Math.PI*2,v=80+Math.random()*150;
      c.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${Math.cos(a)*v}px,${Math.sin(a)*v-120}px) rotate(${Math.random()*360}deg)`,opacity:1,offset:.7},{transform:`translate(${Math.cos(a)*v}px,${Math.sin(a)*v+260}px) rotate(${Math.random()*720}deg)`,opacity:0}],{duration:1400+Math.random()*700,easing:'cubic-bezier(.37,0,.63,1)'}).onfinish=()=>c.remove();
    }
  }
})();
