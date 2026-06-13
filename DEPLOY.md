# 🌸 BêTráp — Hướng Dẫn Deploy Lên Internet

## Kiến Trúc

```
Frontend (HTML/CSS/JS) → có thể host trên Vercel / Netlify / GitHub Pages
Backend  (Node.js)     → host trên Render / Railway / VPS
Database (SQL Server)  → Azure SQL / ElephantSQL / VPS riêng
```

---

## Option A: Render (Miễn phí, Dễ nhất)

### 1. Chuẩn bị Repository

```bash
# Đảm bảo .gitignore có:
node_modules/
backend/.env
```

### 2. Deploy Backend lên Render

1. Truy cập [render.com](https://render.com) → New → Web Service
2. Connect GitHub repo của bạn
3. Cấu hình:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Thêm Environment Variables (từ file `.env`):
   ```
   DB_USER=sa
   DB_PASSWORD=<password>
   DB_SERVER=<sql-server-host>
   DB_NAME=BeTrapDB
   JWT_SECRET=<chuỗi ngẫu nhiên dài 64 ký tự>
   FRONTEND_URL=https://betrap.netlify.app
   ```
5. Sau khi deploy → ghi lại URL: `https://betrap-api.onrender.com`

### 3. Cập nhật Frontend API URL

Tạo file `js/config.js`:
```js
// Thay đổi URL này sau khi deploy backend
window.BT_API_URL = 'https://betrap-api.onrender.com/api';
```

Thêm vào tất cả các trang trước `<script src="../js/db.js">`:
```html
<script src="../js/config.js"></script>
```

Hoặc thêm thẳng vào file `js/api.js` dòng:
```js
const BASE_URL = window.BT_API_URL || 'https://betrap-api.onrender.com/api';
```

### 4. Deploy Frontend lên Netlify

1. Truy cập [netlify.com](https://netlify.com) → New site → Import from Git
2. Không cần build command (static HTML)
3. **Publish directory**: `/` (thư mục gốc)
4. Deploy → ghi lại URL: `https://betrap.netlify.app`

---

## Option B: VPS (Toàn quyền kiểm soát)

### Cài đặt trên Ubuntu VPS

```bash
# 1. Cài Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# 2. Cài PM2 (process manager)
npm install -g pm2

# 3. Clone repo
git clone https://github.com/your/betrap.git
cd betrap/backend
npm install

# 4. Tạo .env với thông tin thật
cp .env .env.production
nano .env.production

# 5. Chạy backend với PM2
pm2 start server.js --name betrap-api
pm2 save
pm2 startup

# 6. Cài Nginx để reverse proxy
sudo apt install nginx
```

```nginx
# /etc/nginx/sites-available/betrap
server {
    listen 80;
    server_name api.betrap.vn;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name betrap.vn www.betrap.vn;
    root /var/www/betrap;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

```bash
# Copy frontend files
sudo cp -r /home/user/betrap/* /var/www/betrap/
sudo nginx -t && sudo systemctl reload nginx
```

### Cài SSL (HTTPS) miễn phí

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d betrap.vn -d www.betrap.vn -d api.betrap.vn
```

---

## SQL Server — Cập nhật Schema

Sau khi deploy, chạy SQL để thêm bảng Favorites:

```sql
-- Thêm bảng Favorites nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Favorites' AND xtype='U')
BEGIN
    CREATE TABLE Favorites (
        UserId    VARCHAR(50) NOT NULL REFERENCES Users(Id),
        ServiceId VARCHAR(50) NOT NULL REFERENCES Services(Id),
        CreatedAt DATETIME DEFAULT GETDATE(),
        PRIMARY KEY (UserId, ServiceId)
    );
END

-- Mở rộng cột PasswordHash để chứa bcrypt
ALTER TABLE Users ALTER COLUMN PasswordHash NVARCHAR(500) NOT NULL;
```

---

## Checklist Trước Khi Launch

- [ ] JWT_SECRET đã được đổi thành chuỗi ngẫu nhiên
- [ ] FRONTEND_URL trỏ đúng domain
- [ ] API BASE_URL trong js/api.js trỏ đúng domain backend
- [ ] SQL Server accessible từ backend server
- [ ] Schema đã được cập nhật (bảng Favorites, cột PasswordHash 500)
- [ ] CORS đã cho phép domain frontend
- [ ] HTTPS đã bật

---

## Nhanh nhất để test ngay hôm nay

1. Chạy backend local: `npm start` trong thư mục `backend/`
2. Mở file `index.html` bằng VS Code Live Server (port 5500)
3. Đăng nhập với: `lan@betrap.vn` / `123456`

