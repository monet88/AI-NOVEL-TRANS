import { describe, expect, it } from 'vitest';
import { buildInitialSettings } from './useSettings';

describe('buildInitialSettings', () => {
  it('hydrates legacy persisted settings with local-mt defaults', () => {
    const settings = buildInitialSettings(
      {
        aiProvider: 'local-mt',
        geminiApiKey: '',
        openaiApiKey: '',
        deepseekApiKey: '',
        customInstructions: '',
        glossaryExtractionInstructions: '',
        exclusionList: '',
      },
      []
    );

    expect(settings.localMtEndpoint).toBe('http://localhost:8000');
    expect(settings.localMtMode).toBe('offline');
    expect(settings.localMtHybridTarget).toBe('client');
    expect(settings.localMtGlossaryProvider).toBe('none');
  });
});
