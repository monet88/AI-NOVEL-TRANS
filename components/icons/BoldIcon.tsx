import React from 'react';

const BoldIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h4.5a3.75 3.75 0 0 1 0 7.5h-4.5a3.75 3.75 0 0 1 0-7.5ZM8.25 14.25h5.25a3.75 3.75 0 0 1 0 7.5H8.25V6.75Z" />
  </svg>
);

export default BoldIcon;
