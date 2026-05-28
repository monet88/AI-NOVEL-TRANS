import React, { createContext, useContext, ReactNode } from 'react';
import { useProjects } from '../hooks/useProjects';

const ProjectContext = createContext<ReturnType<typeof useProjects> | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const projectsData = useProjects();

  return <ProjectContext.Provider value={projectsData}>{children}</ProjectContext.Provider>;
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjectContext must be used within ProjectProvider');
  return context;
};
