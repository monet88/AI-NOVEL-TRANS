---
phase: 4
title: "Color"
status: done
effort: "2h"
---

# Phase 4: Color

## Overview
Nâng cấp bảng màu tối thô sơ của Tailwind sang bảng màu tối có sắc độ (Dark Indigo) chất lượng cao và hoàn thiện các trạng thái phản hồi tương tác (hover, focus, loading, error).

<!-- Updated: Validation Session 1 - Áp dụng bảng màu Dark Indigo và highlight dòng active trong TranslationWorkspace -->

## Implementation Steps
1. Chạy `/impeccable colorize` để tái thiết lập màu sắc cho dự án.
2. Cập nhật bảng màu trong `tailwind.config` của [index.html](file:///media/monet/SSD%20Web/CodeBase/AI-NOVEL-TRANS/index.html) sang tông **Dark Indigo**:
   - Sử dụng các màu nền tối có chiều sâu dựa trên Indigo trầm (ví dụ: `#0B0F19` làm nền chính, `#161C2C` làm nền sidebar/panel, `#222B44` làm nền input/hover).
   - Tối ưu hóa màu chữ chính (primary text) sang tông trắng ấm (`#F3F4F6` hoặc `#F9FAFB`) và màu chữ phụ (secondary text) dịu nhẹ.
3. Thiết kế hiệu ứng làm nổi bật (highlighting) dòng văn bản đang được chọn dịch trong `TranslationWorkspace`:
   - Dòng đang active sẽ có nền xanh Indigo nhẹ pha tím, chữ sáng rõ hơn.
   - Thêm đường viền hoặc dấu chỉ thị nhỏ tinh tế ở cạnh trái của dòng đang dịch để định vị tầm mắt.
4. Chạy `/impeccable harden` để thiết kế các trạng thái tương tác nâng cao:
   - Thêm trạng thái focus-visible cho tất cả các nút bấm, input.
   - Thiết kế các khung xương tải dữ liệu (skeleton loading) với hiệu ứng trượt sáng (shimmer) dựa trên màu Indigo.
   - Xây dựng các trạng thái trống (empty states) tinh tế cho danh sách chương truyện và thuật ngữ glossary.
   - Xử lý các tình huống văn bản quá dài bị tràn hoặc lỗi biên.

## Success Criteria
- [ ] Bảng màu Dark Indigo mới dịu mắt, sang trọng và tạo cảm giác cao cấp.
- [ ] Dòng văn bản đang chọn dịch được highlight rõ ràng và đẹp mắt, giúp dịch giả tập trung.
- [ ] Tất cả các component tương tác có trạng thái active/hover/focus nhất quan.
- [ ] Có đầy đủ trạng thái loading và empty state cho các khung hình chính.
