
import React, { useMemo } from 'react';
import type { GlossaryTerm } from '../types';
import { MatchType } from '../types';

// Add TypeScript definitions for the Intl.Segmenter API if not globally available
declare namespace Intl {
  interface SegmenterOptions {
    granularity?: 'grapheme' | 'word' | 'sentence';
  }
  interface Segment {
    segment: string;
    index: number;
    isWordLike?: boolean;
  }
  interface Segments extends Iterable<Segment> {
    containing(index: number): Segment | undefined;
  }
  class Segmenter {
    constructor(locales?: string | string[], options?: SegmenterOptions);
    segment(input: string): Segments;
  }
}

const escapeRegex = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const useTermHighlighter = (
  text: string,
  glossary: GlossaryTerm[],
  key: 'input' | 'translation',
  currentlyHighlightedTermId: string | null,
  setPopoverState: (state: { term: GlossaryTerm; anchorEl: HTMLElement } | null) => void,
  setTooltipState: (state: { term: GlossaryTerm; top: number; left: number; context: 'source' | 'target' } | null) => void,
  context: 'source' | 'target',
  sourceText?: string,
  translatedText?: string
): React.ReactElement => {

  return useMemo(() => {
    const buildFinalJsx = (finalMatches: { term: GlossaryTerm; index: number; text: string }[]) => {
        const handleMarkClick = (e: React.MouseEvent<HTMLElement>) => {
          const termId = e.currentTarget.dataset.termId;
          if (!termId) return;
          const term = glossary.find(t => t.id === termId);
          if (term) {
              setPopoverState({ term, anchorEl: e.currentTarget });
          }
        };

        const handleMarkMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
            const termId = e.currentTarget.dataset.termId;
            if (!termId) return;
            const term = glossary.find(t => t.id === termId);
            if (term) {
                setTooltipState({ term, top: e.clientY, left: e.clientX, context });
            }
        };

        const handleMarkMouseLeave = () => {
            setTooltipState(null);
        };

        const result: (string | React.ReactElement)[] = [];
        let currentIndex = 0;

        finalMatches.forEach((match, i) => {
          if (match.index > currentIndex) {
            result.push(text.substring(currentIndex, match.index));
          }

          const isEditing = match.term.id === currentlyHighlightedTermId;
          const className = isEditing
              ? "bg-accent-primary/50 ring-2 ring-accent-primary text-text-primary cursor-pointer rounded px-1 transition-all"
              : "bg-accent-secondary/30 hover:bg-accent-secondary/50 text-text-primary cursor-pointer rounded px-1";

          result.push(
            React.createElement(
              'mark',
              {
                key: `${match.term.id}-${match.index}-${i}`,
                'data-term-id': match.term.id,
                className: className,
                onClick: handleMarkClick,
                onMouseEnter: handleMarkMouseEnter,
                onMouseLeave: handleMarkMouseLeave,
              },
              match.text
            )
          );

          currentIndex = match.index + match.text.length;
        });

        if (currentIndex < text.length) {
          result.push(text.substring(currentIndex));
        }

        return React.createElement(React.Fragment, null, ...result);
    }

    const highlightTermsWithSegmenter = (): React.ReactElement => {
      const normalizeStringForCompare = (str: string): string => {
          return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
      };

      const sortedGlossary = [...glossary].filter(term => term[key] && term[key].trim() !== '').sort((a, b) => (b[key].match(/\s/g)?.length ?? 0) - (a[key].match(/\s/g)?.length ?? 0) || b[key].length - a[key].length);

      if (!text || sortedGlossary.length === 0) return React.createElement('span', null, text);

      const segmenter = new Intl.Segmenter('vi', { granularity: 'word' });
      
      const glossaryTermTokens = sortedGlossary.map(term => ({ term, tokens: Array.from(segmenter.segment(term[key])).filter(s => s.isWordLike).map(s => s.segment) })).filter(item => item.tokens.length > 0);
      
      const wordLikeTextSegments = Array.from(segmenter.segment(text)).filter(s => s.isWordLike);
      
      const allMatches: { term: GlossaryTerm; index: number; text: string }[] = [];

      for (let i = 0; i < wordLikeTextSegments.length; i++) {
          for (const { term, tokens: termTokens } of glossaryTermTokens) {
              if (i + termTokens.length > wordLikeTextSegments.length) continue;
              
              let isFullMatch = true;
              for (let j = 0; j < termTokens.length; j++) {
                  const segmentsMatch = (term.matchType === MatchType.Exact) ? wordLikeTextSegments[i + j].segment === termTokens[j] : normalizeStringForCompare(wordLikeTextSegments[i + j].segment) === normalizeStringForCompare(termTokens[j]);
                  if (!segmentsMatch) { isFullMatch = false; break; }
              }

              if (isFullMatch) {
                  const startSegment = wordLikeTextSegments[i];
                  const endSegment = wordLikeTextSegments[i + termTokens.length - 1];
                  const startIndex = startSegment.index;
                  const endIndex = endSegment.index + endSegment.segment.length;
                  allMatches.push({ term, index: startIndex, text: text.substring(startIndex, endIndex) });
              }
          }
      }

      if (allMatches.length === 0) return React.createElement('span', null, text);

      allMatches.sort((a, b) => a.index - b.index || b.text.length - a.text.length);

      const finalMatches: { term: GlossaryTerm; index: number; text: string }[] = [];
      let lastIndex = -1;

      for (const match of allMatches) {
        if (match.index > lastIndex) {
          finalMatches.push(match);
          lastIndex = match.index + match.text.length - 1;
        }
      }

      return buildFinalJsx(finalMatches);
    };
    
    const highlightTermsWithRegex = (): React.ReactElement => {
      const buildRobustRegex = (term: string, matchType: 'Exact' | 'Case-Insensitive' | 'Không xác định'): RegExp => {
          if (matchType === MatchType.Exact) {
              const exactPattern = escapeRegex(term).replace(/\s+/g, '\\s+');
              try { return new RegExp(`(?<![\\p{L}\\p{N}])${exactPattern}(?![\\p{L}\\p{N}])`, 'gu'); } catch (e) { return new RegExp(`\\b${escapeRegex(term)}\\b`, 'g'); }
          }
          try {
              const flags = 'giu';
              const words = term.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
              if (words.length === 0) return new RegExp(escapeRegex(term), flags);
              const patternParts = words.map(word => { let wordPattern = ''; for (const char of word) { const normalized = char.normalize("NFD"); const baseChar = normalized[0]; wordPattern += (baseChar.toLowerCase() === 'd') ? '[dđĐ]' : escapeRegex(baseChar) + "[\u0300-\u036f]*"; } return wordPattern; });
              const separator = `[^\\p{L}\\p{N}]+`;
              const finalPatternBody = patternParts.join(separator);
              const finalPattern = `(?<![\\p{L}\\p{N}])${finalPatternBody}(?![\\p{L}\\p{N}])`;
              return new RegExp(finalPattern, flags);
          } catch (e) {
              console.warn(`Could not create robust regex for term: "${term}". Falling back.`, e);
              let simpleTermPattern = '';
              for (const char of term) { if (/\s/.test(char)) { simpleTermPattern += '\\s+'; continue; } const normalized = char.normalize("NFD"); const baseChar = normalized[0]; simpleTermPattern += (baseChar.toLowerCase() === 'd') ? '[dđĐ]' : escapeRegex(baseChar) + "[\u0300-\u036f]*"; }
              return new RegExp(`\\b${simpleTermPattern}\\b`, 'gi');
          }
      };
      
      if (!text || glossary.length === 0) return React.createElement('span', null, text);

      const sortedGlossary = [...glossary].filter(term => term[key] && term[key].trim() !== '').sort((a, b) => b[key].length - a[key].length);
      if (sortedGlossary.length === 0) return React.createElement('span', null, text);
      
      const allMatches: { term: GlossaryTerm; index: number; text: string }[] = [];

      sortedGlossary.forEach(term => {
        const termText = term[key];
        if (!termText) return;
        // Fix: Defensive check against legacy "Không xác định" value for matchType
        const regex = buildRobustRegex(termText, (term.matchType as any) === 'Không xác định' ? MatchType.CaseInsensitive : term.matchType);
        let match;
        while ((match = regex.exec(text)) !== null) {
          if (match.index === regex.lastIndex) regex.lastIndex++;
          allMatches.push({ term, index: match.index, text: match[0] });
        }
      });

      if (allMatches.length === 0) return React.createElement('span', null, text);

      allMatches.sort((a, b) => a.index - b.index || b.text.length - a.text.length);

      const finalMatches: { term: GlossaryTerm; index: number; text: string }[] = [];
      let lastIndex = -1;

      for (const match of allMatches) {
        if (match.index > lastIndex) {
          finalMatches.push(match);
          lastIndex = match.index + match.text.length - 1;
        }
      }

      return buildFinalJsx(finalMatches);
    };

    if (typeof Intl?.Segmenter === 'function') {
        try { return highlightTermsWithSegmenter(); } catch (e) { console.warn("Intl.Segmenter approach failed, falling back to regex.", e); return highlightTermsWithRegex(); }
    } else {
        return highlightTermsWithRegex();
    }
  }, [text, glossary, key, currentlyHighlightedTermId, setPopoverState, setTooltipState, context]);
};
