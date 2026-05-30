import type { GlossaryTerm, TranslationSettings } from '../../types';

const DEFAULT_LOCAL_MT_ENDPOINT = 'http://localhost:8000';
const LOCAL_MT_TIMEOUT_MS = 10000;

type LocalMtGlossaryTerm = {
  input: string;
  translation: string;
  matchType: GlossaryTerm['matchType'];
  variants?: string[];
};

type LocalMtTranslationResponse = {
  translation: string;
  warnings?: string[];
  time_ms?: number;
  draft?: string;
};

const getTimeoutController = (timeoutMs = LOCAL_MT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    clear: () => window.clearTimeout(timeoutId),
  };
};

const getLocalMtErrorMessage = async (response: Response): Promise<string> => {
  await response.json().catch(() => null);
  return `Local MT server returned HTTP ${response.status}.`;
};

const hasVariants = (term: GlossaryTerm): term is GlossaryTerm & { variants: string[] } => {
  const candidate = term as GlossaryTerm & { variants?: unknown };
  return Array.isArray(candidate.variants);
};

const mapGlossaryForLocalMt = (glossary: TranslationSettings['glossary']): LocalMtGlossaryTerm[] => {
  return glossary.map((term) => {
    const mappedTerm: LocalMtGlossaryTerm = {
      input: term.input,
      translation: term.translation,
      matchType: term.matchType,
    };

    if (hasVariants(term) && term.variants.length > 0) {
      mappedTerm.variants = term.variants.filter((variant) => typeof variant === 'string' && variant.trim() !== '');
    }

    return mappedTerm;
  });
};

const postLocalMtRequest = async (
  endpoint: string,
  body: Record<string, unknown>,
): Promise<LocalMtTranslationResponse> => {
  const { controller, clear } = getTimeoutController();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await getLocalMtErrorMessage(response));
    }

    return await response.json() as LocalMtTranslationResponse;
  } finally {
    clear();
  }
};

export const normalizeLocalMtEndpoint = (endpoint: string): string => {
  const resolvedEndpoint = endpoint.trim() || DEFAULT_LOCAL_MT_ENDPOINT;
  const parsedEndpoint = new URL(resolvedEndpoint);
  const hostname = parsedEndpoint.hostname.toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.localhost');

  if (parsedEndpoint.protocol !== 'http:' && parsedEndpoint.protocol !== 'https:') {
    throw new Error('Local MT endpoint must use http or https.');
  }

  if (!isLocalHost) {
    throw new Error('Local MT endpoint must point to a local server (localhost or 127.0.0.1).');
  }

  return `${parsedEndpoint.origin}${parsedEndpoint.pathname.replace(/\/+$/, '')}`.replace(/\/$/, '');
};

export const testLocalMTConnection = async (settings: TranslationSettings): Promise<{ success: boolean; message: string }> => {
  const { controller, clear } = getTimeoutController(5000);

  try {
    const endpoint = `${normalizeLocalMtEndpoint(settings.localMtEndpoint)}/api/health`;
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return { success: false, message: `Connection failed: ${await getLocalMtErrorMessage(response)}` };
    }

    return { success: true, message: 'Connection successful!' };
  } catch {
    return {
      success: false,
      message: 'Connection failed: Unable to reach the local MT server.',
    };
  } finally {
    clear();
  }
};

export const translateWithLocalMT = async (
  sourceText: string,
  _sourceLang: string,
  _targetLang: string,
  settings: TranslationSettings,
): Promise<string> => {
  const response = await postLocalMtRequest(
    `${normalizeLocalMtEndpoint(settings.localMtEndpoint)}/api/translate`,
    {
      text: sourceText,
      glossary: mapGlossaryForLocalMt(settings.glossary),
    }
  );

  return response.translation?.trim() ?? '';
};

export const translateWithLocalMTStream = async (
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
  onChunk: (chunk: string) => void,
): Promise<string> => {
  const translation = await translateWithLocalMT(sourceText, sourceLang, targetLang, settings);

  if (translation) {
    onChunk(translation);
  }

  return translation;
};

export const translateWithLocalMTHybrid = async (
  sourceText: string,
  _sourceLang: string,
  _targetLang: string,
  settings: TranslationSettings,
): Promise<string> => {
  const response = await postLocalMtRequest(
    `${normalizeLocalMtEndpoint(settings.localMtEndpoint)}/api/translate/hybrid`,
    {
      text: sourceText,
      glossary: mapGlossaryForLocalMt(settings.glossary),
    }
  );

  return response.translation?.trim() ?? '';
};
