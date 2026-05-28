import React from 'react';

const ItalicIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l-4.5 15m4.5-15h6m-6 15h6" />
  </svg>
);

export default ItalicIcon;
