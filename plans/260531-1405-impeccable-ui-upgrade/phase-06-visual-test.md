---
phase: 6
title: "Visual Test"
status: done
effort: "1h"
---

# Phase 6: Visual Test

## Overview
Khởi động dev server, sử dụng công cụ tự động hóa trình duyệt để truy cập ứng dụng, tự động chụp ảnh màn hình (screenshots) giao diện và phân tích trực quan để đảm bảo chất lượng thiết kế tối ưu.

## Implementation Steps
1. Khởi động môi trường phát triển (dev server) cục bộ bằng lệnh `npm run dev` thông qua tiến trình chạy nền.
2. Tạo một script tự động hóa trình duyệt viết bằng Node.js (sử dụng Puppeteer hoặc Playwright nếu có, hoặc sử dụng thư viện thích hợp) tại đường dẫn `scripts/visual-test.js`. Script này sẽ thực hiện các thao tác:
   - Đợi dev server sẵn sàng, mở trang ứng dụng trên trình duyệt không đầu (headless browser).
   - Điều hướng và mô phỏng tương tác người dùng: mở thanh Sidebar, chọn một dự án mẫu để vào Workspace, click chọn dòng dịch cụ thể để kích hoạt highlight dòng active, và mở hộp thoại Batch Translate.
   - Chụp ảnh màn hình ở từng trạng thái và lưu kết quả vào thư mục `plans/reports/screenshots/`.
3. Thực hiện phân tích trực quan các ảnh chụp màn hình:
   - Kiểm tra font chữ **Outfit** hiển thị chuẩn xác, không bị lỗi font hoặc tràn văn bản.
   - Đảm bảo bảng màu tối **Dark Indigo** phối hợp hài hòa, độ tương phản của chữ chính/phụ rõ ràng.
   - Đảm bảo dòng đang dịch được highlight đẹp mắt, không che khuất nội dung xung quanh.
4. Đóng dev server an toàn và ghi nhận kết quả kiểm thử vào báo cáo hoàn tất (walkthrough).

## Success Criteria
- [ ] Script tự động chụp ảnh màn hình `scripts/visual-test.js` được tạo và chạy không lỗi.
- [ ] Chụp đầy đủ ảnh màn hình của Dashboard, Workspace (với dòng đang active), Sidebar và Modals.
- [ ] Toàn bộ giao diện được kiểm chứng trực quan đạt chuẩn thẩm mỹ cao, không có lỗi chồng chéo layout hay tràn chữ.
- [ ] Tiến trình dev server được tắt hoàn toàn sau khi kiểm tra xong.
