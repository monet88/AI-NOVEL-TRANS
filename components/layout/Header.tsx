
import React, { useState, useEffect } from 'react';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import Bars3Icon from '../icons/Bars3Icon';
import { useProjectContext } from '../../contexts';

const Header: React.FC = () => {
  const { saveStatus, setIsSidebarOpen } = useProjectContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (saveStatus === 'saving') {
      setIsVisible(true);
      return;
    }

    if (saveStatus === 'saved') {
      // Keep "saved" message visible for a moment before fading out
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);
  
  const renderStatus = () => {
    if (!isVisible) return null;

    if (saveStatus === 'saving') {
      return (
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <svg className="animate-spin h-4 w-4 text-text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Saving...</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 text-sm text-text-secondary">
        <CheckCircleIcon className="w-4 h-4 text-success" />
        <span>All changes saved</span>
      </div>
    );
  };

  return (
    <header className="relative bg-dark-sidebar border-b border-border-color p-4 flex justify-between items-center shadow-md">
      <div className="flex items-center">
        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mr-3 p-1 text-text-primary transition-transform hover:scale-110">
          <Bars3Icon className="w-6 h-6"/>
        </button>
        <h1 className="text-xl font-bold text-text-primary">AI Novel Weaver</h1>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300">
        {renderStatus()}
      </div>

    </header>
  );
};

export default Header;