---
title: "Nâng cấp giao diện sử dụng Impeccable"
description: "Kế hoạch nâng cấp giao diện toàn diện cho ứng dụng AI Novel Weaver sử dụng bộ kỹ năng Impeccable để tối ưu hóa thiết kế UI/UX, Typography, phối màu và chuyển động."
status: done
priority: P2
branch: "feat/impeccable-ui-upgrade"
tags: [ui, ux, impeccable, tailwind]
blockedBy: []
blocks: []
created: "2026-05-31T07:05:37.976Z"
createdBy: "ck:plan"
source: skill
---

# Nâng cấp giao diện sử dụng Impeccable

## Overview

Kế hoạch này tích hợp bộ quy chuẩn thiết kế **Impeccable** để nâng cấp giao diện hiện tại của AI Novel Weaver. Giao diện hiện tại dùng các màu sắc tối mặc định của Tailwind và phân cấp chữ chưa tối ưu. Chúng ta sẽ làm sạch mã nguồn giao diện, tối ưu khoảng cách (visual rhythm), định vị lại hệ chữ (typography) phù hợp với trải nghiệm đọc tiểu thuyết dài tập, và phối lại bảng màu có sắc độ (tinted dark mode). Cuối cùng, chúng ta tự động chạy dev server, chụp ảnh màn hình giao diện qua trình duyệt không đầu và phân tích chất lượng UI/UX trước khi xuất bản.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Init](./phase-01-init.md) | Done |
| 2 | [Critique](./phase-02-critique.md) | Done |
| 3 | [Layout](./phase-03-layout.md) | Done |
| 4 | [Color](./phase-04-color.md) | Done |
| 5 | [Polish](./phase-05-polish.md) | Done |
| 6 | [Visual Test](./phase-06-visual-test.md) | Done |

## Dependencies

- Không có phụ thuộc trực tiếp với các kế hoạch backend dịch thuật khác. Kế hoạch này hoạt động độc lập trên tầng hiển thị (CSS/React components).

## Validation Log

### Session 1 — 2026-05-31
**Trigger:** Phỏng vấn xác thực kế hoạch nâng cấp giao diện theo yêu cầu của người dùng.
**Questions asked:** 3

#### Questions & Answers

1. **[Scope / Design]** Bạn muốn sử dụng font chữ nào cho giao diện và nội dung dịch của AI Novel Weaver?
   - Options: (Recommended) Tiếp tục giữ font Inter hiện tại nhưng căn chỉnh phân cấp (hierarchy) và tỷ lệ chữ (modular scales) để dễ đọc hơn. | Đổi sang font Outfit (font không chân hiện đại, tròn trịa, rất cao cấp cho giao diện SaaS). | Đổi sang font Roboto hoặc một font Serif (có chân) cho phần nội dung dịch truyện để tạo cảm giác giống đọc sách giấy.
   - **Answer:** Đổi sang font Outfit (font không chân hiện đại, tròn trịa, rất cao cấp cho giao diện SaaS).
   - **Rationale:** Thay thế font Inter mặc định bằng font Outfit để mang lại cảm giác giao diện SaaS mượt mà, cao cấp và khác biệt.

2. **[Tradeoffs]** Bảng màu tối (Dark Mode) mới nên được phối theo tông màu chủ đạo nào để tạo cảm giác cao cấp nhất?
   - Options: (Recommended) Slate tối pha xanh lục (Tinted Emerald Slate - tạo cảm giác dễ chịu, dịu mắt cho các phiên làm việc dịch thuật dài). | Dark Indigo (Xanh dương/Tím đậm sang trọng, phong cách SaaS hiện đại). | Giữ nguyên màu xám mặc định (#0F172A) và chỉ thay đổi độ tương phản của chữ.
   - **Answer:** Dark Indigo (Xanh dương/Tím đậm sang trọng, phong cách SaaS hiện đại).
   - **Rationale:** Phối lại giao diện tối theo tông Dark Indigo (xanh dương/tím đậm) để tạo giao diện hiện đại, sang trọng, mang phong cách công nghệ cao.

3. **[Architecture]** Bạn muốn tối ưu hóa bố cục của màn hình TranslationWorkspace như thế nào?
   - Options: (Recommended) Giữ nguyên bố cục cột đôi song song (bên trái EN, bên phải VI) nhưng loại bỏ border thô, nới rộng padding và làm nổi bật dòng đang chọn dịch. | Chuyển sang bố cục dòng đôi (câu EN nằm ngay trên câu VI tương ứng) để dịch giả dễ so sánh từng dòng. | Cho phép người dùng chuyển đổi linh hoạt giữa bố cục cột và bố cục dòng.
   - **Answer:** Giữ nguyên bố cục cột đôi song song (bên trái EN, bên hợp VI) nhưng loại bỏ border thô, nới rộng padding và làm nổi bật dòng đang chọn dịch.
   - **Rationale:** Giữ nguyên dạng cột song song giúp dễ theo dõi mạch truyện, đồng thời tập trung vào việc tinh chỉnh khoảng cách, độ nổi bật của dòng đang active và loại bỏ các viền thô cứng để giảm nhiễu thị giác.

#### Confirmed Decisions
- Sử dụng font **Outfit** làm font chủ đạo của ứng dụng.
- Sử dụng bảng màu tối **Dark Indigo** (xanh dương và tím đậm) làm tông màu nền chính.
- Giữ bố cục cột song song trong TranslationWorkspace nhưng cải thiện trải nghiệm dòng đang active và loại bỏ border thô.
- Thêm Phase 6 để tự động mở dev server, mô phỏng hành vi người dùng, chụp ảnh màn hình bằng trình duyệt không đầu và kiểm định chất lượng UI/UX trực quan.

#### Action Items
- [x] Cập nhật [index.html](file:///media/monet/SSD%20Web/CodeBase/AI-NOVEL-TRANS/index.html) để tải font Outfit từ Google Fonts và định nghĩa font này trong cấu hình Tailwind.
- [x] Định nghĩa lại bảng màu tối tông Indigo trong tailwind.config tại [index.html](file:///media/monet/SSD%20Web/CodeBase/AI-NOVEL-TRANS/index.html).
- [x] Cập nhật giao diện cột đôi của TranslationWorkspace: tăng padding, xóa border thô, thêm hiệu ứng focus/active hàng.
- [x] Xây dựng script tự động chụp màn hình `scripts/visual-test.js`.

#### Impact on Phases
- Phase 3 (Layout): Cần tích hợp font Outfit và cập nhật cấu hình Tailwind, đồng thời điều chỉnh khoảng cách cột đôi cho TranslationWorkspace.
- Phase 4 (Color): Cần triển khai bảng màu tối Dark Indigo và các trạng thái active/focus của dòng đang dịch.
- Phase 6 (Visual Test): Triển khai script Node.js tự động chạy dev server, chụp ảnh màn hình và thực hiện kiểm thử trực quan.

### Verification Results
- **Tier:** Full
- **Claims checked:** 6
- **Verified:** 6 | **Failed:** 0 | **Unverified:** 0

#### Failures
None

### Whole-Plan Consistency Sweep
- Files reread: plan.md, phase-01-init.md, phase-02-critique.md, phase-03-layout.md, phase-04-color.md, phase-05-polish.md, phase-06-visual-test.md
- Decision deltas checked: 4 (Font: Outfit, Theme: Dark Indigo, Workspace Layout: Song song không border, Automated Visual Testing)
- Reconciled stale references: 0
- Unresolved contradictions: 0
