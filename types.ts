
import { z } from 'zod';
import {
  TranslationMemoryEntrySchema,
  ProjectSchema,
  ChapterSchema,
  MatchTypeSchema,
  GenderSchema,
  GlossaryTermSchema,
  TranslationSettingsSchema
} from './schema';

export type TranslationMemoryEntry = z.infer<typeof TranslationMemoryEntrySchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;

// Keep enums accessible as values if they were used that way
export enum MatchType {
  Exact = 'Exact',
  CaseInsensitive = 'Case-Insensitive',
}

export type Gender = z.infer<typeof GenderSchema>;
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;
export type TranslationSettings = z.infer<typeof TranslationSettingsSchema>;
