import React from 'react';
import type { GlossaryTerm } from '../../types';
import { checkGlossaryUsage } from '../../services/utils';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import XMarkIcon from '../icons/XMarkIcon';
import InformationCircleIcon from '../icons/InformationCircleIcon';

interface GlossaryUsageReportProps {
  sourceText: string;
  translatedText: string;
  glossary: GlossaryTerm[];
  className?: string;
}

const GlossaryUsageReport: React.FC<GlossaryUsageReportProps> = ({
  sourceText,
  translatedText,
  glossary,
  className = ''
}) => {
  const { used, unused, missing } = checkGlossaryUsage(sourceText, translatedText, glossary);
  
  const totalTerms = glossary.length;
  const usedCount = used.length;
  const missingCount = missing.length;
  const usagePercentage = totalTerms > 0 ? Math.round(usedCount / totalTerms * 100) : 0;

  if (totalTerms === 0) {
    return (
      <div className={`p-4 bg-dark-panel rounded-lg border border-border-color ${className}`}>
        <div className="flex items-center space-x-2 text-text-secondary">
          <InformationCircleIcon className="w-5 h-5" />
          <span>No glossary terms available</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-dark-panel rounded-lg border border-border-color ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary mb-2">Glossary Usage Report</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${usagePercentage >= 80 ? 'bg-success' : usagePercentage >= 60 ? 'bg-warning' : 'bg-danger'}`}></div>
            <span className="text-sm text-text-secondary">
              {usedCount}/{totalTerms} terms used ({usagePercentage}%)
            </span>
          </div>
          {missingCount > 0 && (
            <div className="flex items-center space-x-2 text-danger">
              <XMarkIcon className="w-4 h-4" />
              <span className="text-sm">{missingCount} missing</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {used.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircleIcon className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">Used Terms ({used.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {used.map(term => (
                <span key={term} className="px-2 py-1 bg-success/20 text-success text-xs rounded-md">
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <XMarkIcon className="w-4 h-4 text-danger" />
              <span className="text-sm font-medium text-danger">Missing Terms ({missing.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {missing.map(term => (
                <span key={term} className="px-2 py-1 bg-danger/20 text-danger text-xs rounded-md">
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}

        {unused.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <InformationCircleIcon className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-secondary">Unused Terms ({unused.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unused.map(term => (
                <span key={term} className="px-2 py-1 bg-text-secondary/20 text-text-secondary text-xs rounded-md">
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {missingCount > 0 && (
        <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-md">
          <div className="flex items-center space-x-2">
            <XMarkIcon className="w-4 h-4 text-danger" />
            <span className="text-sm font-medium text-danger">Warning</span>
          </div>
          <p className="text-sm text-danger mt-1">
            {missingCount} terms were found in the source text but are missing from the translation. 
            Please review the translation to ensure all glossary terms are properly applied.
          </p>
        </div>
      )}
    </div>
  );
};

export default GlossaryUsageReport;
