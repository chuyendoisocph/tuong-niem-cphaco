# Nhịp cầu tri ân

Website tưởng niệm nghệ sĩ tại Đường Nghệ sĩ, Hoa Viên Bình Dương. Đây là ứng dụng riêng, tách khỏi giao diện và mã nguồn của Sổ Tang Điện Tử.

## Chạy trên máy

1. Sao chép `.env.example` thành `.env` và điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` của dự án Supabase đang dùng.
2. Chạy `npm install` và `npm run dev`.
3. Mở `http://127.0.0.1:8082/`.

Chạy `npm run build` để kiểm tra TypeScript và tạo bản tĩnh trong `dist/`.

## Dữ liệu và quản trị

Website này đọc dữ liệu nghệ sĩ, tác phẩm và lời tri ân từ Supabase hiện tại. Phần quản trị vẫn nằm trong Sổ Tang Điện Tử. Chỉ dùng khóa publishable/anon ở trình duyệt; mọi quyền xem và ghi phải tiếp tục được bảo vệ bằng RLS trong Supabase.

Các trang công khai dùng `/`, `/danh-sach` và `/:slug`. Đường dẫn cũ trong chính website mới (`/tuong-niem/...`) chuyển về đường dẫn tương ứng. Chuyển hướng trên **tên miền cũ** cần cấu hình ở nơi triển khai Sổ Tang Điện Tử sau khi tên miền mới hoạt động.

## Tên miền

Tên miền dự kiến là `tuongniem.cphaco.app`. Website cần bản triển khai công khai, bản ghi DNS theo chỉ dẫn của nơi lưu trữ, và chứng chỉ HTTPS hoạt động trước khi dùng mã QR hoặc chuyển hướng đường dẫn cũ. `vercel.json` giữ hỗ trợ làm mới các đường dẫn React Router khi triển khai bằng Vercel.
