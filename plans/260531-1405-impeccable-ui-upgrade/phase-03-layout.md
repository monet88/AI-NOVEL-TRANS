---
phase: 3
title: "Layout"
status: done
effort: "2h"
---

# Phase 3: Layout

## Overview
Cải tổ cấu trúc bố cục (layout) và hệ font chữ (typography) nhằm tối ưu hóa sự thoáng đãng, nâng cao độ rõ ràng của văn bản và mang lại trải nghiệm đọc tiểu thuyết chuyên nghiệp.

<!-- Updated: Validation Session 1 - Tích hợp font Outfit và tối ưu bố cục cột song song không border -->

## Implementation Steps
1. Chạy `/impeccable typeset` để định hình lại hệ font chữ của dự án. 
2. Cập nhật file [index.html](file:///media/monet/SSD%20Web/CodeBase/AI-NOVEL-TRANS/index.html):
   - Thay link Google Fonts của Inter thành font **Outfit**: `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">`.
   - Cập nhật cấu hình `tailwind.config` phần `fontFamily` để ánh xạ `'Outfit', 'sans-serif'` vào lớp `sans`.
3. Chạy `/impeccable layout` để điều chỉnh lại các lưới (grids), khoảng cách (padding/margin) trong [App.tsx](file:///media/monet/SSD%20Web/CodeBase/AI-NOVEL-TRANS/App.tsx) và các component giao diện dịch thuật.
4. Cập nhật `TranslationWorkspace` để giữ nguyên bố cục cột đôi song song (bên trái EN, bên phải VI) nhưng thực hiện:
   - Loại bỏ các border dọc phân cách thô cứng giữa các cột, thay thế bằng khoảng đệm rộng rãi (wider padding/gutter).
   - Tối ưu hóa chiều rộng của mỗi cột để tăng trải nghiệm đọc.
5. Loại bỏ các đường viền (borders) thô cứng và các card lồng nhau không cần thiết trong Sidebar và Dashboard, thay thế bằng các mảng màu nhẹ nhàng để phân tách không gian.
6. Cấu hình responsive cho các view, đảm bảo hiển thị hoàn hảo trên các màn hình có độ phân giải khác nhau từ laptop đến máy tính bảng và điện thoại.

## Success Criteria
- [ ] Font chữ Outfit hiển thị chính xác trên toàn bộ ứng dụng.
- [ ] Các khoảng trống được phân bổ hợp lý, tạo ra khoảng thở thị giác.
- [ ] Bố cục cột đôi song song trong TranslationWorkspace hiển thị thoáng đãng, không có border phân tách thô cứng.
- [ ] Giao diện co giãn tốt mà không bị vỡ bố cục trên các màn hình hẹp.
