import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TranslationSettings } from '../../types';
import { MatchType } from '../../types';
import {
  normalizeLocalMtEndpoint,
  testLocalMTConnection,
  translateWithLocalMT,
  translateWithLocalMTHybrid,
  translateWithLocalMTStream,
} from './local-mt';

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
  localMtEndpoint: 'http://localhost:8000/',
  localMtMode: 'offline',
  localMtHybridTarget: 'client',
  localMtGlossaryProvider: 'none',
  ...overrides,
} as unknown as TranslationSettings);

describe('local-mt client contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('normalizes endpoint URLs by trimming trailing slashes', () => {
    expect(normalizeLocalMtEndpoint('http://localhost:8000/')).toBe('http://localhost:8000');
    expect(normalizeLocalMtEndpoint('http://localhost:8000////')).toBe('http://localhost:8000');
  });

  it('rejects non-local endpoints', () => {
    expect(() => normalizeLocalMtEndpoint('https://example.com')).toThrow('Local MT endpoint must point to a local server (localhost or 127.0.0.1).');
  });

  it('checks local server health at /api/health', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ok', model_loaded: true }), { status: 200 })
    );

    const result = await testLocalMTConnection(createSettings());

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/health', expect.objectContaining({ method: 'GET' }));
    expect(result).toEqual({ success: true, message: 'Connection successful!' });
  });

  it('posts single-text translation requests without id or gender fields', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ translation: 'Xin chào', warnings: [], time_ms: 12 }), { status: 200 })
    );

    const settings = createSettings({
      glossary: [
        {
          id: 'term-1',
          input: 'dragon king',
          translation: 'Long Vương',
          gender: 'Male',
          matchType: MatchType.CaseInsensitive,
        },
      ],
    });

    const result = await translateWithLocalMT('Hello', 'en', 'vi', settings);

    expect(result).toBe('Xin chào');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/translate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello',
          glossary: [
            {
              input: 'dragon king',
              translation: 'Long Vương',
              matchType: MatchType.CaseInsensitive,
            },
          ],
        }),
      })
    );
  });

  it('emits a single chunk for stream-compatible local translation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ translation: 'Bản dịch stream', warnings: [], time_ms: 10 }), { status: 200 })
    );

    const onChunk = vi.fn();
    const result = await translateWithLocalMTStream('Hello', 'en', 'vi', createSettings(), onChunk);

    expect(result).toBe('Bản dịch stream');
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk).toHaveBeenCalledWith('Bản dịch stream');
  });

  it('posts hybrid requests to /api/translate/hybrid', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ translation: 'Bản dịch hybrid', draft: 'Bản nháp', warnings: [], time_ms: 22 }), { status: 200 })
    );

    const result = await translateWithLocalMTHybrid('Hello', 'en', 'vi', createSettings());

    expect(result).toBe('Bản dịch hybrid');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/translate/hybrid',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
});
