-- BêTráp SQL Server Database Schema & Seed Data
-- ==========================================================

-- Tạo Database (Bỏ comment nếu chạy trên SSMS và chưa có DB)
-- CREATE DATABASE BeTrapDB;
-- GO
-- USE BeTrapDB;
-- GO

-- 1. Bảng Users
CREATE TABLE Users (
    Id VARCHAR(50) PRIMARY KEY,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
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
    Status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, active, done, cancelled
    PaymentMethod VARCHAR(50),
    PaymentStatus VARCHAR(20) DEFAULT 'unpaid', -- unpaid, paid
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

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
('s1', 'p1', 'be-trap', N'Gói Bê Tráp Tiêu Chuẩn', N'Đội bê tráp 6 người, trang phục áo dài đồng bộ, chuyên nghiệp và lịch sự.', 2500000, N'buổi', 'assets/images/gallery-6.jpg', N'Hà Nội', 4.8, 24, N'["6 người","Áo dài","Chuyên nghiệp"]'),
('s2', 'p1', 'be-trap', N'Gói Bê Tráp Cao Cấp', N'Đội bê tráp 10 người, trang phục sang trọng, có ban nhạc đệm, xe hoa.', 5000000, N'buổi', 'assets/images/gallery-7.jpg', N'Hà Nội', 4.9, 18, N'["10 người","Xe hoa","Ban nhạc"]'),
('s3', 'p2', 'ao-dai', N'Thuê Áo Dài Cô Dâu', N'Bộ sưu tập áo dài cô dâu cao cấp, đa dạng màu sắc, kích cỡ, thêu tay tinh xảo.', 800000, N'ngày', 'assets/images/gallery-8.jpg', N'TP. HCM', 4.7, 32, N'["Cô dâu","Thêu tay","Đa màu"]'),
('s4', 'p2', 'ao-dai', N'Thuê Áo Dài Đội Bê', N'Áo dài đồng phục đội bê tráp, nhiều màu sắc phù hợp với chủ đề đám hỏi.', 150000, N'bộ/ngày', 'assets/images/gallery-9.jpg', N'TP. HCM', 4.6, 45, N'["Đồng phục","Nhiều màu"]'),
('s5', 'p1', 'lam-trap', N'Làm Tráp Truyền Thống', N'Trang trí mâm tráp theo phong cách truyền thống, hoa tươi đẹp, ý nghĩa.', 3500000, N'bộ', 'assets/images/gallery-10.jpg', N'Hà Nội', 4.9, 15, N'["Hoa tươi","Truyền thống"]'),
('s6', 'p3', 'media', N'Chụp & Quay Đám Hỏi Full', N'Gói chụp ảnh + quay phim đám hỏi trọn gói, edit màu chuyên nghiệp, giao file trong 7 ngày.', 8000000, N'buổi', 'assets/images/gallery-11.jpg', N'Đà Nẵng', 5.0, 22, N'["Ảnh+Video","Edit màu","7 ngày"]'),
('s7', 'p3', 'makeup', N'Trang Điểm Cô Dâu', N'Make up cô dâu đám hỏi, phong cách tự nhiên hoặc glamour, bền màu cả ngày.', 1200000, N'lần', 'assets/images/gallery-12.jpg', N'Đà Nẵng', 4.8, 38, N'["Cô dâu","Bền màu","Tự nhiên"]');
GO

-- Seed Transactions
INSERT INTO Transactions (Id, CustomerId, ProviderId, ServiceId, ServiceName, Price, Date, Time, Address, Note, Status, PaymentMethod, PaymentStatus) VALUES
('TXN_1', 'c1', 'p1', 's1', N'Gói Bê Tráp Tiêu Chuẩn', 2500000, '2024-03-15', '08:00', N'123 Hoàng Mai, Hà Nội', N'Vui lòng đến trước 30 phút', 'done', 'momo', 'paid'),
('TXN_2', 'c1', 'p3', 's6', N'Chụp & Quay Đám Hỏi Full', 8000000, '2024-03-15', '09:00', N'123 Hoàng Mai, Hà Nội', NULL, 'confirmed', 'bank', 'paid');
GO

-- Seed Reviews
INSERT INTO Reviews (Id, ServiceId, CustomerId, TransactionId, Rating, Comment) VALUES
('REV_1', 's1', 'c1', 'TXN_1', 5, N'Đội bê tráp rất chuyên nghiệp, đúng giờ và lịch sự. Trang phục đẹp và gọn gàng. Rất hài lòng!');
GO

-- Seed Chat
INSERT INTO Conversations (Id, ServiceId, LastMessage, LastAt) VALUES
('CONV_1', 's1', N'Mình dự định ngày 15/3 ạ', GETDATE());
GO

INSERT INTO ConversationParticipants (ConversationId, UserId) VALUES
('CONV_1', 'c1'),
('CONV_1', 'p1');
GO

INSERT INTO Messages (Id, ConversationId, SenderId, Content, IsRead) VALUES
('MSG_1', 'CONV_1', 'c1', N'Chào bạn, mình muốn hỏi về gói bê tráp tiêu chuẩn ạ!', 1),
('MSG_2', 'CONV_1', 'p1', N'Chào bạn! Gói tiêu chuẩn của mình gồm 6 người, trang phục áo dài đồng bộ. Bạn dự định tổ chức vào ngày nào vậy?', 1),
('MSG_3', 'CONV_1', 'c1', N'Mình dự định ngày 15/3 ạ, khoảng 8 giờ sáng.', 1);
GO
