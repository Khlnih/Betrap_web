
    let step = 1;
    let selectedTrap = null;    // { id, name, providerId }
    let selectedAodais = [];    // [{ id, name, price }]
    let wantBetrap = false;
    let allTraps = [];
    let betrapServices = [];

    let selectedBetrapPkg = null; // { name, price, id }

    document.addEventListener('DOMContentLoaded', async () => {
      UI.initPage();
      const sess = API.auth.currentSession();
      if (!sess) {
        UI.modal({ title:'Cần đăng nhập', body:'Vui lòng đăng nhập để đặt dịch vụ.', confirmText:'Đăng nhập', onConfirm:()=>{ location.href='login.html'; return true; } });
      }
      await loadTraps();
      await checkDraft();
    });

    async function loadTraps() {
      const grid = document.getElementById('trap-grid');
      try {
        allTraps = await API.svc.getAll({ category: 'lam-trap' });
        betrapServices = await API.svc.getAll({ category: 'be-trap' });
        if (!allTraps.length) {
          grid.innerHTML = '<div class="empty-wiz"><i class="ri-inbox-line"></i><div>Hiện chưa có tráp nào<br><small>Vui lòng quay lại sau</small></div></div>';
          return;
        }
        grid.innerHTML = allTraps.map(t => {
          const img = t.image && t.image.startsWith('http') ? t.image : (rootPath()+(t.image||''));
          const nameLower = t.name ? t.name.toLowerCase() : '';
          const hasCaoCap = nameLower.includes('cao cấp') || nameLower.includes('vip') || t.subCategory === 'cao-cap';
          const hasNangCao = nameLower.includes('nâng cao') || t.subCategory === 'nang-cao';
          
          let badgeHtml = '';
          if (hasCaoCap) {
            badgeHtml = `<div style="position:absolute;top:10px;right:10px;background:linear-gradient(135deg, var(--gold), #d4af37);color:white;padding:3px 8px;border-radius:20px;font-size:0.7rem;font-weight:700;box-shadow:0 2px 8px rgba(184,148,90,0.3);z-index:2;text-transform:uppercase;letter-spacing:0.5px;border:1px solid rgba(255,255,255,0.4);display:flex;align-items:center;gap:3px;"><i class="ri-vip-crown-fill"></i> Cao cấp</div>`;
          } else if (hasNangCao) {
            badgeHtml = `<div style="position:absolute;top:10px;right:10px;background:linear-gradient(135deg, #4A90E2, #357ABD);color:white;padding:3px 8px;border-radius:20px;font-size:0.7rem;font-weight:700;box-shadow:0 2px 8px rgba(74,144,226,0.3);z-index:2;text-transform:uppercase;letter-spacing:0.5px;border:1px solid rgba(255,255,255,0.4);display:flex;align-items:center;gap:3px;"><i class="ri-star-fill"></i> Nâng cao</div>`;
          }
          
          return `<div class="trap-card" id="tc-${t.id}" onclick="selectTrap('${t.id}')" style="position:relative;">
            ${badgeHtml}
            <img src="${img}" alt="${t.name}" class="trap-card-img" onerror="this.src='https://placehold.co/400x300?text=Tráp'">
            <div class="trap-card-body">
              <div class="trap-card-name">${t.name}</div>
              <div class="trap-card-loc" style="margin-bottom:6px"><i class="ri-map-pin-line"></i> ${t.location||'—'}</div>
              <div style="font-size:1.1rem; color:var(--gold); font-weight:700; margin-bottom:12px;">${UI.formatCurrency(t.price)} / ${t.unit || 'buổi'}</div>
              <div class="trap-card-sel">
                <span style="font-size:.78rem;color:var(--gold);font-weight:600;">Chọn tráp này</span>
                <div class="trap-check" id="trapchk-${t.id}"></div>
              </div>
            </div>
          </div>`;
        }).join('');
      } catch(e) {
        grid.innerHTML = '<div class="empty-wiz"><i class="ri-error-warning-line"></i><div>Lỗi tải dịch vụ</div></div>';
      }
    }

    function selectTrap(id) {
      document.querySelectorAll('.trap-card').forEach(c => c.classList.remove('selected'));
      document.getElementById('tc-'+id).classList.add('selected');

      const t = allTraps.find(t => t.id === id);
      const img = t.image && t.image.startsWith('http') ? t.image : (rootPath()+(t.image||''));
      selectedTrap = { id: t.id, name: t.name, price: t.price, providerId: t.providerId, image: img };
    }

    async function loadAodais() {
      const grid = document.getElementById('aodai-grid');
      grid.innerHTML = '<div class="empty-wiz"><span class="spinner"></span></div>';
      try {
        const linked = await API.svc.getAodaiLinks(selectedTrap.id);
        if (!linked.length) {
          grid.innerHTML = '<div class="empty-wiz"><i class="ri-shirt-line"></i><div>Tráp này chưa có áo dài liên kết<br><small>Bạn có thể bỏ qua bước này</small></div></div>';
          return;
        }
        grid.innerHTML = linked.map(a => {
          const img = a.image && a.image.startsWith('http') ? a.image : (rootPath()+(a.image||''));
          return `<div class="aodai-card" id="ac-${a.id}" onclick="toggleAodai('${a.id}','${a.name.replace(/'/g,"\\'")}', ${a.price || 0}, '${img}')">
            <img src="${img}" alt="${a.name}" class="aodai-card-img" onerror="this.src='https://placehold.co/300x400?text=Áo+Dài'">
            <div class="aodai-card-body">
              <div class="aodai-cb" id="adcb-${a.id}"></div>
              <div style="flex:1">
                <div class="aodai-name">${a.name}</div>
                <div style="font-size:0.8rem;color:var(--gold);font-weight:700;">${UI.formatCurrency(a.price)}</div>
              </div>
            </div>
          </div>`;
        }).join('');
      } catch(e) {
        grid.innerHTML = '<div class="empty-wiz"><i class="ri-error-warning-line"></i><div>Lỗi tải áo dài</div></div>';
      }
    }

    function toggleAodai(id, name, price, image) {
      const idx = selectedAodais.findIndex(a => a.id === id);
      const card = document.getElementById('ac-'+id);
      if (idx >= 0) {
        selectedAodais.splice(idx, 1);
        card.classList.remove('selected');
      } else {
        selectedAodais.push({ id, name, price, image });
        card.classList.add('selected');
      }
    }

    function chooseBetrap(want) {
      if (!want) {
        wantBetrap = false;
        selectedBetrapPkg = null;
        document.getElementById('f-row-betrap').style.display = 'none';
        goToStep(4);
      } else {
        const sameProviderBetrap = betrapServices.find(s => s.providerId === selectedTrap.providerId);
        const betrapSvc = sameProviderBetrap || betrapServices[0];

        wantBetrap = true;
        if (betrapSvc) {
          selectedBetrapPkg = { name: betrapSvc.name, price: betrapSvc.price, id: betrapSvc.id };
          document.getElementById('f-row-betrap').style.display = 'flex';
        } else {
          selectedBetrapPkg = null;
          document.getElementById('f-row-betrap').style.display = 'none';
        }
        goToStep(4);
      }
    }

    function cancelBetrap() {
      document.getElementById('betrap-ask-btns').style.display = 'flex';
      document.getElementById('betrap-pkg-selection').style.display = 'none';
    }

    function confirmBetrapPkg() {
      const radio = document.querySelector('input[name="betrap-pkg"]:checked');
      if (radio) {
        selectedBetrapPkg = { name: radio.value, price: radio.dataset.price };
        wantBetrap = true;
        document.getElementById('f-row-betrap').style.display = 'block';
        goToStep(4);
      } else {
        UI.toast('Vui lòng chọn một gói bê tráp', 'error');
      }
    }

    // ── Navigation ──
    function setStep(s) {
      step = s;
      document.getElementById('step-display').textContent = s;
      for (let i = 1; i <= 5; i++) {
        const ws = document.getElementById('ws-'+i);
        if(ws) ws.className = 'wiz-step' + (i < s ? ' done' : (i === s ? ' active' : ''));
      }
      for (let i = 1; i <= 4; i++) {
        const wl = document.getElementById('wl-'+i);
        if(wl) wl.className = 'wiz-line' + (i < s ? ' done' : '');
      }
      document.querySelectorAll('.wiz-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-'+s).classList.add('active');
      document.getElementById('btn-back').style.display = s > 1 ? 'inline-flex' : 'none';
      document.getElementById('btn-next').style.display = (s < 5 && s !== 3) ? 'inline-flex' : 'none';
      document.getElementById('btn-submit').style.display = s === 5 ? 'inline-flex' : 'none';
      document.getElementById('nav-info').innerHTML = `Bước <strong id="step-display">${s}</strong> / 5`;
      window.scrollTo({ top:0, behavior:'smooth' });
    }

    function goToStep(s) { setStep(s); }

    async function goNext() {
      if (step === 1) {
        if (!selectedTrap) { UI.toast('Vui lòng chọn một bộ tráp để tiếp tục', 'error'); return; }
        await loadAodais();
        goToStep(2);
      } else if (step === 2) {
        updateSummary();
        goToStep(3);
      } else if (step === 4) {
        if (!validateStep4()) return;
        renderBill();
        goToStep(5);
      }
    }

    function goBack() {
      if (step === 2) goToStep(1);
      else if (step === 3) goToStep(2);
      else if (step === 4) goToStep(3);
      else if (step === 5) goToStep(4);
    }

    function updateSummary() {
      const trapName = selectedTrap?.name || '—';
      document.getElementById('summary-trap').innerHTML = `<i class="ri-checkbox-circle-line" style="color:var(--gold)"></i> <strong>Tráp:</strong> ${trapName}`;
      const adText = selectedAodais.length ? selectedAodais.map(a => a.name).join(', ') : 'Chưa chọn áo dài';
      document.getElementById('summary-aodai').innerHTML = `<i class="ri-shirt-line" style="color:var(--gold)"></i> <strong>Áo dài:</strong> ${adText}`;
      const betrapText = wantBetrap ? (selectedBetrapPkg ? `Có (${selectedBetrapPkg.name})` : 'Có') : 'Không';
      document.getElementById('summary-betrap').innerHTML = `<i class="ri-group-line" style="color:var(--gold)"></i> <strong>Đội bê tráp:</strong> ${betrapText}`;
    }

    function validateStep4() {
      const date    = document.getElementById('f-date').value;
      const time    = document.getElementById('f-time').value;
      const address = document.getElementById('f-address').value.trim();
      const qtyAodai = parseInt(document.getElementById('f-qty-aodai').value) || 0;
      const qtyBetrap = parseInt(document.getElementById('f-qty-betrap').value) || 0;

      if (!date)    { UI.toast('Vui lòng chọn ngày diễn ra', 'error'); return false; }
      if (!time)    { UI.toast('Vui lòng chọn giờ chuẩn bị', 'error'); return false; }
      if (!address) { UI.toast('Vui lòng nhập địa chỉ tổ chức', 'error'); return false; }
      if (selectedAodais.length > 0 && qtyAodai <= 0) { UI.toast('Vui lòng nhập số bộ áo dài cần thuê lớn hơn 0', 'error'); return false; }
      if (wantBetrap && qtyBetrap <= 0) { UI.toast('Vui lòng nhập số người đội bê tráp lớn hơn 0', 'error'); return false; }
      return true;
    }

    function renderBill() {
      const address = document.getElementById('f-address').value.trim();
      const date = document.getElementById('f-date').value;
      const time = document.getElementById('f-time').value;
      const note = document.getElementById('f-note').value.trim();

      document.getElementById('bill-address').textContent = address;
      document.getElementById('bill-datetime').textContent = `${time} - ${date}`;
      if (note) {
        document.getElementById('bill-note-row').style.display = 'flex';
        document.getElementById('bill-note').textContent = note;
      } else {
        document.getElementById('bill-note-row').style.display = 'none';
      }

      const qtyAodai = parseInt(document.getElementById('f-qty-aodai').value) || 0;
      const qtyBetrap = parseInt(document.getElementById('f-qty-betrap').value) || 0;
      
      let totalSum = 0;

      // Tráp
      const trapPrice = parseInt(selectedTrap.price) || 0;
      totalSum += trapPrice;
      document.getElementById('bill-trap').innerHTML = `
        <div class="bill-label">Tráp Ăn Hỏi <span class="bill-sub">${selectedTrap.name}</span></div>
        <div class="bill-val">${UI.formatCurrency(trapPrice)}</div>
      `;

      // Áo Dài
      if (selectedAodais.length > 0) {
        let aodaiTotal = 0;
        let aodaiNames = [];
        selectedAodais.forEach(a => {
          aodaiTotal += (parseInt(a.price) || 0) * qtyAodai;
          aodaiNames.push(a.name);
        });
        totalSum += aodaiTotal;
        document.getElementById('bill-aodai').innerHTML = `
          <div class="bill-label">Thuê Áo Dài x ${qtyAodai} bộ <span class="bill-sub">${aodaiNames.join(', ')}</span></div>
          <div class="bill-val">${UI.formatCurrency(aodaiTotal)}</div>
        `;
        document.getElementById('bill-aodai').style.display = 'flex';
      } else {
        document.getElementById('bill-aodai').style.display = 'none';
      }

      // Bê Tráp
      if (wantBetrap && selectedBetrapPkg) {
        const betrapTotal = (parseInt(selectedBetrapPkg.price) || 0) * qtyBetrap;
        totalSum += betrapTotal;
        document.getElementById('bill-betrap').innerHTML = `
          <div class="bill-label">Đội Bê Tráp x ${qtyBetrap} người <span class="bill-sub">${selectedBetrapPkg.name}</span></div>
          <div class="bill-val">${UI.formatCurrency(betrapTotal)}</div>
        `;
        document.getElementById('bill-betrap').style.display = 'flex';
      } else {
        document.getElementById('bill-betrap').style.display = 'none';
      }

      document.getElementById('bill-total-sum').textContent = UI.formatCurrency(totalSum);

      // Render images
      let imgsHtml = '';
      if (selectedTrap && selectedTrap.image) {
         imgsHtml += `<img src="${selectedTrap.image}" style="width:140px;height:140px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.05);" alt="Tráp">`;
      }
      if (selectedAodais.length > 0) {
         selectedAodais.forEach(a => {
            if (a.image) imgsHtml += `<img src="${a.image}" style="width:140px;height:140px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.05);" alt="Áo dài">`;
         });
      }
      document.getElementById('bill-img-container').innerHTML = imgsHtml;
    }

    async function downloadBill() {
      const btn = document.querySelector('button[onclick="downloadBill()"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;border-color:var(--gold) transparent var(--gold) transparent;"></span> Đang xử lý...';
      btn.disabled = true;

      try {
        const billCard = document.querySelector('.bill-card');
        const canvas = await html2canvas(billCard, { scale: 2, backgroundColor: '#ffffff' });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'Hoa-Don-BeTrap.png';
        link.href = dataUrl;
        link.click();
        UI.toast('Đã lưu hóa đơn thành công!', 'success');
      } catch (err) {
        UI.toast('Không thể tải ảnh hóa đơn. Lỗi: ' + err.message, 'error');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }

    function saveDraft() {
      const draft = {
        trapId: selectedTrap?.id,
        aodaiIds: selectedAodais.map(a => a.id),
        wantBetrap,
        date: document.getElementById('f-date').value,
        time: document.getElementById('f-time').value,
        address: document.getElementById('f-address').value,
        qtyAodai: document.getElementById('f-qty-aodai').value,
        qtyBetrap: document.getElementById('f-qty-betrap').value,
        color: document.getElementById('f-color').value,
        note: document.getElementById('f-note').value
      };
      localStorage.setItem('betrap_wizard_draft', JSON.stringify(draft));
      UI.toast('Đã lưu bản nháp thành công! Bạn có thể đóng trang và tiếp tục sau.', 'success');
    }

    async function checkDraft() {
      const draftStr = localStorage.getItem('betrap_wizard_draft');
      if (!draftStr) return;
      try {
        const draft = JSON.parse(draftStr);
        if (!draft.trapId) return;

        UI.modal({
          title: 'Bạn có một bản nháp!',
          body: 'Chúng tôi tìm thấy một bản nháp đặt dịch vụ đang làm dở của bạn. Bạn có muốn tiếp tục khôi phục bản nháp này không?',
          confirmText: 'Khôi phục',
          cancelText: 'Bỏ qua (Xóa nháp)',
          onConfirm: async () => {
            try {
              selectTrap(draft.trapId);
              await loadAodais();
              if (draft.aodaiIds && draft.aodaiIds.length) {
                draft.aodaiIds.forEach(aId => {
                  const card = document.getElementById('ac-'+aId);
                  if(card) card.click();
                });
              }
              document.getElementById('f-date').value = draft.date || '';
              document.getElementById('f-time').value = draft.time || '06:00';
              document.getElementById('f-address').value = draft.address || '';
              document.getElementById('f-qty-aodai').value = draft.qtyAodai || '';
              document.getElementById('f-qty-betrap').value = draft.qtyBetrap || '';
              document.getElementById('f-color').value = draft.color || '';
              document.getElementById('f-note').value = draft.note || '';
              
              if (draft.wantBetrap) chooseBetrap(true);

              if (validateStep4()) {
                renderBill();
                goToStep(5);
                UI.toast('Đã khôi phục bản nháp thành công', 'success');
              } else {
                goToStep(4);
              }
            } catch(err) {
              UI.toast('Không thể khôi phục đầy đủ bản nháp do dữ liệu cũ', 'warning');
            }
            return true;
          },
          onCancel: () => {
            localStorage.removeItem('betrap_wizard_draft');
            return true;
          }
        });
      } catch(e) {}
    }

    async function submitBooking() {
      const sess = API.auth.currentSession();
      if (!sess) return UI.modal({ title:'Cần đăng nhập', body:'Vui lòng đăng nhập.', confirmText:'Đăng nhập', onConfirm:()=>{ location.href='login.html'; return true; } });

      const btn = document.getElementById('btn-submit');
      btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;"></span> Đang xử lý...';

      try {
        const date    = document.getElementById('f-date').value;
        const time    = document.getElementById('f-time').value;
        const address = document.getElementById('f-address').value.trim();
        const qtyAodai = parseInt(document.getElementById('f-qty-aodai').value) || 0;
        const qtyBetrap = parseInt(document.getElementById('f-qty-betrap').value) || 0;
        const color   = document.getElementById('f-color').value.trim();
        const note    = document.getElementById('f-note').value.trim();

        const qtyAodaiStr = qtyAodai > 0 ? ` (SL: ${qtyAodai})` : '';
        const qtyBetrapStr = qtyBetrap > 0 ? ` (SL: ${qtyBetrap})` : '';

        // Xây dựng chuỗi note tổng hợp
        const noteParts = [];
        if (selectedAodais.length) noteParts.push(`[ÁO DÀI] ${selectedAodais.map(a=>a.name).join(', ')}${qtyAodaiStr}`);
        if (wantBetrap && selectedBetrapPkg) noteParts.push(`[BÊ TRÁP] ${selectedBetrapPkg.name}${qtyBetrapStr}`);
        if (color) noteParts.push(`[MÀU/CONCEPT] ${color}`);
        if (note) noteParts.push(`[GHI CHÚ] ${note}`);
        const fullNote = noteParts.join(' \n');

        // Gộp toàn bộ vào 1 giao dịch Tráp
        const trapTxn = await API.txn.create({ 
          serviceId: selectedTrap.id, 
          date, 
          time, 
          address, 
          note: fullNote 
        });

        UI.toast('🎉 Đặt dịch vụ thành công!', 'success');
        setTimeout(() => { location.href = `checkout.html?id=${trapTxn.id}`; }, 800);
      } catch(e) {
        UI.toast(e.message || 'Lỗi khi đặt dịch vụ', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-calendar-check-line"></i> Đặt Dịch Vụ';
      }
    }
  