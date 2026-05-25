-- BêTráp SQL Server Database Schema & Seed Data
-- ==========================================================
-- Version 2.0 — Thêm Favorites, bcrypt password support

-- Tạo Database (Bỏ comment nếu chạy trên SSMS và chưa có DB)
-- CREATE DATABASE BeTrapDB;
-- GO
-- USE BeTrapDB;
-- GO

-- 1. Bảng Users
CREATE TABLE Users (
    Id VARCHAR(50) PRIMARY KEY,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(500) NOT NULL, -- bcrypt hash (60 chars) or plain text legacy
    Name VARCHAR(100) NOT NULL,
    Role VARCHAR(20) DEFAULT 'customer', -- 'customer' hoặc 'provider'
    Phone VARCHAR(20),
    Avatar VARCHAR(100),
    Verified BOOLEAN DEFAULT false,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.1 Bảng CustomerProfiles
CREATE TABLE CustomerProfiles (
    UserId VARCHAR(50) PRIMARY KEY REFERENCES Users(Id),
    Location VARCHAR(200),
    WeddingDate DATE
);

-- 1.2 Bảng ProviderProfiles
CREATE TABLE ProviderProfiles (
    UserId VARCHAR(50) PRIMARY KEY REFERENCES Users(Id),
    Location VARCHAR(200),
    Bio VARCHAR(500),
    Bank VARCHAR(100)
);

-- 2. Bảng Services
CREATE TABLE Services (
    Id VARCHAR(50) PRIMARY KEY,
    ProviderId VARCHAR(50) NOT NULL REFERENCES Users(Id),
    Category VARCHAR(50) NOT NULL,
    Name VARCHAR(200) NOT NULL,
    Description VARCHAR(1000),
    Price DECIMAL(18,0) NOT NULL,
    Unit VARCHAR(50),
    Image VARCHAR(500),
    Location VARCHAR(200),
    Active BOOLEAN DEFAULT true,
    Rating FLOAT DEFAULT 0,
    ReviewCount INT DEFAULT 0,
    Tags VARCHAR(200), -- Lưu dạng JSON array hoặc chuỗi cách phẩy
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Transactions
CREATE TABLE Transactions (
    Id VARCHAR(50) PRIMARY KEY,
    CustomerId VARCHAR(50) NOT NULL REFERENCES Users(Id),
    ProviderId VARCHAR(50) NOT NULL REFERENCES Users(Id),
    ServiceId VARCHAR(50) NOT NULL REFERENCES Services(Id),
    ServiceName VARCHAR(200),
    Price DECIMAL(18,0),
    Date DATE NOT NULL,
    Time TIME NOT NULL,
    Address VARCHAR(500) NOT NULL,
    Note VARCHAR(1000),
    Status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, done, cancelled
    CancelReason VARCHAR(500) NULL,       -- Lý do từ chối (provider điền khi cancelled)
    PaymentMethod VARCHAR(50),
    PaymentStatus VARCHAR(20) DEFAULT 'unpaid', -- unpaid, paid
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nếu DB đã tồn tại, chạy lệnh ALTER này thay vì tạo lại bảng:
-- ALTER TABLE Transactions ADD CancelReason VARCHAR(500) NULL;
-- GO

-- 4. Bảng Conversations
CREATE TABLE Conversations (
    Id VARCHAR(50) PRIMARY KEY,
    ServiceId VARCHAR(50) REFERENCES Services(Id),
    LastMessage VARCHAR(1000),
    LastAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.1 Bảng ConversationParticipants
CREATE TABLE ConversationParticipants (
    ConversationId VARCHAR(50) REFERENCES Conversations(Id),
    UserId VARCHAR(50) REFERENCES Users(Id),
    PRIMARY KEY (ConversationId, UserId)
);

-- 5. Bảng Messages
CREATE TABLE Messages (
    Id VARCHAR(50) PRIMARY KEY,
    ConversationId VARCHAR(50) NOT NULL REFERENCES Conversations(Id),
    SenderId VARCHAR(50) NOT NULL REFERENCES Users(Id),
    Content TEXT NOT NULL,
    IsRead BOOLEAN DEFAULT false,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng Reviews
CREATE TABLE Reviews (
    Id VARCHAR(50) PRIMARY KEY,
    ServiceId VARCHAR(50) NOT NULL REFERENCES Services(Id),
    CustomerId VARCHAR(50) NOT NULL REFERENCES Users(Id),
    TransactionId VARCHAR(50) NOT NULL REFERENCES Transactions(Id),
    Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Comment VARCHAR(1000),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bảng Favorites (Wishlist)
CREATE TABLE Favorites (
    UserId    VARCHAR(50) NOT NULL REFERENCES Users(Id),
    ServiceId VARCHAR(50) NOT NULL REFERENCES Services(Id),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserId, ServiceId)
);

-- 8. Bảng Consultations (Đặt lịch tư vấn)
CREATE TABLE Consultations (
    Id VARCHAR(50) PRIMARY KEY,
    CustomerId VARCHAR(50) NOT NULL REFERENCES Users(Id),
    ProviderId VARCHAR(50) NOT NULL REFERENCES Users(Id),
    ServiceId VARCHAR(50) NOT NULL REFERENCES Services(Id),
    ServiceName VARCHAR(200),
    Date DATE NOT NULL,
    Time TIME NOT NULL,
    Address VARCHAR(500) NOT NULL,
    Note VARCHAR(1000),
    Status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, done
    ProviderNote VARCHAR(1000) NULL,      -- Lời nhắn/Lý do của nhà cung cấp
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- DỮ LIỆU MẪU (SEED DATA)
-- ==========================================================

-- Seed Users
INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Phone, Avatar, Verified) VALUES
('p1', 'lan@betrap.vn', '123456', 'Lan Ngọc Wedding', 'provider', '0901234567', 'L', true),
('p2', 'thienphuc@betrap.vn', '123456', 'Áo Dài Thiên Phúc', 'provider', '0912345678', 'TP', true),
('p3', 'kimcuong@betrap.vn', '123456', 'Studio Kim Cương', 'provider', '0923456789', 'KC', true),
('c1', 'mai@gmail.com', '123456', 'Nguyễn Thị Mai', 'customer', '0934567890', 'NM', false);

-- Seed ProviderProfiles
INSERT INTO ProviderProfiles (UserId, Location, Bio, Bank) VALUES
('p1', 'Hà Nội', 'Đội bê tráp chuyên nghiệp 5 năm kinh nghiệm', 'VCB 0123456789 - LAN NGOC'),
('p2', 'TP. HCM', 'Cho thuê áo dài cao cấp', 'TCB 9876543210 - THIEN PHUC'),
('p3', 'Đà Nẵng', 'Media & Make up chuyên nghiệp', 'MB 1122334455 - KIM CUONG');

-- Seed CustomerProfiles
INSERT INTO CustomerProfiles (UserId, Location, WeddingDate) VALUES
('c1', 'Hà Nội', '2024-12-15');

-- Seed Services
INSERT INTO Services (Id, ProviderId, Category, Name, Description, Price, Unit, Image, Location, Rating, ReviewCount, Tags) VALUES
('s1', 'p1', 'be-trap', 'Gói Bê Tráp Tiêu Chuẩn (Nam)', 'Đội bê tráp 5 nam thanh lịch, trang phục áo dài truyền thống đỏ.', 1500000, 'buổi', 'assets/images/betrap-1.jpg', 'Hà Nội', 4.8, 24, '["5 người","Nam","Truyền thống"]'),
('s2', 'p1', 'be-trap', 'Gói Bê Tráp Tiêu Chuẩn (Nữ)', 'Đội bê tráp 5 nữ xinh xắn, áo dài hồng pastel nhẹ nhàng.', 1500000, 'buổi', 'assets/images/betrap-2.jpg', 'Hà Nội', 4.7, 18, '["5 người","Nữ"]'),
('s3', 'p2', 'be-trap', 'Gói Bê Tráp Áo Dài Đỏ', 'Đội hình 7 người, áo dài đỏ rực rỡ mang lại may mắn cho ngày cưới.', 2100000, 'buổi', 'assets/images/betrap-4.jpg', 'Hà Nội', 4.9, 35, '["7 người","Áo dài đỏ"]'),
('s4', 'p2', 'be-trap', 'Gói Bê Tráp Áo Dài Vàng', 'Đội hình 7 người, trang phục áo dài vàng kim sang trọng.', 2200000, 'buổi', 'assets/images/betrap-5.jpg', 'Hà Nội', 4.8, 21, '["7 người","Áo dài vàng"]'),
('s5', 'p1', 'be-trap', 'Gói Bê Tráp Cao Cấp (VIP)', 'Đội hình 9 người cao ráo, trang phục thiết kế riêng, chuyên nghiệp.', 3500000, 'buổi', 'assets/images/betrap-7.jpg', 'Hà Nội', 5.0, 42, '["9 người","VIP","Thiết kế"]'),
('s6', 'p3', 'be-trap', 'Gói Bê Tráp Kèm Xe Hoa', 'Đội bê tráp 5 người kèm dịch vụ xe hoa sang trọng phục vụ đưa rước.', 5000000, 'ngày', 'assets/images/betrap-25.jpg', 'Hà Nội', 4.9, 12, '["5 người","Xe hoa"]'),
('s7', 'p3', 'be-trap', 'Gói Bê Tráp Truyền Thống Xưa', 'Đội hình 7 người mặc áo tấc, khăn vấn đậm chất truyền thống Bắc Bộ.', 2800000, 'buổi', 'assets/images/betrap-12.jpg', 'Hà Nội', 4.8, 15, '["7 người","Áo tấc","Cổ điển"]'),
('s8', 'p2', 'be-trap', 'Gói Bê Tráp Hiện Đại', 'Đội hình 9 người, trang phục suit và áo dài cách tân hiện đại.', 3200000, 'buổi', 'assets/images/betrap-22.jpg', 'Hà Nội', 4.6, 28, '["9 người","Hiện đại"]'),
('s9', 'p2', 'ao-dai', 'Cho Thuê Áo Dài Cô Dâu Đỏ', 'Áo dài lụa tơ tằm cao cấp màu đỏ, thêu họa tiết hoa sen tinh xảo.', 800000, 'ngày', 'assets/images/aodai-1.jpg', 'Hà Nội', 4.9, 15, '["Cô dâu","Đỏ","Lụa"]'),
('s10', 'p2', 'ao-dai', 'Thuê Áo Dài Cặp Đôi (Đỏ)', 'Combo áo dài cặp cô dâu chú rể màu đỏ truyền thống.', 1500000, 'ngày', 'assets/images/aodai-2.jpg', 'Hà Nội', 4.8, 22, '["Cặp đôi","Đỏ"]'),
('s11', 'p2', 'ao-dai', 'Áo Dài Bê Tráp Nữ (Hồng)', 'Cho thuê theo dàn 5-7 bộ, áo dài hồng phấn nhẹ nhàng cho đội bê tráp.', 150000, 'bộ', 'assets/images/aodai-3.jpg', 'Hà Nội', 4.7, 45, '["Bê tráp","Hồng","Nữ"]'),
('s12', 'p1', 'ao-dai', 'Áo Dài Chú Rể Xanh Đen', 'Áo dài gấm xanh đen sang trọng, form đứng nam tính.', 900000, 'ngày', 'assets/images/aodai-4.jpg', 'Hà Nội', 4.8, 12, '["Chú rể","Gấm"]'),
('s13', 'p2', 'ao-dai', 'Áo Dài Bê Tráp Nữ (Vàng)', 'Áo dài vàng tươi tắn, tay bồng hiện đại cho dàn bưng quả.', 160000, 'bộ', 'assets/images/aodai-5.jpg', 'Hà Nội', 4.9, 38, '["Bê tráp","Vàng"]'),
('s14', 'p3', 'ao-dai', 'Combo 9 Bộ Áo Dài Nam Nữ', 'Trọn gói thuê 9 bộ áo dài nam (xanh) và nữ (hồng) ton-sur-ton.', 1400000, 'ngày', 'assets/images/aodai-6.jpg', 'Hà Nội', 5.0, 19, '["Combo 9 bộ","Nam nữ"]'),
('s15', 'p1', 'ao-dai', 'Áo Dài Mẹ Cô Dâu', 'Áo dài nhung đính kết hạt cườm lấp lánh dành cho bà sui.', 1200000, 'ngày', 'assets/images/aodai-7.jpg', 'Hà Nội', 4.8, 27, '["Mẹ cô dâu","Nhung"]'),
('s16', 'p2', 'ao-dai', 'Áo Dài Trắng Tinh Khôi', 'Áo dài lụa trắng trơn, thanh lịch và tinh tế cho ngày ăn hỏi.', 700000, 'ngày', 'assets/images/aodai-8.jpg', 'Hà Nội', 4.9, 31, '["Cô dâu","Trắng","Trơn"]'),
('s17', 'p1', 'lam-trap', 'Mâm Tráp 5 Lễ Truyền Thống', 'Bộ 5 mâm tráp cơ bản: trầu cau, rượu thuốc, chè sen, hoa quả, phu thê.', 3500000, 'bộ', 'assets/images/lamtrap-1.jpg', 'Hà Nội', 4.8, 52, '["5 mâm","Truyền thống"]'),
('s18', 'p2', 'lam-trap', 'Mâm Tráp 7 Lễ Cao Cấp', 'Bộ 7 mâm tráp được trang trí hoa tươi nghệ thuật, cầu kỳ sang trọng.', 5800000, 'bộ', 'assets/images/lamtrap-2.jpg', 'Hà Nội', 4.9, 41, '["7 mâm","Hoa tươi","Cao cấp"]'),
('s19', 'p3', 'lam-trap', 'Mâm Tráp 9 Lễ Rồng Phượng', 'Bộ 9 mâm tráp cực khủng với tráp rồng phượng trái cây sống động.', 8500000, 'bộ', 'assets/images/lamtrap-3.jpg', 'Hà Nội', 5.0, 26, '["9 mâm","Rồng phượng","VIP"]'),
('s20', 'p1', 'lam-trap', 'Tráp Trầu Cau Kết Trái Tim', 'Tráp trầu cau kết hình trái tim chữ Hỷ tỉ mỉ, mâm sơn mài đỏ.', 900000, 'mâm', 'assets/images/lamtrap-4.jpg', 'Hà Nội', 4.8, 88, '["Trầu cau","Trái tim"]'),
('s21', 'p2', 'lam-trap', 'Tráp Rượu Thuốc Tây Nhập', 'Mâm rượu Chivas và thuốc lá ngoại nhập trang trí hoa lụa.', 1500000, 'mâm', 'assets/images/lamtrap-5.jpg', 'Hà Nội', 4.7, 34, '["Rượu thuốc","Cao cấp"]'),
('s22', 'p1', 'lam-trap', 'Mâm Tráp Trái Cây Long Phụng', 'Kết rồng phượng bằng ngũ quả cực kỳ hoành tráng và may mắn.', 2200000, 'mâm', 'assets/images/lamtrap-6.jpg', 'Hà Nội', 4.9, 15, '["Trái cây","Long Phụng"]'),
('s23', 'p3', 'lam-trap', 'Gói 7 Mâm Tráp Hiện Đại', 'Sử dụng mâm mica trong suốt, hoa tươi tone pastel hiện đại.', 6200000, 'bộ', 'assets/images/lamtrap-7.jpg', 'Hà Nội', 4.8, 22, '["7 mâm","Mica","Hiện đại"]'),
('s24', 'p2', 'lam-trap', 'Tráp Heo Quay Cưới Hỏi', 'Heo sữa quay nguyên con, trang trí nơ đỏ mâm son.', 1800000, 'mâm', 'assets/images/lamtrap-8.jpg', 'Hà Nội', 4.9, 47, '["Heo quay","Mặn"]');

-- Seed Transactions
-- (Deleted old mock transactions because they don't match the new data well)

-- Seed Reviews
-- (Deleted old mock reviews)

-- Seed Chat
-- (Deleted old mock chats)

