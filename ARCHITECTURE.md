# Kiến trúc Ứng dụng

Tài liệu này mô tả các lựa chọn kiến trúc và cấu trúc luồng dữ liệu trong AI Novel Weaver.

## 🏗️ Cấu trúc thư mục

- `/components`: Chứa các UI components (React).
  - `/glossary`: Logic liên quan đến quản lý thuật ngữ.
  - `/workspace`: Các thành phần của trình soạn thảo dịch thuật.
  - `/layout`: Header, Sidebar và cấu trúc khung của ứng dụng.
- `/contexts`: Quản lý trạng thái toàn cục (Project, UI, Glossary).
- `/services`: Chứa logic nghiệp vụ không liên quan đến UI.
  - `aiService.ts`: Cầu nối giữa ứng dụng và các mô hình AI.
  - `persistenceService.ts`: Quản lý lưu trữ IndexedDB.
  - `exportService.ts`: Logic tạo file export.
  - `batchOrchestrator.ts`: Điều phối các tác vụ chạy ngầm trên nhiều chương.
- `/hooks`: Các Custom Hooks để tái sử dụng logic (Highlighter, Modals, Settings).

## 💾 Quản lý Dữ liệu (Persistence)

AI Novel Weaver sử dụng **IndexedDB** làm lớp lưu trữ chính vì LocalStorage có giới hạn 5MB không đủ cho các tiểu thuyết dài hàng trăm chương.
- **Store `projects`**: Lưu trữ thông tin dự án và nội dung các chương.
- **Store `glossary`**: Lưu trữ từ điển thuật ngữ riêng biệt cho từng dự án hoặc global.

## 🤖 AI Workflow

Quy trình dịch thuật được tối ưu qua 3 bước:
1. **Pre-scan**: AI quét văn bản nguồn để tìm các thực thể (nhân vật, đồ vật).
2. **Review**: Người dùng duyệt và hiệu chỉnh thuật ngữ được AI đề xuất.
3. **Contextual Translation**: Gửi văn bản nguồn kèm theo danh sách thuật ngữ đã duyệt vào prompt để AI dịch chính xác và nhất quán.

## 🎨 Thiết kế UI/UX

Ứng dụng tuân thủ các nguyên tắc thiết kế tối giản, tập trung vào sự tập trung (Focus-mode).
- Sử dụng **Tailwind CSS** cho styling.
- Sử dụng **motion** (framer-motion) cho các hiệu ứng chuyển cảnh mượt mà.
- Bố cục Dashboard -> Workspace giúp quản lý nhiều dự án cùng lúc.
