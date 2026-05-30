import type { GlossaryTerm, TranslationSettings } from '../types';
import * as deepseek from './api/deepseek';
import * as gemini from './api/gemini';
import * as localMt from './api/local-mt';
import * as openai from './api/openai';
import { buildTranslationPromptPrefix } from './utils';

export * from './utils';

type FallbackProvider = Exclude<TranslationSettings['aiProvider'], 'local-mt'>;

const getUnsupportedProviderError = (provider: string): Error => {
  return new Error(`Unsupported AI provider: ${provider}`);
};

const getLocalMtFallbackProvider = (settings: TranslationSettings): FallbackProvider | null => {
  return settings.localMtGlossaryProvider !== 'none'
    ? settings.localMtGlossaryProvider
    : null;
};

const buildLocalMtHybridPrompt = (
  sourceText: string,
  draftTranslation: string,
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
): string => {
  const promptPrefix = buildTranslationPromptPrefix(sourceLang, targetLang, settings);

  return [
    `${promptPrefix}${sourceText}`,
    '"""',
    '',
    'Polish the following draft translation for fluency and readability while preserving glossary terms and custom instructions.',
    '',
    'Draft Translation:',
    '"""',
    draftTranslation,
    '"""',
  ].join('\n');
};

const extractGlossaryWithProvider = async (
  provider: FallbackProvider,
  sourceText: string,
  targetLang: string,
  glossaryExtractionInstructions: string,
  exclusionList: string,
  settings: TranslationSettings,
): Promise<Omit<GlossaryTerm, 'id'>[]> => {
  switch (provider) {
    case 'openai':
      return openai.extractGlossaryWithOpenAI(
        sourceText,
        targetLang,
        glossaryExtractionInstructions,
        exclusionList,
        settings,
      );
    case 'deepseek':
      return deepseek.extractGlossaryWithDeepSeek(
        sourceText,
        targetLang,
        glossaryExtractionInstructions,
        exclusionList,
        settings,
      );
    case 'gemini':
      return gemini.extractGlossaryWithGemini(
        sourceText,
        targetLang,
        glossaryExtractionInstructions,
        exclusionList,
        settings,
      );
    default:
      throw getUnsupportedProviderError(provider);
  }
};

const translateWithProvider = async (
  provider: FallbackProvider,
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
  userPromptOverride?: string,
): Promise<string> => {
  switch (provider) {
    case 'openai':
      return openai.translateWithOpenAI(
        sourceText,
        sourceLang,
        targetLang,
        settings,
        userPromptOverride,
      );
    case 'deepseek':
      return deepseek.translateWithDeepSeek(
        sourceText,
        sourceLang,
        targetLang,
        settings,
        userPromptOverride,
      );
    case 'gemini':
      return gemini.translateWithGemini(
        sourceText,
        sourceLang,
        targetLang,
        settings,
        userPromptOverride,
      );
    default:
      throw getUnsupportedProviderError(provider);
  }
};

const translateWithLocalMtProvider = async (
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
): Promise<string> => {
  if (settings.localMtMode === 'hybrid' && settings.localMtHybridTarget === 'server') {
    return localMt.translateWithLocalMTHybrid(sourceText, sourceLang, targetLang, settings);
  }

  const draftTranslation = await localMt.translateWithLocalMT(sourceText, sourceLang, targetLang, settings);

  if (settings.localMtMode !== 'hybrid' || settings.localMtHybridTarget !== 'client') {
    return draftTranslation;
  }

  const polishProvider = getLocalMtFallbackProvider(settings);

  if (!polishProvider) {
    throw new Error('Local MT client-side hybrid mode requires a secondary LLM provider.');
  }

  return translateWithProvider(
    polishProvider,
    sourceText,
    sourceLang,
    targetLang,
    settings,
    buildLocalMtHybridPrompt(sourceText, draftTranslation, sourceLang, targetLang, settings),
  );
};

export const extractGlossaryTerms = async (
  sourceText: string,
  targetLang: string,
  glossaryExtractionInstructions: string,
  exclusionList: string,
  settings: TranslationSettings,
): Promise<Omit<GlossaryTerm, 'id'>[]> => {
  if (!sourceText) return [];

  try {
    switch (settings.aiProvider) {
      case 'openai':
        return await openai.extractGlossaryWithOpenAI(
          sourceText,
          targetLang,
          glossaryExtractionInstructions,
          exclusionList,
          settings,
        );
      case 'deepseek':
        return await deepseek.extractGlossaryWithDeepSeek(
          sourceText,
          targetLang,
          glossaryExtractionInstructions,
          exclusionList,
          settings,
        );
      case 'gemini':
        return await gemini.extractGlossaryWithGemini(
          sourceText,
          targetLang,
          glossaryExtractionInstructions,
          exclusionList,
          settings,
        );
      case 'local-mt': {
        const fallbackProvider = getLocalMtFallbackProvider(settings);
        if (!fallbackProvider) {
          return [];
        }

        return await extractGlossaryWithProvider(
          fallbackProvider,
          sourceText,
          targetLang,
          glossaryExtractionInstructions,
          exclusionList,
          settings,
        );
      }
      default:
        throw getUnsupportedProviderError(String(settings.aiProvider));
    }
  } catch (error) {
    console.error('Error extracting glossary terms:', error);
    throw error;
  }
};

