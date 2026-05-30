# Test Matrix

This file maps product behavior to proof.

## Status Values

| Status | Meaning |
| --- | --- |
| planned | Accepted as intended behavior, not implemented |
| in_progress | Actively being built |
| implemented | Implemented and proof exists |
| changed | Contract changed after earlier implementation |
| retired | No longer part of the product contract |

## Matrix

| Behavior | Contract | Unit | Integration | E2E | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Single chapter translation (streaming) | AI provider returns streamed text, displayed incrementally | no | no | no | planned | none |
| Single chapter translation (non-streaming) | AI provider returns full text in one response | no | no | no | planned | none |
| Provider switching (Gemini/OpenAI/DeepSeek) | Same interface, different backend | no | no | no | planned | none |
| Glossary term extraction via AI | Returns structured terms from source text | no | no | no | planned | none |
| Glossary injection into translation prompt | Terms appear in prompt context | no | no | no | planned | none |
| Glossary term CRUD | Add, edit, delete terms; persist to IndexedDB | no | no | no | planned | none |
| Batch translation (multi-chapter) | Sequential chapter processing with progress | no | no | no | planned | none |
| Batch glossary extraction | Extract from multiple chapters, review modal | no | no | no | planned | none |
| Project CRUD | Create, load, delete projects in IndexedDB | no | no | no | planned | none |
| Project import from JSON | Parse JSON, validate schema, load into state | no | no | no | planned | none |
| Project export to JSON | Serialize full project to downloadable file | no | no | no | planned | none |
| Chapter import from files | Read text files, create chapter entries | no | no | no | planned | none |
| Export to DOCX | Generate valid .docx from translated chapters | no | no | no | planned | none |
| Export to PDF | Generate valid .pdf from translated chapters | no | no | no | planned | none |
| Find and replace | Search translated text, replace occurrences | no | no | no | planned | none |
| Genre preset application | Selecting genre loads correct prompt templates | no | no | no | planned | none |
| Settings persistence | API keys and config survive page reload | no | no | no | planned | none |
| Glossary term highlighting | Matched terms visually marked in editor | no | no | no | planned | none |
| Translation memory storage | Source/target pairs saved per project | no | no | no | planned | none |
| Error handling (API failure) | Graceful error display, no data loss | no | no | no | planned | none |

## Evidence Rules

- Unit proof covers pure domain and application rules.
- Integration proof covers backend enforcement, data integrity, provider
  behavior, jobs, or service contracts.
- E2E proof covers user-visible browser flows.
- Platform proof covers only shell, deployment, mobile, desktop, or runtime
  behavior that cannot be proven in lower layers.
- A story can be implemented without every proof column if the story packet
  explains why.

## Priority for First Test Coverage

1. **Project persistence** — data loss is the worst UX failure
2. **Glossary CRUD** — consistency depends on correct term management
3. **AI provider abstraction** — provider switching must not break
4. **Export generation** — output correctness is user-visible
5. **Batch orchestrator** — state machine correctness under sequential processing
