# 🎙️ T3 VoiceHelper — Ứng dụng hỗ trợ học tập qua giọng nói tích hợp AI

> **Dự án bài tập lớn:** Xây dựng ứng dụng trợ lý giọng nói giúp học sinh, sinh viên ghi chép bài giảng, tóm tắt nội dung và tự động tạo tài liệu ôn tập thông minh bằng công nghệ AI.

---

## 📋 Mục tiêu & Tính năng hệ thống

### 🟢 Phần tối thiểu (Mục tiêu đạt điểm ≥ 65)
*   **Micro realtime:** Nhận diện giọng nói từ bài giảng qua Micro và chuyển thành văn bản (Text) hiển thị theo thời gian thực.
*   **AI Tóm tắt:** Sử dụng AI để tóm tắt lại toàn bộ đoạn văn bản dài dòng vừa ghi được thành một đoạn ngắn gọn.
*   **Trích xuất Key points:** Tự động lọc ra ít nhất 3 ý chính (trọng tâm) từ nội dung bài giảng.
*   **Đa ngôn ngữ:** Hỗ trợ nhận diện và xử lý tốt cả tiếng Việt và tiếng Anh.

### 🚀 Nâng cao sáng tạo (Mục tiêu săn điểm 85+)
*   **Flashcard tự động:** AI tự động dựa vào nội dung bài giảng để tạo ra các câu hỏi ôn tập dạng thẻ ghi nhớ (Flashcard).
*   **Meeting mode:** Chế độ phân biệt nhiều người nói (nhận diện đâu là lời thầy cô giảng, đâu là lời sinh viên phát biểu).
*   **Xuất file lưu trữ:** Cho phép xuất dữ liệu ghi chú ra file `.txt` hoặc `.md` để tải về máy tính.
*   **Tích hợp lịch:** Gắn link bài ghi chú/bài tóm tắt vào một ngày học cụ thể trên lịch học để tiện quản lý.

---

## 👥 Phân công nhiệm vụ thành viên (Nhóm 3 Người)

Để đảm bảo tính công bằng và lịch sử đóng góp (Commit) chuẩn chỉnh trên GitHub, công việc được phân chia theo từng cụm tính năng độc lập từ giao diện đến xử lý logic:

| Thành viên | Vai trò phụ trách | Nhiệm vụ kỹ thuật cụ thể | Nhiệm vụ vận hành |
| :--- | :--- | :--- | :--- |
| **Bùi Ánh Quyên** | Trưởng nhóm | - Lập trình tính năng Micro nhận diện giọng nói và hiển thị text realtime qua Groq Cloud API.<br>- Xử lý logic AI kết nối API để phân tích chuyên sâu và **tóm tắt nội dung** văn bản (Anh/Việt).<br>- Nghiên cứu và xây dựng thuật toán AI tự động tạo câu hỏi ôn tập **Flashcard** từ bài học.<br>- Phát triển tính năng thông minh: **Hỏi đáp trực tiếp dựa trên ghi chú** (Q&A Note Assistant). | - Phụ trách làm Slide thuyết trình.|
| **Nguyễn Thị Minh Anh** | Thành viên | - Khởi tạo cấu trúc toàn bộ dự án, quản lý luồng dữ liệu.<br>- Thiết kế logic nhận diện và xử lý chế độ **"Meeting mode"** (Phân biệt người nói).<br>- Xây dựng chức năng tự động trích xuất và **xuất biên bản cuộc họp** chuyên nghiệp.<br>- Xây dựng cơ chế **lưu trữ lịch sử** cuộc họp/ghi chú hệ thống. | - Phụ trách làm báo cáo tiến độ và báo cáo tổng kết. |
| **Đào Ngọc Quỳnh Anh** | Thành viên | - Thiết kế và xây dựng khung giao diện chính (Trang chủ, Menu điều hướng, hệ thống nút bấm Record).<br>- Làm giao diện hiển thị hộp thoại tóm tắt, hiệu ứng xoay lật 3D của thẻ Flashcard và biên bản.<br>- Phát triển bộ công cụ tiện ích: Nút Copy nhanh và chức năng **xuất file đa định dạng (`.txt` / `.md`)** về máy tính.<br>- Xây dựng module lịch học, tích hợp công cụ nâng cao **tìm kiếm dữ liệu trong lịch sử**. | - Phụ trách thuyết trình chính trước giảng viên. |

---

## 🛠️ Công nghệ sử dụng
*   **Front-end:** HTML5, CSS3, JavaScript (hoặc công nghệ nhóm chốt sau...)
*   **Quản lý mã nguồn:** Git & GitHub

---

## 🗓️ Tiến độ dự án (Roadmap)
- [x] Khởi tạo Kho lưu trữ (Repository) và phân chia công việc.
- [x] Thiết kế giao diện nháp (UI/UX Mockup) trên Figma hoặc giấy.
- [x] Lập trình các tính năng cốt lõi (Micro realtime, Kết nối API AI tóm tắt).
- [x] Lập trình các tính năng nâng cao (Flashcard, Xuất file, Lịch).
- [x] Gộp code (Merge), kiểm thử toàn diện và sửa lỗi (Bug).
- [x] Hoàn thiện Slide, viết file báo cáo và chuẩn bị Demo thuyết trình.

---
*Ghi chú nội bộ: Các thành viên tuyệt đối không code đè lên nhánh `main`. Hãy tạo nhánh phụ theo tên được phân công ở bảng trên, sau khi hoàn thành một function thì Commit rõ nghĩa và tạo Pull Request để Trưởng nhóm duyệt.*
