fetch('https://betrap-web.vercel.app/api/leads', { 
  method: 'POST', 
  headers: {'Content-Type': 'application/json'}, 
  body: JSON.stringify({
    "loaiYeuCau": "day-du", 
    "services": ["mam-trap"], 
    "mamTrap": {"soTrap": 7, "cacTrap": ["trau-cau"], "yeuCauRieng": "test"}, 
    "phongCach": "hien-dai", 
    "khuVuc": "bac", 
    "ngayAnHoi": "2026-10-10", 
    "diaDiem": "Hanoi", 
    "nganSach": "10m", 
    "lienHe": {"hoTen": "User Vercel", "soDienThoai": "0987654321", "zalo": "0987654321", "email": "", "thoiGian": "bat-ky", "kenh": "goi"}
  }) 
}).then(r=>r.text()).then(console.log).catch(console.error);
