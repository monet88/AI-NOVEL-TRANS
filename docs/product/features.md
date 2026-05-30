# Features

## Translation

### Single Chapter Translation
- Streaming translation with real-time output display
- Provider selection: Gemini, OpenAI, DeepSeek, Local MT
- Local MT health preflight before translation starts
- Custom prompt override per translation call
- Automatic glossary injection into translation prompt
- Post-processing: strip wrapper quotes, remove "translation:" prefix

### Batch Translation
- Translate multiple chapters sequentially
- Progress tracking per chapter (Pending → InProgress → Translating → Completed/Failed)
- Event-driven architecture (EventEmitter pattern)
- Local MT preflight for fresh starts and resumed jobs
- Two-phase batch: glossary extraction first, then translation

### Genre Presets
- **Wuxia** (võ hiệp): Sino-Vietnamese martial arts terminology, classical tone
- **Xianxia** (tiên hiệp): Cultivation/immortal terminology, transcendent tone
- **Modern Urban** (đô thị): Contemporary localization, natural dialogue rhythm
- Each preset provides: extraction instructions + translation instructions

## Glossary Management

### Term Management
- Add/edit/delete glossary terms
- Fields: source input, translation, gender, match type
- Gender options: Male, Female, Neutral, Không xác định
- Match types: Exact, Case-Insensitive

### AI Glossary Extraction
- Extract terms from source text using AI
- Genre-specific extraction prompts (character names, locations, techniques, etc.)
- Exclusion list to skip known terms
- Review workflow: extracted terms presented for approval before adding

### Batch Glossary Extraction
- Extract glossary from multiple chapters at once
- Local MT offline mode blocks extraction unless a fallback LLM provider is configured
- Review modal for bulk approval

### Glossary in Translation
- Glossary terms injected into translation prompts
- Term highlighting in source/translated text (useTermHighlighter hook)
- Glossary usage report

## Project Management

### CRUD
- Create project with name and author
- Dashboard view for project selection
- Delete projects

### Import/Export
- Export project as JSON (full data dump)
- Import project from JSON file
- Import chapters from text files

## Editor

### Translation Workspace
- Side-by-side source and translated text
- Chapter navigation via sidebar
- Responsive layout with collapsible sidebar

### Find and Replace
- Search across translated text
- Replace single or all occurrences

## Export

### Document Export
- Export to DOCX (via `docx` library)
- Export to PDF (via `jspdf` library)
- Export modal with format selection

## Settings

### Provider Configuration
- API key management per provider
- Custom endpoint URLs for OpenAI/DeepSeek compatible APIs
- Local MT endpoint configuration (`http://localhost:8000` by default)
- Local MT mode selection: Offline / Hybrid
- Local MT hybrid target: Client-side / Server-side
- Local MT fallback LLM provider selection for glossary extraction and client-side hybrid polish
- Connection tests for remote and local providers
- Toggle AI-assisted glossary usage

### Translation Configuration
- Custom instructions (appended to all translation prompts)
- Glossary extraction instructions
- Exclusion list for glossary extraction
- Default match type selection
