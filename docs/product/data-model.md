# Data Model

## Storage

IndexedDB database `ai-novel-weaver-db` (version 1).

| Object Store | Key | Value |
|--------------|-----|-------|
| `projects` | `id` (keyPath) | `Project` object |
| `glossary` | manual key | `GlossaryTerm[]` |

## Entities

### Project

```
Project {
  id: string (UUID)
  name: string
  author: string
  chapters: Chapter[]
  translationMemory: TranslationMemoryEntry[]
}
```

A project represents one novel or serialization. Chapters are stored inline
(not normalized) for simplicity — the entire project is read/written as one
IndexedDB record.

### Chapter

```
Chapter {
  id: string (UUID)
  name: string
  sourceText: string
  translatedText: string
}
```

Source and translated text are stored as plain strings. No paragraph-level
segmentation at the persistence layer.

### GlossaryTerm

```
GlossaryTerm {
  id: string (UUID)
  input: string          — source term to match
  translation: string    — target replacement
  gender: Gender         — Male | Female | Neutral | Không xác định
  matchType: MatchType   — Exact | Case-Insensitive
}
```

Glossary is stored separately from projects (shared across all projects in the
same browser).

### TranslationMemoryEntry

```
TranslationMemoryEntry {
  source: string
  target: string
}
```

Per-project memory of previously translated segments.

### TranslationSettings

```
TranslationSettings {
  aiProvider: 'gemini' | 'openai' | 'deepseek' | 'local-mt'
  geminiApiKey: string
  openaiApiKey: string
  openaiApiEndpoint: string
  deepseekApiKey: string
  deepseekApiEndpoint: string
  localMtEndpoint: string
  localMtMode: 'offline' | 'hybrid'
  localMtHybridTarget: 'client' | 'server'
  localMtGlossaryProvider: 'gemini' | 'openai' | 'deepseek' | 'none'
  glossary: GlossaryTerm[]
  useGlossaryAI: boolean
  defaultMatchType: MatchType
  customInstructions: string
  glossaryExtractionInstructions: string
  exclusionList: string
}
```

Settings are runtime state managed via React Context. API keys are stored in
browser (localStorage or IndexedDB depending on hook implementation).

## Validation

All entities are validated with Zod schemas defined in `schema.ts`. Types in
`types.ts` are inferred from schemas via `z.infer<>`.

## Relationships

```
Project 1──* Chapter
Project 1──* TranslationMemoryEntry
Browser  1──* GlossaryTerm (shared, not per-project)
Settings ──* GlossaryTerm (runtime reference)
```

## Constraints

- No server-side persistence — all data lives in the browser
- Project deletion cascades chapters and translation memory (inline storage)
- Glossary is global — no per-project scoping currently
- No versioning or undo history at the data layer
