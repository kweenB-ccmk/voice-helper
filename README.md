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

| Thành viên | Vai trò phụ trách | Nhánh Git làm việc | Nhiệm vụ cụ thể |
| :--- | :--- | :--- | :--- |
| **Bùi Ánh Quyên**<br>*(Trưởng nhóm)* | **Core & Voice Developer** | `feature-voice-core` | - Khởi tạo cấu trúc dự án, làm khung giao diện chính (Trang chủ, Menu, các nút Record).<br>- Lập trình tính năng Micro nhận diện giọng nói và hiển thị text realtime.<br>- Tích hợp chế độ "Meeting mode" (Phân biệt người nói).<br>- Phụ trách làm Slide thuyết trình. |
| **Nguyễn Thị Minh Anh** | **AI Integration Engineer** | `feature-ai-integration` | - Kết nối và gọi API từ mô hình AI (Gemini/OpenAI).<br>- Xử lý logic AI tóm tắt văn bản, trích xuất ít nhất 3 Key points (Anh/Việt).<br>- Lập trình tính năng AI tự động tạo câu hỏi ôn tập Flashcard.<br>- Phụ trách làm báo cáo. |
| **Đào Ngọc Quỳnh Anh** | **UI/UX & Utilities Developer** | `feature-ui-utilities` | - Thiết kế giao diện hiển thị hộp thoại tóm tắt, các thẻ Key points và Flashcard.<br>- Làm nút Copy nhanh, tính năng xuất file `.txt`/`.md`.<br>- Làm tính năng tích hợp lịch học.<br>- Phụ trách thuyết trình chính. |

---

## 🛠️ Công nghệ sử dụng
*   **Front-end:** HTML5, CSS3, JavaScript (hoặc công nghệ nhóm chốt sau...)
*   **Back-end & AI:** Python / Node.js kết hợp API AI (Gemini API / OpenAI API)
*   **Quản lý mã nguồn:** Git & GitHub

---

## 🗓️ Tiến độ dự án (Roadmap)
- [x] Khởi tạo Kho lưu trữ (Repository) và phân chia công việc.
- [ ] Thiết kế giao diện nháp (UI/UX Mockup) trên Figma hoặc giấy.
- [ ] Lập trình các tính năng cốt lõi (Micro realtime, Kết nối API AI tóm tắt).
- [ ] Lập trình các tính năng nâng cao (Flashcard, Xuất file, Lịch).
- [ ] Gộp code (Merge), kiểm thử toàn diện và sửa lỗi (Bug).
- [ ] Hoàn thiện Slide, viết file báo cáo và chuẩn bị Demo thuyết trình.

---
*Ghi chú nội bộ: Các thành viên tuyệt đối không code đè lên nhánh `main`. Hãy tạo nhánh phụ theo tên được phân công ở bảng trên, sau khi hoàn thành một function thì Commit rõ nghĩa và tạo Pull Request để Trưởng nhóm duyệt.*
