# Đường Nghệ Sỹ · Hoa Viên Bình Dương

Website tưởng niệm nghệ sỹ tại Đường Nghệ Sỹ, Hoa Viên Bình Dương. Đây là ứng dụng riêng, tách khỏi giao diện và mã nguồn của Sổ Tang Điện Tử.

## Chạy trên máy

1. Sao chép `.env.example` thành `.env` và điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` của dự án Supabase đang dùng.
2. Chạy `npm install` và `npm run dev`.
3. Mở `http://127.0.0.1:8082/`.

Chạy `npm run build` để kiểm tra TypeScript và tạo bản tĩnh trong `dist/`.

## Triển khai từ GitHub

`.env.production` chỉ chứa URL Supabase và khóa **publishable** dùng trong trình duyệt. Tệp này được đưa lên GitHub để các bản dựng từ repository đọc cùng dữ liệu với website hiện tại. Không đưa khóa `service_role` hoặc thông tin quản trị vào tệp này. Nếu đổi dự án hoặc xoay khóa Supabase, cập nhật cả `.env.production` và cấu hình triển khai.

## Dữ liệu và quản trị

Website này đọc dữ liệu nghệ sỹ, tác phẩm và lời tri ân từ Supabase hiện tại. Phần quản trị vẫn nằm trong Sổ Tang Điện Tử. Chỉ dùng khóa publishable/anon ở trình duyệt; mọi quyền xem và ghi phải tiếp tục được bảo vệ bằng RLS trong Supabase.

### Nơi an nghỉ

Cần chạy `supabase/migrations/20261022010000_resting_places.sql` trước. Sau đó nhập trong bảng `profiles`:

| Cột | Nhập gì |
|---|---|
| `in_hoa_vien` | `true` nếu an nghỉ tại Đường Nghệ Sỹ, Hoa Viên Bình Dương; `false` nếu ở nơi khác |
| `grave_area`, `grave_lot`, `grave_number` | Khu, Lô, Vị trí |
| `resting_place` | Tên nghĩa trang hoặc chùa khi ở ngoài Hoa Viên, ví dụ "Nghĩa trang Gò Dưa" |
| `resting_address` | Địa chỉ bằng chữ |
| `latitude`, `longitude` | Tọa độ GPS của ngôi mộ, ví dụ `10.987654` và `106.654321` (lấy từ Google Maps: nhấn giữ vị trí mộ rồi chép hai số) |
| `maps_url` | Link bản đồ có sẵn, chỉ dùng khi chưa có tọa độ |

Người ở Hoa Viên có `grave_number` đúng dạng mã mộ (ví dụ `B1.2.2-11-03`, `VST-01-02`) có nút "Xem vị trí mộ", mở `https://bandoso.cphaco.app/?grave=<mã>`. Những người còn lại có nút "Chỉ đường", ưu tiên tọa độ GPS, sau đó tới `maps_url`, rồi tới địa chỉ. Mọi hồ sơ cần `is_celebrity` và `is_published`, cộng với ảnh đại diện hoặc đủ cả `biography` lẫn `tagline` để có trang tưởng niệm. Hồ sơ chưa có ảnh hiện chữ cái đầu của tên thay cho chân dung.

### Nghe lại, đọc lại tác phẩm

Mỗi tác phẩm (`memorial_items`, `kind = 'work'`) có thể có `url` và `excerpt` (migration `20261029000000_work_excerpts.sql`), nhập trong trang quản trị:

- `url` là link YouTube thì video phát ngay trên trang (chỉ tải YouTube khi người xem bấm phát); link khác hiện nút "Nghe lại / Xem lại / Đọc lại".
- `excerpt` là vài câu thơ hoặc một đoạn văn ngắn, giữ xuống dòng, hiện kèm dòng "Trích …". Chỉ trích ngắn, đúng nguyên văn và ghi rõ tác phẩm. Ưu tiên video từ kênh chính thức của nghệ sỹ, gia đình hoặc đài truyền hình.

Tác phẩm có video hoặc trích đoạn được ưu tiên trong mục "Hôm nay nhớ lại" ở trang chủ.

### Trang quản trị

`/quan-tri` cho nhân viên (tài khoản Supabase có vai trò admin hoặc employee, như Sổ Tang Điện Tử) sửa nội dung mà không cần vào Supabase:

