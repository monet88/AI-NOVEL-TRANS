---
phase: 2
title: "Local Persistence & Export Engine"
status: pending
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Local Persistence & Export Engine

## Overview
Ensure no data loss occurs when the user refreshes or closes the browser window by persisting project data using IndexedDB/OPFS. Add widespread file export support for user convenience.

## Requirements
- Functional: Projects must auto-save locally. Users should be able to download translated works in .md, .docx, .epub, and .pdf formats.
- Non-functional: Persistence engine should not block the main UI thread during typing.

## Architecture
- **Storage Strategy**: Use IndexedDB (via a lightweight wrapper like `idb`) paired with `ProjectContext`. A `sync` worker or debounced hook will persist changes to IndexedDB.
- **Export Strategy**: 
  - Markdown: Native text formatting.
  - PDF: Use `jspdf` or `html2pdf.js`.
  - DOCX: Use `docx` library.
  - EPUB: Use `epub-gen-memory` or similar browser-compatible EPUB generators.

## Related Code Files
- Create: `services/persistenceService.ts`, `services/exportService.ts`, `components/ExportModal.tsx`
- Modify: `contexts/ProjectContext.tsx` (to auto-record and initialize from DB), `components/Header.tsx` (add export dropdown).

## Implementation Steps
1. Install necessary dependencies: `idb`, `docx`, `jspdf`, `epub-gen-memory` (or equivalent).
2. Set up `persistenceService.ts` representing an IndexedDB cache for active Projects and active Glossaries.
3. Modify `ProjectContext` and `GlossaryContext` to hydrate from `persistenceService` on mount, and debounce saves on state mutations.
4. Implement `exportService.ts` containing the compilation logic for parsing project chapters into the respective output formats.
5. Create UI hooks/buttons in the Header/Sidebar for triggering export flows.

## Success Criteria
- [x] User can refresh standard browser tabs without losing newly translated paragraph states.
- [x] Export buttons accurately output valid .md, .epub, .pdf, and .docx formats containing the current novel contents.

## Risk Assessment
- **Risk**: IndexedDB sizes hitting limits or becoming corrupted.
- **Mitigation**: Implement robust try/catch blocks allowing the app to degrade gracefully (warn user: "Browser storage failed, changes will not persist").
