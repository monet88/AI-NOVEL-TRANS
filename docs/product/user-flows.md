# User Flows

## Flow 1: New Project Setup

```
Dashboard → Create Project (name, author)
  → Project opens in workspace view
  → Import chapters from files OR paste source text manually
```

## Flow 2: Glossary-First Translation

```
Select chapter → View source text
  → Extract glossary (AI) → Review extracted terms → Approve/reject each
  → Terms added to global glossary
  → Translate chapter (glossary auto-injected into prompt)
  → Review translated output
  → Edit manually if needed
```

This is the recommended workflow for consistency-critical projects.

## Flow 3: Quick Translation (No Glossary)

```
Select chapter → Translate directly
  → Streaming output appears in real-time
  → Edit result manually
```

## Flow 4: Batch Processing

```
Open Batch Translate modal → Select chapters
  → Phase 1: Glossary extraction for all selected chapters
    → Review modal appears with extracted terms
    → Approve/reject terms
  → Phase 2: Translation of all selected chapters
    → Progress bar shows per-chapter status
  → All chapters translated
```

## Flow 5: Export

```
Open Export modal → Select format (DOCX or PDF)
  → Configure options
  → Download generated file
```

## Flow 6: Project Portability

```
Export: Project menu → Export as JSON → Download .json file
Import: Dashboard → Import Project → Select .json file → Project loaded
```

## Flow 7: Settings Configuration

```
Open Settings → Select AI provider
  → Enter API key
  → (Optional) Set custom endpoint
  → (Optional) Write custom instructions
  → (Optional) Configure glossary extraction rules
  → Save
```

## Flow 8: Find and Replace

```
Open Find/Replace (keyboard shortcut or menu)
  → Enter search term
  → Navigate matches
  → Replace single or all
```

## View States

| View | Entry Point | Components |
|------|-------------|------------|
| Dashboard | App load (no project selected) | ProjectSelectionView |
| Workspace | Select/create project | Header + Sidebar + TranslationWorkspace |
| Glossary | Menu action | GlossaryView (full-screen overlay) |

## Modal States

| Modal | Trigger |
|-------|---------|
| BatchTranslateModal | Menu action |
| BatchExtractModal | Menu action |
| GlossaryReviewModal | After AI extraction |
| FindReplaceModal | Keyboard shortcut / menu |
| ImportFromFilesModal | Menu action |
| ExportModal | Menu action |
