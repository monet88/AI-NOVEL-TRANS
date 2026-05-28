import React, { ReactNode } from 'react';
import { ProjectProvider } from './ProjectContext';
import { GlossaryProvider } from './GlossaryContext';
import { UIProvider } from './UIContext';
export { ProjectProvider, useProjectContext } from './ProjectContext';
export { GlossaryProvider, useGlossaryContext } from './GlossaryContext';
export { UIProvider, useUIContext } from './UIContext';

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ProjectProvider>
      <GlossaryProvider>
        <UIProvider>
          {children}
        </UIProvider>
      </GlossaryProvider>
    </ProjectProvider>
  );
};
