import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TranslationSettings } from '../types';
import { MatchType } from '../types';
import { extractGlossaryTerms, translateText, translateTextStream } from './aiService';
import * as gemini from './api/gemini';

vi.mock('./api/gemini', () => ({
  extractGlossaryWithGemini: vi.fn().mockResolvedValue([
    {
      input: 'fallback',
      translation: 'fallback',
      gender: 'Neutral',
      matchType: MatchType.CaseInsensitive,
    },
  ]),
  translateWithGemini: vi.fn().mockResolvedValue('gemini fallback'),
  translateWithGeminiStream: vi.fn().mockImplementation(async (_sourceText, _sourceLang, _targetLang, _settings, onChunk) => {
    onChunk('gemini fallback');
    return 'gemini fallback';
  }),
  testGeminiConnection: vi.fn(),
}));

const createSettings = (overrides: Record<string, unknown> = {}): TranslationSettings => ({
  aiProvider: 'local-mt',
  geminiApiKey: '',
  openaiApiKey: '',
  openaiApiEndpoint: 'https://api.openai.com/v1/chat/completions',
  deepseekApiKey: '',
  deepseekApiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
  glossary: [],
  useGlossaryAI: true,
  defaultMatchType: MatchType.CaseInsensitive,
  customInstructions: '',
  glossaryExtractionInstructions: '',
  exclusionList: '',
  localMtEndpoint: 'http://localhost:8000',
  localMtMode: 'offline',
  localMtHybridTarget: 'client',
  localMtGlossaryProvider: 'none',
  ...overrides,
} as unknown as TranslationSettings);

describe('aiService local-mt routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('does not fall back to Gemini for local-mt translation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ translation: 'Bản dịch local', warnings: [], time_ms: 10 }), { status: 200 })
    );

    const result = await translateText('Hello', 'en', 'vi', createSettings());

    expect(gemini.translateWithGemini).not.toHaveBeenCalled();
    expect(result).toBe('Bản dịch local');
  });

  it('does not fall back to Gemini for local-mt streaming translation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ translation: 'Bản dịch stream', warnings: [], time_ms: 10 }), { status: 200 })
    );

    const onChunk = vi.fn();
    const result = await translateTextStream('Hello', 'en', 'vi', createSettings(), onChunk);

    expect(gemini.translateWithGeminiStream).not.toHaveBeenCalled();
    expect(result).toBe('Bản dịch stream');
    expect(onChunk).toHaveBeenCalledWith('Bản dịch stream');
  });

  it('does not fall back to Gemini for local-mt glossary extraction', async () => {
    const terms = await extractGlossaryTerms('Hello', 'vi', '', '', createSettings());

    expect(gemini.extractGlossaryWithGemini).not.toHaveBeenCalled();
    expect(terms).toEqual([]);
  });
});
