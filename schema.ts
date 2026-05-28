import { z } from 'zod';

export const TranslationMemoryEntrySchema = z.object({
  source: z.string(),
  target: z.string(),
});

export const ChapterSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceText: z.string(),
  translatedText: z.string(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  author: z.string(),
  chapters: z.array(ChapterSchema),
  translationMemory: z.array(TranslationMemoryEntrySchema),
});

export const MatchTypeSchema = z.enum(['Exact', 'Case-Insensitive']);

export const GenderSchema = z.enum(['Male', 'Female', 'Neutral', 'Không xác định']);

export const GlossaryTermSchema = z.object({
  id: z.string(),
  input: z.string(),
  translation: z.string(),
  gender: GenderSchema,
  matchType: MatchTypeSchema,
});

export const TranslationSettingsSchema = z.object({
  aiProvider: z.enum(['gemini', 'openai', 'deepseek']),
  geminiApiKey: z.string(),
  openaiApiKey: z.string(),
  openaiApiEndpoint: z.string(),
  deepseekApiKey: z.string(),
  deepseekApiEndpoint: z.string(),
  glossary: z.array(GlossaryTermSchema),
  useGlossaryAI: z.boolean(),
  defaultMatchType: MatchTypeSchema,
  customInstructions: z.string(),
  glossaryExtractionInstructions: z.string(),
  exclusionList: z.string(),
});
