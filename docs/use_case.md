# Đặc tả Use Case (Admin Web)

## 1. Use case: Xem góp ý
- **Dữ liệu đầu vào:** Bộ lọc (trạng thái xử lý, loại góp ý, khoảng thời gian), từ khóa tìm kiếm.
- **Dòng sự kiện:** Quản trị viên truy cập mục "Góp ý" -> hệ thống hiển thị danh sách góp ý -> chọn góp ý cụ thể để xem chi tiết -> quản trị viên cập nhật trạng thái xử lý/gửi phản hồi -> hệ thống lưu thay đổi.
- **Ngoại lệ:** Lỗi tải dữ liệu từ máy chủ, không tìm thấy nội dung góp ý tương ứng.
- **Trạng thái trước:** Đã đăng nhập vào hệ thống admin.
- **Trạng thái sau:** Chi tiết góp ý được hiển thị và trạng thái xử lý/phản hồi được lưu cập nhật.

## 2. Use case: Quản lý vật phẩm
- **Dữ liệu đầu vào:** Thông tin vật phẩm (tên, hình ảnh, loại vật phẩm, mô tả, chỉ số/tính năng, giá bán/điều kiện sở hữu).
- **Dòng sự kiện:** Quản trị viên truy cập mục "Quản lý vật phẩm" -> xem danh sách vật phẩm -> chọn thao tác (thêm mới/chỉnh sửa/xóa/ẩn) -> nhập thông tin vật phẩm -> hệ thống kiểm tra và cập nhật cơ sở dữ liệu.
- **Ngoại lệ:** Thiếu thông tin bắt buộc, mã/tên vật phẩm bị trùng, vật phẩm đang được liên kết dữ liệu không thể xóa, lỗi tải lên tệp hình ảnh.
- **Trạng thái trước:** Đã đăng nhập vào hệ thống admin.
- **Trạng thái sau:** Dữ liệu vật phẩm được thêm mới, thay đổi hoặc xóa thành công trong hệ thống.

## 3. Use case: Quản lý danh hiệu
- **Dữ liệu đầu vào:** Thông tin danh hiệu (tên danh hiệu, hình ảnh/biểu tượng, điều kiện đạt được, mô tả).
- **Dòng sự kiện:** Quản trị viên truy cập mục "Quản lý danh hiệu" -> xem danh sách danh hiệu -> thực hiện thêm mới, chỉnh sửa điều kiện hoặc xóa/ẩn danh hiệu -> hệ thống lưu thay đổi.
- **Ngoại lệ:** Trùng tên danh hiệu, điều kiện đạt được không hợp lệ, lỗi kết nối máy chủ.
- **Trạng thái trước:** Đã đăng nhập vào hệ thống admin.
- **Trạng thái sau:** Thông tin danh hiệu và điều kiện đạt được của người dùng được cập nhật thành công.

## 4. Use case: Quản lý phần thưởng
- **Dữ liệu đầu vào:** Thông tin phần thưởng (tên phần thưởng, loại phần thưởng, giá trị/số lượng, tỷ lệ xuất hiện, điều kiện nhận).
- **Dòng sự kiện:** Quản trị viên chọn mục "Quản lý phần thưởng" -> hệ thống hiển thị danh sách phần thưởng -> quản trị viên thêm mới/sửa/xóa hoặc điều chỉnh tỷ lệ trả thưởng -> hệ thống ghi nhận và lưu cấu hình.
- **Ngoại lệ:** Thiếu thông tin bắt buộc, tỷ lệ rớt phần thưởng không hợp lệ, lỗi cập nhật dữ liệu.
- **Trạng thái trước:** Đã đăng nhập vào hệ thống admin.
- **Trạng thái sau:** Cấu hình phần thưởng và điều kiện/tỷ lệ nhận thưởng mới được áp dụng trên toàn hệ thống.

## 5. Use case: Quản lý gói mua
- **Dữ liệu đầu vào:** Thông tin gói mua (tên gói, giá tiền, thời hạn sử dụng, quyền lợi/ưu đãi đi kèm, trạng thái kích hoạt).
- **Dòng sự kiện:** Quản trị viên truy cập mục "Quản lý gói mua" -> xem danh sách các gói -> thực hiện tạo gói mới, sửa giá/quyền lợi hoặc bật/tắt bán gói -> hệ thống kiểm tra và cập nhật cấu hình.
- **Ngoại lệ:** Giá tiền không hợp lệ, thiếu thông tin quyền lợi, mã gói bị trùng lặp, lỗi lưu cơ sở dữ liệu.
- **Trạng thái trước:** Đã đăng nhập vào hệ thống admin.
- **Trạng thái sau:** Gói mua mới hoặc thay đổi giá/quyền lợi được áp dụng thành công trên hệ thống.