export const translateTextStream = async (
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
  onChunk: (chunk: string) => void,
  userPromptOverride?: string,
): Promise<string> => {
  if (!sourceText && !userPromptOverride) return '';

  try {
    let fullText = '';

    switch (settings.aiProvider) {
      case 'openai':
        fullText = await openai.translateWithOpenAIStream(
          sourceText,
          sourceLang,
          targetLang,
          settings,
          onChunk,
          userPromptOverride,
        );
        break;
      case 'deepseek':
        fullText = await deepseek.translateWithDeepSeekStream(
          sourceText,
          sourceLang,
          targetLang,
          settings,
          onChunk,
          userPromptOverride,
        );
        break;
      case 'gemini':
        fullText = await gemini.translateWithGeminiStream(
          sourceText,
          sourceLang,
          targetLang,
          settings,
          onChunk,
          userPromptOverride,
        );
        break;
      case 'local-mt':
        fullText = await translateWithLocalMtProvider(sourceText, sourceLang, targetLang, settings);
        if (fullText) {
          onChunk(fullText);
        }
        break;
      default:
        throw getUnsupportedProviderError(String(settings.aiProvider));
    }

    return fullText
      .trim()
      .replace(/^(['"`]{1,3})([\s\S]*?)\1$/, '$2')
      .replace(/^(translation|translated text):?\s*/i, '')
      .trim();
  } catch (error) {
    console.error(`Error calling ${settings.aiProvider} API for streaming translation:`, error);
    let errorMessage = 'An unexpected error occurred during streaming. Please try again.';

    if (settings.aiProvider === 'local-mt') {
      errorMessage = 'Local MT translation failed. Please check your local server and try again.';
    } else if (error instanceof Error) {
      errorMessage = `Streaming translation failed: ${error.message}.`;
    }

    const errorText = `[STREAM_TRANSLATION_ERROR: ${errorMessage}]`;
    onChunk(errorText);
    return errorText;
  }
};

export const translateText = async (
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
  userPromptOverride?: string,
): Promise<string> => {
  if (!sourceText && !userPromptOverride) return '';

  try {
    switch (settings.aiProvider) {
      case 'openai':
        return await openai.translateWithOpenAI(
          sourceText,
          sourceLang,
          targetLang,
          settings,
          userPromptOverride,
        );
      case 'deepseek':
        return await deepseek.translateWithDeepSeek(
          sourceText,
          sourceLang,
          targetLang,
          settings,
          userPromptOverride,
        );
      case 'gemini':
        return await gemini.translateWithGemini(
          sourceText,
          sourceLang,
          targetLang,
          settings,
          userPromptOverride,
        );
      case 'local-mt':
        return await translateWithLocalMtProvider(sourceText, sourceLang, targetLang, settings);
      default:
        throw getUnsupportedProviderError(String(settings.aiProvider));
    }
  } catch (error) {
    console.error(`Error calling ${settings.aiProvider} API for translation:`, error);
    let errorMessage = 'An unexpected error occurred. The AI model may be temporarily unavailable. Please try again later.';

    if (settings.aiProvider === 'local-mt') {
      errorMessage = 'Local MT translation failed. Please check your local server and try again.';
    } else if (error instanceof Error) {
      errorMessage = `Translation failed: ${error.message}. Please check your connection and try again.`;
    }

    return `[TRANSLATION_ERROR: ${errorMessage}]`;
  }
};

export const testOpenAIConnection = openai.testOpenAIConnection;
export const testDeepSeekConnection = deepseek.testDeepSeekConnection;
export const testGeminiConnection = gemini.testGeminiConnection;
export const testLocalMTConnection = localMt.testLocalMTConnection;

export const testLocalMTFallbackProviderConnection = async (
  settings: TranslationSettings,
): Promise<{ success: boolean; message: string }> => {
  switch (settings.localMtGlossaryProvider) {
    case 'gemini': {
      const result = await testGeminiConnection(settings);
      return result.success
        ? result
        : { success: false, message: 'Gemini fallback provider is unavailable. Please check your Gemini settings.' };
    }
    case 'openai': {
      const result = await testOpenAIConnection(settings);
      return result.success
        ? result
        : { success: false, message: 'OpenAI fallback provider is unavailable. Please check your OpenAI settings.' };
    }
    case 'deepseek': {
      const result = await testDeepSeekConnection(settings);
      return result.success
        ? result
        : { success: false, message: 'DeepSeek fallback provider is unavailable. Please check your DeepSeek settings.' };
    }
    case 'none':
    default:
      return { success: true, message: 'No fallback provider configured.' };
  }
};
