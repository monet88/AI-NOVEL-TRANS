
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { TranslationSettings, GlossaryTerm } from '../../types';
import { callApiWithRetry, buildTranslationPrompt, splitTextIntoChunks } from '../utils';

const GEMINI_MODEL = 'gemini-2.5-pro';

const getGeminiClient = (settings: Pick<TranslationSettings, 'geminiApiKey'>) => {
    const apiKey = settings.geminiApiKey || process.env.API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key is not configured. Please provide it in settings or ensure it is set in the environment.');
    }
    return new GoogleGenAI({ apiKey });
};

export const extractGlossaryWithGemini = async (
    sourceText: string,
    targetLang: string,
    glossaryExtractionInstructions: string,
    exclusionList: string,
    settings: TranslationSettings
): Promise<Omit<GlossaryTerm, 'id'>[]> => {
    const ai = getGeminiClient(settings);
    const CHUNK_SIZE = 8000;
    const textChunks = splitTextIntoChunks(sourceText, CHUNK_SIZE);
    let allTerms: Omit<GlossaryTerm, 'id'>[] = [];

    for (const chunk of textChunks) {
        if (chunk.trim() === '') continue;
        const exclusionPrompt = exclusionList.trim() ? `\n**Exclusion List:**\nDo not extract any of the following terms. These should be completely ignored:\n"""\n${exclusionList.trim()}\n"""\n` : '';
        const instructionsPrompt = glossaryExtractionInstructions.trim() ? `\n**Style Guidelines for Translation Suggestions:**\nWhen suggesting translations, strictly adhere to the following style guidelines:\n"""\n${glossaryExtractionInstructions.trim()}\n"""\n` : '';
        const prompt = `Analyze the following text to extract key terms like character names, locations, and unique terminology.${exclusionPrompt}${instructionsPrompt}\n\n**Your Task:**\nFor each extracted term, you must:\n1. Provide a suggested translation into ${targetLang} that follows any Style Guidelines above.\n2. Determine the gender ('Male', 'Female', or 'Neutral'). Use 'Neutral' for non-characters or if gender is ambiguous.\n3. Suggest a match type: 'Case-Insensitive' is recommended for proper nouns (like names and places), and 'Exact' for other specific terms.\n\n**Source Text to Analyze:**\n"""\n${chunk}\n"""`;

        const response = await callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { input: { type: Type.STRING }, translation: { type: Type.STRING }, gender: { type: Type.STRING, enum: ['Male', 'Female', 'Neutral'] }, matchType: { type: Type.STRING, enum: ['Exact', 'Case-Insensitive'] } }, required: ["input", "translation"] } },
            },
        }));
        const jsonStr = response.text.trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
            const termsWithDefaults = parsed.map((term: any) => ({
                ...term,
                gender: term.gender || 'Không xác định',
                matchType: term.matchType || 'Không xác định',
            }));
            allTerms.push(...termsWithDefaults);
        }
    }

    const uniqueTermsMap = new Map<string, Omit<GlossaryTerm, 'id'>>();
    for (const term of allTerms) {
        if (term.input && !uniqueTermsMap.has(term.input.toLowerCase())) {
            uniqueTermsMap.set(term.input.toLowerCase(), term);
        }
    }
    return Array.from(uniqueTermsMap.values());
};

export const translateWithGemini = async (
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    settings: TranslationSettings,
    userPromptOverride?: string,
): Promise<string> => {
    const ai = getGeminiClient(settings);
    const userPrompt = userPromptOverride ?? buildTranslationPrompt(sourceText, sourceLang, targetLang, settings);
    const systemInstruction = `You are an expert translator... Your response MUST contain ONLY the translated text.`;
    
    const response = await callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: { systemInstruction },
    }));

    let translatedText = response.text.trim().replace(/^(['"`]{1,3})([\s\S]*?)\1$/, '$2').replace(/^(translation|translated text):?\s*/i, '').trim();
    return translatedText;
};

export const translateWithGeminiStream = async (
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    settings: TranslationSettings,
    onChunk: (chunk: string) => void,
    userPromptOverride?: string,
): Promise<string> => {
    const ai = getGeminiClient(settings);
    const userPrompt = userPromptOverride ?? buildTranslationPrompt(sourceText, sourceLang, targetLang, settings);
    const systemInstruction = `You are an expert translator. Your sole task is to translate the user's text from the source language to the target language as accurately and naturally as possible. Adhere strictly to any glossary terms and custom instructions provided. Your response MUST contain ONLY the translated text.`;
    
    const responseStream = await callApiWithRetry<AsyncGenerator<GenerateContentResponse>>(() => ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: { systemInstruction },
    }));

    let fullText = '';
    for await (const chunk of responseStream) {
        const chunkText = chunk.text;
        if (chunkText) {
            fullText += chunkText;
            onChunk(chunkText);
        }
    }
    return fullText;
};

export const testGeminiConnection = async (settings: TranslationSettings): Promise<{ success: boolean; message: string }> => {
    const apiKey = settings.geminiApiKey || process.env.API_KEY;
    if (!apiKey) {
        return { success: false, message: 'API key is missing.' };
    }

    try {
        const ai = getGeminiClient(settings);
        // A simple, low-token request to check if the key is valid.
        await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Use a fast model for testing
            contents: 'hello',
        });
        return { success: true, message: 'Connection successful!' };
    } catch (error: any) {
        console.error("Gemini connection test failed:", error);
        let errorMessage = 'An unknown error occurred.';
        if (error.message) {
            // Extract the core error message if possible
            const match = error.message.match(/\[GoogleGenerativeAI Error\]: (.*)/);
            errorMessage = match ? match[1] : error.message;
        }
        return { success: false, message: `Connection failed: ${errorMessage}` };
    }
};