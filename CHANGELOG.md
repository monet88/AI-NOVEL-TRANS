# Changelog

Tất cả các thay đổi đáng chú ý đối với dự án này sẽ được ghi lại trong tệp này.

## [1.2.0] - 2026-05-03
### Added
- **Chiến lược Persistence mới**: Chuyển đổi từ LocalStorage sang IndexedDB để hỗ trợ các bộ tiểu thuyết dung lượng lớn.
- **Tính năng Xuất bản (Export)**: Hỗ trợ các định dạng .md, .docx, .pdf, .epub.
- **Interactive Glossary Approval**: Giao diện duyệt thuật ngữ trước khi chạy Batch Extract hoặc Batch Translate.
- **Đồng bộ hóa cuộn (Sync Highlight)**: Di chuột qua đoạn văn bản ở bảng nguồn sẽ tự động highlight đoạn tương ứng ở bảng đích.

### Fixed
- Lỗi RegExp Unicode trong công cụ highlight thuật ngữ (`useTermHighlighter`).
- Tối ưu hóa hiệu năng render các chương dài bằng cách tách nhỏ thành các paragraph component.

## [1.1.0] - 2026-04-28
### Added
- Tích hợp Gemini Pro 1.5 cho dịch thuật và trích xuất thực thể.
- Hệ thống Toolbar cho soạn thảo văn bản phong phú.
- Quản lý dự án đa người dùng (Local).

## [1.0.0] - 2026-04-20
### Initial
- Khởi tạo dự án AI Novel Weaver.
- Giao diện Workspace cơ bản.
