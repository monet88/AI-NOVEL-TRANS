
import type { TranslationSettings, GlossaryTerm } from '../../types';
import { fetchWithRetry, buildTranslationPrompt, splitTextIntoChunks, commonStreamHandler } from '../utils';

const OPENAI_MODEL = 'gpt-4o';

const commonOpenAIErrorHandler = async (response: Response, context: string) => {
    const errorData = await response.json().catch(() => ({ error: { message: 'Failed to parse error response.' }}));
    const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
    console.error(`Error calling OpenAI API for ${context}:`, errorMessage);
    throw new Error(`OpenAI API Error for ${context}: ${errorMessage}`);
};

export const extractGlossaryWithOpenAI = async (
    sourceText: string, 
    targetLang: string, 
    glossaryExtractionInstructions: string, 
    exclusionList: string,
    settings: TranslationSettings
): Promise<Omit<GlossaryTerm, 'id'>[]> => {
    if (!settings.openaiApiKey) {
        throw new Error('OpenAI API key is not set. Please add it in the AI Settings.');
    }
    const openaiApiUrl = settings.openaiApiEndpoint || 'https://api.openai.com/v1/chat/completions';
    const CHUNK_SIZE = 8000;
    const textChunks = splitTextIntoChunks(sourceText, CHUNK_SIZE);
    let allTerms: Omit<GlossaryTerm, 'id'>[] = [];

    for (const chunk of textChunks) {
        if (chunk.trim() === '') continue;
        const exclusionPrompt = exclusionList.trim() ? `\n**Exclusion List:**\nDo not extract any of the following terms. These should be completely ignored:\n"""\n${exclusionList.trim()}\n"""\n` : '';
        const instructionsPrompt = glossaryExtractionInstructions.trim() ? `\n**Style Guidelines for Translation Suggestions:**\nWhen suggesting translations, strictly adhere to the following style guidelines:\n"""\n${glossaryExtractionInstructions.trim()}\n"""\n` : '';
        
        const response = await fetchWithRetry(openaiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.openaiApiKey}` },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    { role: 'system', content: `You are a linguistic analyst. Your task is to extract key terms and suggest translations into ${targetLang} based on the user's rules.` },
                    { role: 'user', content: `Analyze the following text.${exclusionPrompt}${instructionsPrompt}\n\n**Source Text to Analyze:**\n"""\n${chunk}\n"""` }
                ],
                tools: [{
                    type: "function",
                    function: {
                        name: "extract_glossary_terms",
                        description: "Extracts key terms from text and provides their details.",
                        parameters: {
                            type: "object",
                            properties: {
                                terms: { type: "array", items: { type: "object", properties: { input: { type: "string" }, translation: { type: "string" }, gender: { type: "string", enum: ['Male', 'Female', 'Neutral'] }, matchType: { type: "string", enum: ['Exact', 'Case-Insensitive'] } }, required: ["input", "translation"] } }
                            },
                            required: ["terms"]
                        }
                    }
                }],
                tool_choice: { type: "function", function: { name: "extract_glossary_terms" } }
            })
        });

        if (!response.ok) await commonOpenAIErrorHandler(response, 'glossary extraction');
        
        const data = await response.json();
        const toolCall = data.choices[0]?.message?.tool_calls?.[0];
        if (toolCall) {
            const parsed = JSON.parse(toolCall.function.arguments);
            if (Array.isArray(parsed.terms)) {
                const termsWithDefaults = parsed.terms.map((term: any) => ({
                    ...term,
                    gender: term.gender || 'Không xác định',
                    matchType: term.matchType || 'Không xác định',
                }));
                allTerms.push(...termsWithDefaults);
            }
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

export const translateWithOpenAI = async (
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    settings: TranslationSettings,
    userPromptOverride?: string,
): Promise<string> => {
    if (!settings.openaiApiKey) {
        throw new Error('OpenAI API key is not set. Please add it in the AI Settings.');
    }
    const openaiApiUrl = settings.openaiApiEndpoint || 'https://api.openai.com/v1/chat/completions';
    const userPrompt = userPromptOverride ?? buildTranslationPrompt(sourceText, sourceLang, targetLang, settings);

    const response = await fetchWithRetry(openaiApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.openaiApiKey}` },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: `You are an expert translator. Your sole task is to translate the user's text from the source language to the target language as accurately and naturally as possible. Adhere strictly to any glossary terms and custom instructions provided. Your response MUST contain ONLY the translated text.` },
                { role: 'user', content: userPrompt }
            ]
        })
    });
    if (!response.ok) await commonOpenAIErrorHandler(response, 'translation');
    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() ?? '';
};

export const testOpenAIConnection = async (settings: TranslationSettings): Promise<{ success: boolean; message: string }> => {
    if (!settings.openaiApiKey) {
        return { success: false, message: 'API key is missing.' };
    }
    const openaiApiUrl = settings.openaiApiEndpoint || 'https://api.openai.com/v1/chat/completions';

    try {
        const response = await fetchWithRetry(openaiApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.openaiApiKey}`
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [{ role: 'user', content: 'Say "hello".' }],
                max_tokens: 1,
            })
        });

        if (response.ok) {
            return { success: true, message: 'Connection successful!' };
        } else {
            const errorData = await response.json().catch(() => ({ error: { message: `API returned status: ${response.status}` }}));
            let detailedMessage = errorData?.error?.message || `An unknown error occurred. Status: ${response.status}`;
            if (errorData?.error?.code) {
                detailedMessage += ` (Code: ${errorData.error.code})`;
            }
            return { success: false, message: `Connection failed: ${detailedMessage}` };
        }
    } catch (error) {
        console.error("OpenAI connection test failed due to a network or other error:", error);
        return { success: false, message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
};

export const translateWithOpenAIStream = async (
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    settings: TranslationSettings,
    onChunk: (chunk: string) => void,
    userPromptOverride?: string,
): Promise<string> => {
    if (!settings.openaiApiKey) throw new Error('OpenAI API key is not set.');
    const openaiApiUrl = settings.openaiApiEndpoint || 'https://api.openai.com/v1/chat/completions';
    const userPrompt = userPromptOverride ?? buildTranslationPrompt(sourceText, sourceLang, targetLang, settings);

    const response = await fetchWithRetry(openaiApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.openaiApiKey}` },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: `You are an expert translator. Your sole task is to translate the user's text from the source language to the target language as accurately and naturally as possible. Adhere strictly to any glossary terms and custom instructions provided. Your response MUST contain ONLY the translated text.` },
                { role: 'user', content: userPrompt }
            ],
            stream: true,
        })
    });
    
    return await commonStreamHandler(response, onChunk, 'streaming translation');
};