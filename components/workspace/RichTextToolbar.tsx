import React, { useState, useRef, useEffect } from 'react';

import BoldIcon from '../icons/BoldIcon';
import ItalicIcon from '../icons/ItalicIcon';
import LinkIcon from '../icons/LinkIcon';
import PhotoIcon from '../icons/PhotoIcon';
import Bars3BottomLeftIcon from '../icons/Bars3BottomLeftIcon';
import Bars3CenterIcon from '../icons/Bars3CenterIcon';
import Bars3BottomRightIcon from '../icons/Bars3BottomRightIcon';
import CodeBracketIcon from '../icons/CodeBracketIcon';
import ChevronDownIcon from '../icons/ChevronDownIcon';


interface RichTextToolbarProps {
  onCommand: (command: string, value?: string) => void;
  activeCommands: Set<string>;
}

const PARAGRAPH_OPTIONS = [
    { label: 'Paragraph', value: 'p' },
    { label: 'Heading 1', value: 'h1' },
    { label: 'Heading 2', value: 'h2' },
    { label: 'Heading 3', value: 'h3' },
];

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ onCommand, activeCommands }) => {
    const [isParaDropdownOpen, setIsParaDropdownOpen] = useState(false);
    const paraDropdownRef = useRef<HTMLDivElement>(null);

    const handleFormatBlock = (value: string) => {
        onCommand('formatBlock', value);
        setIsParaDropdownOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (paraDropdownRef.current && !paraDropdownRef.current.contains(event.target as Node)) {
                setIsParaDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLink = () => {
        const url = prompt('Enter the URL:', 'https://');
        if (url) {
            onCommand('createLink', url);
        }
    };
    
    const handleMedia = () => {
        const url = prompt('Enter the Image URL:');
        if (url) {
            onCommand('insertImage', url);
        }
    };

    const currentBlock = PARAGRAPH_OPTIONS.find(opt => activeCommands.has(opt.value)) || PARAGRAPH_OPTIONS[0];

    return (
        <div className="flex items-center space-x-1 bg-dark-input p-1 rounded-md border-b border-border-color">
             <div className="relative" ref={paraDropdownRef}>
                <button onClick={() => setIsParaDropdownOpen(p => !p)} className="flex items-center space-x-2 p-2 rounded-md hover:bg-dark-hover text-sm">
                    <span>{currentBlock.label}</span>
                    <ChevronDownIcon className="w-4 h-4" />
                </button>
                {isParaDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-dark-panel rounded-md shadow-lg z-10 border border-border-color">
                        {PARAGRAPH_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => handleFormatBlock(opt.value)} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-dark-hover">
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-5 w-px bg-border-color mx-1"></div>

            <button onClick={() => onCommand('bold')} title="Bold" className={`p-2 rounded-md ${activeCommands.has('bold') ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover'}`}>
                <BoldIcon className="w-5 h-5"/>
            </button>
            <button onClick={() => onCommand('italic')} title="Italic" className={`p-2 rounded-md ${activeCommands.has('italic') ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover'}`}>
                <ItalicIcon className="w-5 h-5"/>
            </button>
             <button onClick={handleLink} title="Insert/Edit Link" className={`p-2 rounded-md ${activeCommands.has('createLink') ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover'}`}>
                <LinkIcon className="w-5 h-5"/>
            </button>
            <button onClick={handleMedia} title="Add Media" className="p-2 rounded-md hover:bg-dark-hover">
                <PhotoIcon className="w-5 h-5"/>
            </button>

            <div className="h-5 w-px bg-border-color mx-1"></div>
            
            <button onClick={() => onCommand('justifyLeft')} title="Align Left" className={`p-2 rounded-md ${activeCommands.has('justifyLeft') ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover'}`}>
                <Bars3BottomLeftIcon className="w-5 h-5"/>
            </button>
            <button onClick={() => onCommand('justifyCenter')} title="Align Center" className={`p-2 rounded-md ${activeCommands.has('justifyCenter') ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover'}`}>
                <Bars3CenterIcon className="w-5 h-5"/>
            </button>
            <button onClick={() => onCommand('justifyRight')} title="Align Right" className={`p-2 rounded-md ${activeCommands.has('justifyRight') ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover'}`}>
                <Bars3BottomRightIcon className="w-5 h-5"/>
            </button>
            <button onClick={() => onCommand('formatBlock', 'blockquote')} title="Blockquote" className={`p-2 rounded-md ${activeCommands.has('blockquote') ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover'}`}>
                <CodeBracketIcon className="w-5 h-5"/>
            </button>
        </div>
    );
};

export default RichTextToolbar;