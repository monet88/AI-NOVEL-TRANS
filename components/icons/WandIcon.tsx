import React from 'react';

const WandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-2.226-1.311l-4.224.938a.5.5 0 0 0-.226.634l1.248 4.224a.5.5 0 0 0 .634.226l4.224-.938a3 3 0 0 0 1.31-2.226Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.657-5.657m0 0a3 3 0 1 0-4.243-4.243 3 3 0 0 0 4.243 4.243Z" />
  </svg>
);

export default WandIcon;