- **Hồ sơ**: thêm, sửa họ tên, ngày sinh/mất, câu giới thiệu, tiểu sử, ảnh chân dung (lưu vào bucket `portraits`), nơi an nghỉ, bật/tắt hiển thị. Mỗi hồ sơ có tác phẩm/thành tựu, mốc cuộc đời và album ảnh tư liệu.
- **Ảnh chờ duyệt**: duyệt hoặc từ chối ảnh người viếng gửi.
- **Lời tưởng nhớ**: ẩn, hiện hoặc xóa lời nhắn.

Trang quản trị không xóa hồ sơ; muốn gỡ thì tắt hiển thị. Quyền ghi do RLS trong Supabase quyết định, không phải do giao diện.

### Nghề và lĩnh vực

Nghề đọc từ đầu tên trong `profiles.name`, sau danh hiệu nếu có: "NSND Nhạc sĩ …", "Doanh nhân …", "Nhà giáo …". Các nghề đã biết nằm trong `FIELD_BY_PROFESSION` ở `src/lib/memorial.ts`, mỗi nghề thuộc một lĩnh vực (Văn hóa nghệ thuật, Kinh doanh, Giáo dục…). Người thuộc lĩnh vực nghệ thuật hiện nơi an nghỉ là "Đường Nghệ Sỹ"; người thuộc lĩnh vực khác hiện "Hoa Viên Nghĩa trang Bình Dương", mục tác phẩm đổi thành "Thành tựu". Lĩnh vực để duyệt ở trang chủ và trang tra cứu (Âm nhạc, Cải lương, Điện ảnh, Văn học) do `artFormOf` trong `src/lib/memorial.ts` quyết định, theo nghề, danh hiệu và vài trường hợp ghi riêng theo slug. Tên trang nằm trong `src/lib/site.ts`, `index.html` và `public/site.webmanifest`.

### Ảnh người viếng gửi

Cần chạy `supabase/migrations/20261022020000_visitor_photos.sql`. Người viếng gửi được tối đa 3 ảnh kèm lời tưởng nhớ công khai. Ảnh nằm trong bucket `visitor-photos` và một dòng trong bảng `photos` với `is_approved = false`, nên chưa ai thấy. Xem ảnh qua cột `url`, rồi đặt `is_approved = true` để ảnh hiện trong album "Hình ảnh" và dưới lời nhắn của người gửi. Ảnh không dùng thì xóa dòng trong `photos` và xóa tệp trong bucket.

Ảnh tư liệu do Hoa Viên tự thêm vào bảng `photos` (để trống `comment_id`) hiện ngay, xếp theo `display_order`.

### Câu chuyện tác phẩm và trích dẫn

Cần chạy `supabase/migrations/20261022000000_memorial_stories_quotes.sql`. Trong `memorial_items`: tác phẩm (`kind = 'work'`) có `story` (2-3 câu) và `url` (link nghe/xem/đọc); trích dẫn dùng `kind = 'quote'` với `title` là câu trích, `description` là người nói, `source` là nơi đăng và `url` là link bài.

Các trang công khai dùng `/`, `/danh-sach`, `/noi-an-nghi` và `/:slug`. Đường dẫn cũ trong chính website mới (`/tuong-niem/...`) chuyển về đường dẫn tương ứng. Chuyển hướng trên **tên miền cũ** cần cấu hình ở nơi triển khai Sổ Tang Điện Tử sau khi tên miền mới hoạt động.

### Khung xem trước khi chia sẻ

Zalo và Facebook không chạy JavaScript khi đọc link, nên `npm run build` chạy thêm `scripts/share-pages.mjs`: mỗi hồ sơ đang hiện được tạo một tệp `dist/<slug>.html` mang tên, mô tả và ảnh của người đó. Vercel phục vụ `/<slug>` từ tệp này (`cleanUrls` trong `vercel.json`), rồi trang chạy như bình thường.

- Đặt biến môi trường `SITE_URL` (ví dụ `https://tuongniem.cphaco.app`) ở nơi triển khai để link và ảnh mặc định là địa chỉ đầy đủ. Trên Vercel, nếu không đặt thì dùng tên miền production của dự án.
- Khung xem trước được tạo lúc build. Sửa tên, ảnh hay câu giới thiệu trong trang quản trị thì cần triển khai lại để khung xem trước cập nhật; nội dung trang thì cập nhật ngay.

## Tên miền

Tên miền dự kiến là `tuongniem.cphaco.app`. Website cần bản triển khai công khai, bản ghi DNS theo chỉ dẫn của nơi lưu trữ, và chứng chỉ HTTPS hoạt động trước khi dùng mã QR hoặc chuyển hướng đường dẫn cũ. `vercel.json` giữ hỗ trợ làm mới các đường dẫn React Router khi triển khai bằng Vercel.
