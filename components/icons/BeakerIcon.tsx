
import React from 'react';

const BeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5v.75c0 .621-.504 1.125-1.125 1.125h-9.75c-.621 0-1.125-.504-1.125-1.125v-.75m14.25-9.396c.251.023.501.05.75.082M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25v-6.75c0-1.02-.622-1.908-1.5-2.318l-6.75-3.104a2.25 2.25 0 0 0-1.5 0L4.5 10.182c-.878.41-1.5 1.298-1.5 2.318v6.75A2.25 2.25 0 0 0 4.5 19.5Z" />
  </svg>
);

export default BeakerIcon;