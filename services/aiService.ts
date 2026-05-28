
import type { TranslationSettings, GlossaryTerm } from '../types';
import * as gemini from './api/gemini';
import * as openai from './api/openai';
import * as deepseek from './api/deepseek';

export * from './utils';

// =================================================================================
// EXPORTED WRAPPER FUNCTIONS
// =================================================================================

export const extractGlossaryTerms = async (
    sourceText: string, 
    targetLang: string, 
    glossaryExtractionInstructions: string, 
    exclusionList: string,
    settings: TranslationSettings
): Promise<Omit<GlossaryTerm, 'id'>[]> => {
    if (!sourceText) return [];
    try {
        const provider = settings.aiProvider || 'gemini'; // Default to gemini if not set
        if (provider === 'openai') {
            return await openai.extractGlossaryWithOpenAI(sourceText, targetLang, glossaryExtractionInstructions, exclusionList, settings);
        } else if (provider === 'deepseek') {
            return await deepseek.extractGlossaryWithDeepSeek(sourceText, targetLang, glossaryExtractionInstructions, exclusionList, settings);
        }
        return await gemini.extractGlossaryWithGemini(sourceText, targetLang, glossaryExtractionInstructions, exclusionList, settings);
    } catch (error) {
        console.error("Error extracting glossary terms:", error);
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
        const provider = settings.aiProvider || 'gemini';
        let fullText = '';
        if (provider === 'openai') {
            fullText = await openai.translateWithOpenAIStream(sourceText, sourceLang, targetLang, settings, onChunk, userPromptOverride);
        } else if (provider === 'deepseek') {
            fullText = await deepseek.translateWithDeepSeekStream(sourceText, sourceLang, targetLang, settings, onChunk, userPromptOverride);
        } else {
            fullText = await gemini.translateWithGeminiStream(sourceText, sourceLang, targetLang, settings, onChunk, userPromptOverride);
        }
        // Clean the final accumulated text
        return fullText.trim().replace(/^(['"`]{1,3})([\s\S]*?)\1$/, '$2').replace(/^(translation|translated text):?\s*/i, '').trim();
    } catch (error) {
        console.error(`Error calling ${settings.aiProvider} API for streaming translation:`, error);
        let errorMessage = "An unexpected error occurred during streaming. Please try again.";
        if (error instanceof Error) {
            errorMessage = `Streaming translation failed: ${error.message}.`;
        }
        const errorText = `[STREAM_TRANSLATION_ERROR: ${errorMessage}]`;
        onChunk(errorText); // Send error as a chunk to display it
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
        const provider = settings.aiProvider || 'gemini';
        if (provider === 'openai') {
            return await openai.translateWithOpenAI(sourceText, sourceLang, targetLang, settings, userPromptOverride);
        } else if (provider === 'deepseek') {
            return await deepseek.translateWithDeepSeek(sourceText, sourceLang, targetLang, settings, userPromptOverride);
        }
        return await gemini.translateWithGemini(sourceText, sourceLang, targetLang, settings, userPromptOverride);
    } catch (error) {
        console.error(`Error calling ${settings.aiProvider} API for translation:`, error);
        let errorMessage = "An unexpected error occurred. The AI model may be temporarily unavailable. Please try again later.";
        if (error instanceof Error) {
            errorMessage = `Translation failed: ${error.message}. Please check your connection and try again.`;
        }
        return `[TRANSLATION_ERROR: ${errorMessage}]`;
    }
};

export const testOpenAIConnection = openai.testOpenAIConnection;
export const testDeepSeekConnection = deepseek.testDeepSeekConnection;
export const testGeminiConnection = gemini.testGeminiConnection;