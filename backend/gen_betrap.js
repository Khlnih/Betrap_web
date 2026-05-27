const fs = require('fs');

const beTrapData = [
    { id: 'bt1', providerId: 'p1', name: 'Bộ 1 - Hồng Nhạt Thanh Khiết', desc: 'Nam: Áo dài tay cổ đứng màu hồng nhạt trơn, chất liệu lụa satin. Nữ: Áo dài tay rộng màu hồng nhạt, thân áo có hoa văn chìm, phần ngực trang trí hoa 3D đỏ nổi bật.', price: 1500000, img: 'assets/images/betrap-1.jpg', tags: '["Hồng nhạt","Thanh khiết","Nam Nữ"]' },
    { id: 'bt2', providerId: 'p2', name: 'Bộ 2 - Hồng Cam Lấp Lánh', desc: 'Nam: Áo dài tay cổ đứng màu hồng nhạt trơn, lụa satin. Nữ: Áo màu hồng cam ánh kim, họa tiết hoa chìm tinh tế, viền cổ trang trí tua rua.', price: 1800000, img: 'assets/images/betrap-2.jpg', tags: '["Hồng cam","Lấp lánh","Sang trọng"]' },
    { id: 'bt3', providerId: 'p3', name: 'Bộ 3 - Hồng Phấn Hoa Văn', desc: 'Nam: Áo hồng nhạt. Nữ: Áo hồng nhạt họa tiết hoa lớn nổi, cổ cao đính ngọc trai/đá, tay rộng.', price: 1600000, img: 'assets/images/betrap-3.jpg', tags: '["Hồng phấn","Hoa văn","Quý phái"]' },
    { id: 'bt4', providerId: 'p1', name: 'Bộ 4 - Ngà Kem Truyền Thống', desc: 'Nam & Nữ: Cùng tone kem ngà, chất liệu satin bóng nhẹ. Nữ: Áo có họa tiết hoa chìm, cầm hoa sen vàng.', price: 2000000, img: 'assets/images/betrap-4.jpg', tags: '["Ngà kem","Truyền thống","Tinh khiết"]' },
    { id: 'bt5', providerId: 'p2', name: 'Bộ 5 - Trắng Đỏ Kiêu Sa', desc: 'Nam: Kem ngà. Nữ: Áo trắng trong suốt nhẹ, viền cổ đỏ, buộc nơ đỏ, mặc cùng quần đỏ.', price: 2200000, img: 'assets/images/betrap-5.jpg', tags: '["Trắng đỏ","Hiện đại","Cá tính"]' },
    { id: 'bt6', providerId: 'p3', name: 'Bộ 6 - Ngà Voan Mỏng', desc: 'Nam: Kem ngà. Nữ: Áo voan kem mỏng nhẹ, lớp trong, cầm hoa vàng.', price: 1700000, img: 'assets/images/betrap-6.jpg', tags: '["Ngà voan","Nhẹ nhàng","Thơ mộng"]' },
    { id: 'bt7', providerId: 'p1', name: 'Bộ 7 - Trắng Đỏ May Mắn', desc: 'Nam: Kem ngà. Nữ: Áo trắng viền đỏ, quần đỏ, đầu đội bờm đỏ.', price: 1900000, img: 'assets/images/betrap-7.jpg', tags: '["Trắng đỏ","May mắn","Truyền thống"]' },
    { id: 'bt8', providerId: 'p2', name: 'Bộ 8 - Xanh Olive Thanh Bình', desc: 'Nam: Xanh olive nhạt. Nữ: Xanh lá nhạt thêu hoa nhỏ, tay voan, cầm hoa trắng-vàng.', price: 1850000, img: 'assets/images/betrap-8.jpg', tags: '["Xanh olive","Mát mẻ","Tươi mới"]' },
    { id: 'bt9', providerId: 'p3', name: 'Bộ 9 - Hồng Sen Đỏ', desc: 'Nam: Hồng nhạt. Nữ: Áo hồng nhạt họa tiết, mặc quần đỏ.', price: 1650000, img: 'assets/images/betrap-9.jpg', tags: '["Hồng sen","Đỏ","Hài hòa"]' },
    { id: 'bt10', providerId: 'p1', name: 'Bộ 10 - Hồng Gradient', desc: 'Nam: Hồng nhạt. Nữ: Áo hồng gradient (phần trên đậm, dưới nhạt chuyển sang xanh ngọc), họa tiết óng ánh.', price: 2500000, img: 'assets/images/betrap-10.jpg', tags: '["Hồng gradient","Hiện đại","Bắt mắt"]' }
];

let sqlInserts = beTrapData.map(s => `('${s.id}', '${s.providerId}', 'be-trap', '${s.name}', '${s.desc}', ${s.price}, 'buổi', '${s.img}', 'Hà Nội', 4.9, 20, '${s.tags}')`).join(',\n');

console.log(sqlInserts);
