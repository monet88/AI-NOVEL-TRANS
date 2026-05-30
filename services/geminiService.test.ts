import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testDeepSeekConnection, testOpenAIConnection } from './aiService';
import type { TranslationSettings } from '../types';
import { MatchType } from '../types';

const createSettings = (overrides: Record<string, unknown> = {}): TranslationSettings => ({
  aiProvider: 'openai',
  geminiApiKey: '',
  openaiApiKey: '',
  openaiApiEndpoint: 'https://api.openai.com/v1/chat/completions',
  deepseekApiKey: '',
  deepseekApiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
  glossary: [],
  useGlossaryAI: false,
  customInstructions: '',
  glossaryExtractionInstructions: '',
  exclusionList: '',
  defaultMatchType: MatchType.CaseInsensitive,
  localMtEndpoint: 'http://localhost:8000',
  localMtMode: 'offline',
  localMtHybridTarget: 'client',
  localMtGlossaryProvider: 'none',
  ...overrides,
} as unknown as TranslationSettings);

describe('connection tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns an error message when the OpenAI API key is invalid', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message: 'Incorrect API key provided.',
            type: 'invalid_request_error',
            code: 'invalid_api_key',
          },
        }),
        { status: 401 }
      )
    );

    const result = await testOpenAIConnection(
      createSettings({
        aiProvider: 'openai',
        openaiApiKey: 'sk-invalid-key',
      })
    );

    expect(result).toEqual({
      success: false,
      message: 'Connection failed: Incorrect API key provided. (Code: invalid_api_key)',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-invalid-key',
        },
      })
    );
  });

  it('returns an error message when the DeepSeek API key is invalid', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message: 'Invalid API Key',
            type: 'invalid_request_error',
            code: 'invalid_api_key',
          },
        }),
        { status: 401 }
      )
    );

    const result = await testDeepSeekConnection(
      createSettings({
        aiProvider: 'deepseek',
        deepseekApiKey: 'sk-invalid-deepseek-key',
      })
    );

    expect(result).toEqual({
      success: false,
      message: 'Connection failed: Invalid API Key (Code: invalid_api_key)',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-invalid-deepseek-key',
        },
      })
    );
  });
});
