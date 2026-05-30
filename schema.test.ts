import { describe, expect, it } from 'vitest';
import { TranslationSettingsSchema } from './schema';

describe('TranslationSettingsSchema local-mt support', () => {
  it('accepts local-mt as a valid provider with its settings fields', () => {
    const result = TranslationSettingsSchema.safeParse({
      aiProvider: 'local-mt',
      geminiApiKey: '',
      openaiApiKey: '',
      openaiApiEndpoint: 'https://api.openai.com/v1/chat/completions',
      deepseekApiKey: '',
      deepseekApiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      glossary: [],
      useGlossaryAI: true,
      defaultMatchType: 'Case-Insensitive',
      customInstructions: '',
      glossaryExtractionInstructions: '',
      exclusionList: '',
      localMtEndpoint: 'http://localhost:8000',
      localMtMode: 'offline',
      localMtHybridTarget: 'client',
      localMtGlossaryProvider: 'none',
    });

    expect(result.success).toBe(true);
  });
});
