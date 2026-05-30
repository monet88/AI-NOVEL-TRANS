```markdown
# AI-NOVEL-TRANS Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill covers the core development patterns, coding conventions, and collaborative workflows used in the AI-NOVEL-TRANS repository. The project is built with TypeScript using the Vite framework and emphasizes structured feature planning, comprehensive documentation, and robust testing. The repository supports multi-phase feature development, detailed documentation practices, and consistent code style, making it easy for contributors to onboard and collaborate effectively.

## Coding Conventions

- **File Naming:**  
  Use camelCase for file names.  
  _Example:_  
  ```
  localMtProvider.ts
  fastApiBackend.tsx
  ```

- **Import Style:**  
  Use relative imports for modules within the project.  
  _Example:_  
  ```typescript
  import localMtProvider from '../services/localMtProvider';
  import useTranslation from './useTranslation';
  ```

- **Export Style:**  
  Use default exports for modules and components.  
  _Example:_  
  ```typescript
  // services/localMtProvider.ts
  const localMtProvider = { /* ... */ };
  export default localMtProvider;
  ```

- **Commit Messages:**  
  Use [Conventional Commits](https://www.conventionalcommits.org/), with prefixes such as `feat` for features and `docs` for documentation.  
  _Example:_  
  ```
  feat: add local MT provider integration
  docs: update architecture overview for FastAPI backend
  ```

## Workflows

### Feature Development with Plans and Docs
**Trigger:** When adding a significant new feature or integration, with proper planning and documentation  
**Command:** `/new-feature-with-plan`

1. **Create or update plan documents**  
   - Add detailed plans under `plans/{feature}/` (e.g., `plans/local-mt/plan.md`, `plans/local-mt/phase-1.md`)
2. **Implement the feature**  
   - Update or create code in `components/`, `services/`, `server/`, etc.
   - _Example:_  
     ```typescript
     // services/localMtProvider.ts
     const localMtProvider = { /* implementation */ };
     export default localMtProvider;
     ```
3. **Update product documentation**  
   - Edit `docs/product/`, `docs/ARCHITECTURE.md`, etc.
4. **Add or update tests**  
   - Write or modify tests in `hooks/*.test.ts`, `services/*.test.ts`, or `server/tests/`
   - _Example:_  
     ```typescript
     // services/localMtProvider.test.ts
     import localMtProvider from './localMtProvider';
     import { describe, it, expect } from 'vitest';

     describe('localMtProvider', () => {
       it('should translate text', () => {
         expect(localMtProvider.translate('hello')).toBe('こんにちは');
       });
     });
     ```
5. **Update package/configuration files**  
   - Modify `package.json`, `requirements.txt` as needed
6. **Generate and update reports**  
   - Add summaries or progress reports under `plans/reports/`

---

### Phase-Based Feature Tracking in Plans
**Trigger:** When tracking progress of a multi-phase feature  
**Command:** `/phase-complete`

1. **Create or update phase documents**  
   - Add or modify `plans/{feature}/phase-*.md` for each phase
2. **Update main plan file**  
   - Reflect current status and completed phases in `plans/{feature}/plan.md`
3. **Mark phases as complete**  
   - Clearly indicate completion in plan docs
4. **(Optional) Add a summary report**  
   - Summarize progress in `plans/reports/`

---

### Comprehensive Documentation Backfill
**Trigger:** When backfilling or overhauling documentation  
**Command:** `/backfill-docs`

1. **Update product docs**  
   - Edit or add files in `docs/product/` (e.g., `product-overview.md`, `features.md`)
2. **Update architecture and test matrix**  
   - Modify `docs/ARCHITECTURE.md`, `docs/TEST_MATRIX.md`
3. **Enrich conventions and agent docs**  
   - Update `AGENTS.md`, `CLAUDE.md`, etc.
4. **Add templates or decision records**  
   - Place new templates in `docs/templates/`, decisions in `docs/decisions/`
5. **Remove obsolete docs or plans**  
   - Clean up outdated files

---

## Testing Patterns

- **Framework:** [vitest](https://vitest.dev/)
- **Test File Pattern:**  
  Test files are named with the `.test.ts` suffix and placed alongside the code they test.  
  _Example:_  
  ```
  hooks/useTranslation.test.ts
  services/localMtProvider.test.ts
  ```
- **Test Example:**  
  ```typescript
  import { describe, it, expect } from 'vitest';
  import useTranslation from './useTranslation';

  describe('useTranslation', () => {
    it('should return translated text', () => {
      const result = useTranslation('hello');
      expect(result).toBe('こんにちは');
    });
  });
  ```

## Commands

| Command                  | Purpose                                                              |
|--------------------------|----------------------------------------------------------------------|
| /new-feature-with-plan   | Start a new feature with planning docs, implementation, and reports  |
| /phase-complete          | Mark a phase as complete and update plan tracking                    |
| /backfill-docs           | Backfill or overhaul documentation across the codebase               |
```
