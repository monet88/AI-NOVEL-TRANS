# AI Novel Weaver

AI Novel Weaver là một ứng dụng hỗ trợ dịch thuật tiểu thuyết chuyên nghiệp, tích hợp trí tuệ nhân tạo (Gemini, OpenAI, DeepSeek) để giúp các dịch giả duy trì sự nhất quán về thuật ngữ và văn phong.

## 🚀 Tính năng chính

- **Dịch thuật song ngữ**: Giao diện hai bảng giúp dễ dàng so sánh văn bản nguồn và văn bản đích.
- **Quản lý Glossary (Thuật ngữ)**: Tự động nhận diện và gợi ý thuật ngữ trong quá trình dịch.
- **Tự động trích xuất thuật ngữ**: AI quét qua các chương để tìm kiếm nhân vật và địa danh quan trọng.
- **Persistence (Lưu trữ cục bộ)**: Sử dụng IndexedDB để lưu trữ dự án, chương và thuật ngữ ngay trong trình duyệt.
- **Xuất bản đa định dạng**: Hỗ trợ xuất nội dung dịch sang Markdown, Word (.docx), PDF và eBook (.epub).
- **Interactive Review**: Quy trình duyệt thuật ngữ trước khi thực hiện dịch hàng loạt (Batch Translation).

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 18, Vite, Tailwind CSS.
- **AI Integration**: @google/genai, OpenAI SDK, DeepSeek API.
- **Persistence**: IndexedDB (thông qua thư viện `idb`).
- **Export**: `docx`, `jspdf`, `epub-gen-memory`.
- **Icons**: Lucide React.

## 📦 Cài đặt và Chạy thử

1. Cài đặt phụ thuộc:
   ```bash
   npm install
   ```
2. Chạy môi trường phát triển:
   ```bash
   npm run dev
   ```
3. Cấu hình API Key trong mục **Settings** của ứng dụng.

## 📄 Bản quyền
Dự án được phát triển trong môi trường Google AI Studio.
