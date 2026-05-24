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
    Email NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(500) NOT NULL, -- bcrypt hash (60 chars) or plain text legacy
    Name NVARCHAR(100) NOT NULL,
    Role VARCHAR(20) DEFAULT 'customer', -- 'customer' hoặc 'provider'
    Phone VARCHAR(20),
    Avatar VARCHAR(100),
    Verified BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 1.1 Bảng CustomerProfiles
CREATE TABLE CustomerProfiles (
    UserId VARCHAR(50) PRIMARY KEY FOREIGN KEY REFERENCES Users(Id),
    Location NVARCHAR(200),
    WeddingDate DATE
);
GO

-- 1.2 Bảng ProviderProfiles
CREATE TABLE ProviderProfiles (
    UserId VARCHAR(50) PRIMARY KEY FOREIGN KEY REFERENCES Users(Id),
    Location NVARCHAR(200),
    Bio NVARCHAR(500),
    Bank NVARCHAR(100)
);
GO

-- 2. Bảng Services
CREATE TABLE Services (
    Id VARCHAR(50) PRIMARY KEY,
    ProviderId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
    Category VARCHAR(50) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    Price DECIMAL(18,0) NOT NULL,
    Unit NVARCHAR(50),
    Image VARCHAR(500),
    Location NVARCHAR(200),
    Active BIT DEFAULT 1,
    Rating FLOAT DEFAULT 0,
    ReviewCount INT DEFAULT 0,
    Tags NVARCHAR(200), -- Lưu dạng JSON array hoặc chuỗi cách phẩy
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 3. Bảng Transactions
CREATE TABLE Transactions (
    Id VARCHAR(50) PRIMARY KEY,
    CustomerId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
    ProviderId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
    ServiceId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Services(Id),
    ServiceName NVARCHAR(200),
    Price DECIMAL(18,0),
    Date DATE NOT NULL,
    Time TIME NOT NULL,
    Address NVARCHAR(500) NOT NULL,
    Note NVARCHAR(1000),
    Status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, done, cancelled
    CancelReason NVARCHAR(500) NULL,       -- Lý do từ chối (provider điền khi cancelled)
    PaymentMethod VARCHAR(50),
    PaymentStatus VARCHAR(20) DEFAULT 'unpaid', -- unpaid, paid
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Nếu DB đã tồn tại, chạy lệnh ALTER này thay vì tạo lại bảng:
-- ALTER TABLE Transactions ADD CancelReason NVARCHAR(500) NULL;
-- GO

-- 4. Bảng Conversations
CREATE TABLE Conversations (
    Id VARCHAR(50) PRIMARY KEY,
    ServiceId VARCHAR(50) FOREIGN KEY REFERENCES Services(Id),
    LastMessage NVARCHAR(1000),
    LastAt DATETIME DEFAULT GETDATE(),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 4.1 Bảng ConversationParticipants
CREATE TABLE ConversationParticipants (
    ConversationId VARCHAR(50) FOREIGN KEY REFERENCES Conversations(Id),
    UserId VARCHAR(50) FOREIGN KEY REFERENCES Users(Id),
    PRIMARY KEY (ConversationId, UserId)
);
GO

-- 5. Bảng Messages
CREATE TABLE Messages (
    Id VARCHAR(50) PRIMARY KEY,
    ConversationId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Conversations(Id),
    SenderId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
    Content NVARCHAR(MAX) NOT NULL,
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 6. Bảng Reviews
CREATE TABLE Reviews (
    Id VARCHAR(50) PRIMARY KEY,
    ServiceId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Services(Id),
    CustomerId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
    TransactionId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Transactions(Id),
    Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Comment NVARCHAR(1000),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 7. Bảng Favorites (Wishlist)
CREATE TABLE Favorites (
    UserId    VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
    ServiceId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Services(Id),
    CreatedAt DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (UserId, ServiceId)
);
GO

-- 8. Bảng Consultations (Đặt lịch tư vấn)
CREATE TABLE Consultations (
    Id VARCHAR(50) PRIMARY KEY,
    CustomerId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
    ProviderId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(Id),
    ServiceId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Services(Id),
    ServiceName NVARCHAR(200),
    Date DATE NOT NULL,
    Time TIME NOT NULL,
    Address NVARCHAR(500) NOT NULL,
    Note NVARCHAR(1000),
    Status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, done
    ProviderNote NVARCHAR(1000) NULL,      -- Lời nhắn/Lý do của nhà cung cấp
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ==========================================================
-- DỮ LIỆU MẪU (SEED DATA)
-- ==========================================================

-- Seed Users
INSERT INTO Users (Id, Email, PasswordHash, Name, Role, Phone, Avatar, Verified) VALUES
('p1', 'lan@betrap.vn', '123456', N'Lan Ngọc Wedding', 'provider', '0901234567', 'LN', 1),
('p2', 'thienphuc@betrap.vn', '123456', N'Áo Dài Thiên Phúc', 'provider', '0912345678', 'TP', 1),
('p3', 'kimcuong@betrap.vn', '123456', N'Studio Kim Cương', 'provider', '0923456789', 'KC', 1),
('c1', 'mai@gmail.com', '123456', N'Nguyễn Thị Mai', 'customer', '0934567890', 'NM', 0);
GO

-- Seed ProviderProfiles
INSERT INTO ProviderProfiles (UserId, Location, Bio, Bank) VALUES
('p1', N'Hà Nội', N'Đội bê tráp chuyên nghiệp 5 năm kinh nghiệm', 'VCB 0123456789 - LAN NGOC'),
('p2', N'TP. HCM', N'Cho thuê áo dài cao cấp', 'TCB 9876543210 - THIEN PHUC'),
('p3', N'Đà Nẵng', N'Media & Make up chuyên nghiệp', 'MB 1122334455 - KIM CUONG');
GO

-- Seed CustomerProfiles
INSERT INTO CustomerProfiles (UserId, Location, WeddingDate) VALUES
('c1', N'Hà Nội', '2024-12-15');
GO

-- Seed Services
INSERT INTO Services (Id, ProviderId, Category, Name, Description, Price, Unit, Image, Location, Rating, ReviewCount, Tags) VALUES
('s1', 'p1', 'be-trap', N'Gói Bê Tráp Tiêu Chuẩn (Nam)', N'Đội bê tráp 5 nam thanh lịch, trang phục áo dài truyền thống đỏ.', 1500000, N'buổi', 'assets/images/betrap-1.jpg', N'Hà Nội', 4.8, 24, N'["5 người","Nam","Truyền thống"]'),
('s2', 'p1', 'be-trap', N'Gói Bê Tráp Tiêu Chuẩn (Nữ)', N'Đội bê tráp 5 nữ xinh xắn, áo dài hồng pastel nhẹ nhàng.', 1500000, N'buổi', 'assets/images/betrap-2.jpg', N'Hà Nội', 4.7, 18, N'["5 người","Nữ"]'),
('s3', 'p2', 'be-trap', N'Gói Bê Tráp Áo Dài Đỏ', N'Đội hình 7 người, áo dài đỏ rực rỡ mang lại may mắn cho ngày cưới.', 2100000, N'buổi', 'assets/images/betrap-4.jpg', N'TP. HCM', 4.9, 35, N'["7 người","Áo dài đỏ"]'),
('s4', 'p2', 'be-trap', N'Gói Bê Tráp Áo Dài Vàng', N'Đội hình 7 người, trang phục áo dài vàng kim sang trọng.', 2200000, N'buổi', 'assets/images/betrap-5.jpg', N'TP. HCM', 4.8, 21, N'["7 người","Áo dài vàng"]'),
('s5', 'p1', 'be-trap', N'Gói Bê Tráp Cao Cấp (VIP)', N'Đội hình 9 người cao ráo, trang phục thiết kế riêng, chuyên nghiệp.', 3500000, N'buổi', 'assets/images/betrap-7.jpg', N'Hà Nội', 5.0, 42, N'["9 người","VIP","Thiết kế"]'),
('s6', 'p3', 'be-trap', N'Gói Bê Tráp Kèm Xe Hoa', N'Đội bê tráp 5 người kèm dịch vụ xe hoa sang trọng phục vụ đưa rước.', 5000000, N'ngày', 'assets/images/betrap-25.jpg', N'Đà Nẵng', 4.9, 12, N'["5 người","Xe hoa"]'),
('s7', 'p3', 'be-trap', N'Gói Bê Tráp Truyền Thống Xưa', N'Đội hình 7 người mặc áo tấc, khăn vấn đậm chất truyền thống Bắc Bộ.', 2800000, N'buổi', 'assets/images/betrap-12.jpg', N'Đà Nẵng', 4.8, 15, N'["7 người","Áo tấc","Cổ điển"]'),
('s8', 'p2', 'be-trap', N'Gói Bê Tráp Hiện Đại', N'Đội hình 9 người, trang phục suit và áo dài cách tân hiện đại.', 3200000, N'buổi', 'assets/images/betrap-22.jpg', N'TP. HCM', 4.6, 28, N'["9 người","Hiện đại"]');
GO

-- Seed Transactions
-- (Deleted old mock transactions because they don't match the new data well)

-- Seed Reviews
-- (Deleted old mock reviews)

-- Seed Chat
-- (Deleted old mock chats)

