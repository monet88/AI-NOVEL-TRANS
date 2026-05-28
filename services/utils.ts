
import type { TranslationSettings } from '../types';
import { MatchType } from '../types';

const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 5000]; 

export async function callApiWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i < MAX_RETRIES) {
        const delay = RETRY_DELAYS[i];
        console.warn(`API call failed. Retrying in ${delay / 1000}s...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('API call failed after all retries.');
}

export async function fetchWithRetry(url: RequestInfo, options?: RequestInit): Promise<Response> {
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      const response = await fetch(url, options);
      if ((response.status === 429 || response.status >= 500) && i < MAX_RETRIES) {
        const delay = RETRY_DELAYS[i];
        console.warn(`API request to ${url.toString()} failed with status ${response.status}. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (i < MAX_RETRIES) {
        const delay = RETRY_DELAYS[i];
        console.warn(`API request to ${url.toString()} failed with network error. Retrying in ${delay / 1000}s...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('API request failed after all retries.');
}

function buildGlossaryPrompt(glossary: TranslationSettings['glossary']): string {
    if (!glossary || glossary.length === 0) {
        return '';
    }

    const termDescriptions = glossary.map(term => {
        const matchType = term.matchType || MatchType.CaseInsensitive;
        let behavior = '';
        
        if (matchType === MatchType.Exact) {
            behavior = `(STRICT: Match exact casing and use "${term.translation}" exactly as written)`;
        } else {
            behavior = `(FLEXIBLE: Match regardless of case; adapt "${term.translation}" casing to match the source text)`;
        }

        const genderInfo = (term.gender === 'Male' || term.gender === 'Female') ? ` [Gender: ${term.gender}]` : '';
        
        return `- "${term.input}" -> "${term.translation}" ${behavior}${genderInfo}`;
    }).join('\n');

    return `CRITICAL: You MUST adhere to the following GLOSSARY. Consistency is mandatory.

**Match Type Definitions:**
- EXACT: Only match the term if it has the exact same characters and casing as provided. Do not modify the translation's casing.
- CASE-INSENSITIVE: Match the term regardless of capitalization. However, you MUST adapt the casing of your translation to match the usage in the source text (e.g., if "apple" -> "táo", then "Apple" should become "Táo" and "APPLE" should become "TÁO").

GLOSSARY TERMS:
${termDescriptions}

Ensure character names, ranks, and specialized terminology are consistent throughout the entire output.\n`;
}

export const buildTranslationPromptPrefix = (
    sourceLang: string,
    targetLang: string,
    settings: TranslationSettings,
): string => {
    const glossaryPrompt = settings.useGlossaryAI ? buildGlossaryPrompt(settings.glossary) : '';
    const instructionsPrompt = settings.customInstructions ? `Follow these instructions:\n${settings.customInstructions}\n` : '';
    return `Translate the following text from ${sourceLang} to ${targetLang}.\n${glossaryPrompt}${instructionsPrompt}\nSource Text:\n"""\n`;
};

export const buildTranslationPrompt = (
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    settings: TranslationSettings,
): string => {
    const prefix = buildTranslationPromptPrefix(sourceLang, targetLang, settings);
    return `${prefix}${sourceText}\n"""`.trim();
};

export const buildPromptTemplate = (
    sourceLang: string,
    targetLang: string,
    settings: TranslationSettings
): ((sourceText: string) => string) => {
    const prefix = buildTranslationPromptPrefix(sourceLang, targetLang, settings);
    return (sourceText: string) => `${prefix}${sourceText}\n"""`.trim();
};

export function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim() !== '');
    const chunks: string[] = [];
    if (paragraphs.length === 0 && text.trim().length > 0) {
        paragraphs.push(text);
    }
    let currentChunk = '';
    for (const paragraph of paragraphs) {
        if (paragraph.length > maxChunkSize) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = '';
            }
            for (let i = 0; i < paragraph.length; i += maxChunkSize) {
                chunks.push(paragraph.substring(i, i + maxChunkSize));
            }
        } else if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
            }
            currentChunk = paragraph;
        } else {
            currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
        }
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    if (chunks.length === 0 && text.trim().length > 0) {
         chunks.push(text);
    }
    return chunks;
}

export const commonStreamHandler = async (
    response: Response,
    onChunk: (chunk: string) => void,
    context: string
): Promise<string> => {
    if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: { message: `HTTP error! status: ${response.status}` }}));
        const errorMessage = errorData?.error?.message || `Failed to start stream.`;
        console.error(`Error in stream for ${context}:`, errorMessage);
        throw new Error(`Stream Error for ${context}: ${errorMessage}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data: ')) continue;
            if (line.includes('[DONE]')) return fullText;
            
            try {
                const jsonStr = line.replace('data: ', '');
                const data = JSON.parse(jsonStr);
                const chunkText = data.choices?.[0]?.delta?.content;
                if (chunkText) {
                    fullText += chunkText;
                    onChunk(chunkText);
                }
            } catch (error) {
                console.warn('Failed to parse stream chunk:', line, error);
            }
        }
    }
    return fullText;
};

/**
 * Check which glossary terms were used in the translation
 * Returns an object with used and unused terms
 */
export const checkGlossaryUsage = (
    sourceText: string,
    translatedText: string,
    glossary: TranslationSettings['glossary']
): { used: string[], unused: string[], missing: string[] } => {
    if (!glossary || glossary.length === 0) {
        return { used: [], unused: [], missing: [] };
    }

    const used: string[] = [];
    const unused: string[] = [];
    const missing: string[] = [];

    // Normalize text for comparison
    const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '');

    for (const term of glossary) {
        const sourceNormalized = normalizeText(sourceText);
        const termNormalized = normalizeText(term.input);
        
        // Check if term appears in source text
        const appearsInSource = sourceNormalized.includes(termNormalized);
        
        if (appearsInSource) {
            // Check if translation appears in translated text
            const translatedNormalized = normalizeText(translatedText);
            const translationNormalized = normalizeText(term.translation);
            
            if (translatedNormalized.includes(translationNormalized)) {
                used.push(term.input);
            } else {
                missing.push(term.input);
            }
        } else {
            unused.push(term.input);
        }
    }

    return { used, unused, missing };
};

/**
 * Generate a report of glossary term usage
 */
export const generateGlossaryUsageReport = (
    sourceText: string,
    translatedText: string,
    glossary: TranslationSettings['glossary']
): string => {
    const { used, unused, missing } = checkGlossaryUsage(sourceText, translatedText, glossary);
    
    let report = '📊 GLOSSARY USAGE REPORT:\n\n';
    
    if (used.length > 0) {
        report += `✅ USED TERMS (${used.length}):\n`;
        used.forEach(term => report += `  - ${term}\n`);
        report += '\n';
    }
    
    if (missing.length > 0) {
        report += `⚠️ MISSING TERMS (${missing.length}) - Found in source but not in translation:\n`;
        missing.forEach(term => report += `  - ${term}\n`);
        report += '\n';
    }
    
    if (unused.length > 0) {
        report += `ℹ️ UNUSED TERMS (${unused.length}) - Not found in source text:\n`;
        unused.forEach(term => report += `  - ${term}\n`);
        report += '\n';
    }
    
    const totalTerms = glossary.length;
    const usedCount = used.length;
    const missingCount = missing.length;
    
    report += `📈 SUMMARY:\n`;
    report += `  Total glossary terms: ${totalTerms}\n`;
    report += `  Successfully used: ${usedCount}/${totalTerms} (${Math.round(usedCount/totalTerms*100)}%)\n`;
    report += `  Missing in translation: ${missingCount}\n`;
    
    if (missingCount > 0) {
        report += `\n🚨 WARNING: ${missingCount} terms were found in source but missing in translation!\n`;
        report += `Please review the translation to ensure all glossary terms are properly applied.`;
    }
    
    return report;
};
