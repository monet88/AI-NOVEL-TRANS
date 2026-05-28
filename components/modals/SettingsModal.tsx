
import React, { useState, useEffect, useRef } from 'react';
import type { TranslationSettings } from '../../types';
import { MatchType } from '../../types';
import { testOpenAIConnection, testDeepSeekConnection, testGeminiConnection } from '../../services/aiService';
import XMarkIcon from '../icons/XMarkIcon';
import InformationCircleIcon from '../icons/InformationCircleIcon';
import BrainIcon from '../icons/BrainIcon';
import PencilIcon from '../icons/PencilIcon';
import BeakerIcon from '../icons/BeakerIcon';
import DocumentTextIcon from '../icons/DocumentTextIcon';
import EyeIcon from '../icons/EyeIcon';
import EyeSlashIcon from '../icons/EyeSlashIcon';
import StarIcon from '../icons/StarIcon';
import ChevronDownIcon from '../icons/ChevronDownIcon';
import { useGlossaryContext } from '../../contexts';
// Fix typo: WUXIA_EXTRA_INSTRUCTIONS -> WUXIA_EXTRACTION_INSTRUCTIONS
import { WUXIA_CUSTOM_INSTRUCTIONS, WUXIA_EXTRACTION_INSTRUCTIONS, XIANXIA_CUSTOM_INSTRUCTIONS, XIANXIA_EXTRACTION_INSTRUCTIONS, MODERN_URBAN_CUSTOM_INSTRUCTIONS, MODERN_URBAN_EXTRACTION_INSTRUCTIONS, FANTASY_CUSTOM_INSTRUCTIONS, FANTASY_EXTRACTION_INSTRUCTIONS } from '../../constants';


interface SettingsModalProps {
  onClose: () => void;
}

const AI_STYLES = [
    { id: 'wuxia', name: 'Wuxia / Martial Arts' },
    { id: 'xianxia', name: 'Xianxia / Fantasy Immortal' },
    { id: 'modern_urban', name: 'Modern Urban / Đô Thị' },
    { id: 'fantasy', name: 'Fantasy / Magic World' },
    { id: 'custom', name: 'Custom' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const { settings, handleSettingsChange } = useGlossaryContext();
    const [openAITestStatus, setOpenAITestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [openAITestMessage, setOpenAITestMessage] = useState('');
    const [deepSeekTestStatus, setDeepSeekTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [deepSeekTestMessage, setDeepSeekTestMessage] = useState('');
    const [geminiTestStatus, setGeminiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [geminiTestMessage, setGeminiTestMessage] = useState('');
    const [isOAKeyVisible, setIsOAKeyVisible] = useState(false);
    const [isDSKeyVisible, setIsDSKeyVisible] = useState(false);
    const [isGeminiKeyVisible, setIsGeminiKeyVisible] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState('custom');
    const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
    const styleDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            onClose();
          }
        };
    
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (settings.glossaryExtractionInstructions === WUXIA_EXTRACTION_INSTRUCTIONS && settings.customInstructions === WUXIA_CUSTOM_INSTRUCTIONS) {
            setSelectedStyle('wuxia');
        } else if (settings.glossaryExtractionInstructions === XIANXIA_EXTRACTION_INSTRUCTIONS && settings.customInstructions === XIANXIA_CUSTOM_INSTRUCTIONS) {
            setSelectedStyle('xianxia');
        } else if (settings.glossaryExtractionInstructions === MODERN_URBAN_EXTRACTION_INSTRUCTIONS && settings.customInstructions === MODERN_URBAN_CUSTOM_INSTRUCTIONS) {
            setSelectedStyle('modern_urban');
        } else if (settings.glossaryExtractionInstructions === FANTASY_EXTRACTION_INSTRUCTIONS && settings.customInstructions === FANTASY_CUSTOM_INSTRUCTIONS) {
            setSelectedStyle('fantasy');
        } else {
            setSelectedStyle('custom');
        }
    }, [settings.glossaryExtractionInstructions, settings.customInstructions]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
                setIsStyleDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleStyleChange = (style: string) => {
        setSelectedStyle(style);
        if (style === 'wuxia') {
            handleSettingsChange(prev => ({
                ...prev,
                glossaryExtractionInstructions: WUXIA_EXTRACTION_INSTRUCTIONS,
                customInstructions: WUXIA_CUSTOM_INSTRUCTIONS,
            }));
        } else if (style === 'xianxia') {
            handleSettingsChange(prev => ({
                ...prev,
                glossaryExtractionInstructions: XIANXIA_EXTRACTION_INSTRUCTIONS,
                customInstructions: XIANXIA_CUSTOM_INSTRUCTIONS,
            }));
        } else if (style === 'modern_urban') {
            handleSettingsChange(prev => ({
                ...prev,
                glossaryExtractionInstructions: MODERN_URBAN_EXTRACTION_INSTRUCTIONS,
                customInstructions: MODERN_URBAN_CUSTOM_INSTRUCTIONS,
            }));
        } else if (style === 'fantasy') {
            handleSettingsChange(prev => ({
                ...prev,
                glossaryExtractionInstructions: FANTASY_EXTRACTION_INSTRUCTIONS,
                customInstructions: FANTASY_CUSTOM_INSTRUCTIONS,
            }));
        } else if (style === 'custom') {
            handleSettingsChange(prev => ({
                ...prev,
                glossaryExtractionInstructions: '',
                customInstructions: '',
            }));
        }
    };

    const handleTestGeminiConnection = async () => {
        setGeminiTestStatus('testing');
        setGeminiTestMessage('');
        const result = await testGeminiConnection(settings);
        setGeminiTestStatus(result.success ? 'success' : 'error');
        setGeminiTestMessage(result.message);
    };

    const handleTestOpenAIConnection = async () => {
        setOpenAITestStatus('testing');
        setOpenAITestMessage('');
        const result = await testOpenAIConnection(settings);
        setOpenAITestStatus(result.success ? 'success' : 'error');
        setOpenAITestMessage(result.message);
    };

    const handleTestDeepSeekConnection = async () => {
        setDeepSeekTestStatus('testing');
        setDeepSeekTestMessage('');
        const result = await testDeepSeekConnection(settings);
        setDeepSeekTestStatus(result.success ? 'success' : 'error');
        setDeepSeekTestMessage(result.message);
    };
    
    const handleToggle = (key: keyof TranslationSettings) => {
        handleSettingsChange(prev => ({...prev, [key]: !prev[key] }));
    };

    const selectedStyleName = AI_STYLES.find(s => s.id === selectedStyle)?.name || 'Custom';

    return (
        <div className="fixed inset-0 bg-dark-bg z-40 flex flex-col animate-fade-in">
            <header className="p-4 border-b border-border-color flex justify-between items-center flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <BrainIcon />
                    <h2 className="text-lg font-bold">AI Settings</h2>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-hover">
                    <XMarkIcon className="w-6 h-6 text-text-secondary"/>
                </button>
            </header>

            <div className="flex-grow overflow-y-auto p-4 sm:p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* AI Provider */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2 flex items-center space-x-1.5">
                            <BrainIcon />
                            <span>AI Provider</span>
                        </label>
                        <div className="bg-dark-input p-1 rounded-md flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
                                <button
                                    onClick={() => handleSettingsChange(prev => ({ ...prev, aiProvider: 'gemini' }))}
                                    className={`flex-1 py-1.5 px-3 text-sm font-semibold rounded-md transition-colors ${settings.aiProvider === 'gemini' ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-dark-hover'}`}
                                >
                                    Google Gemini
                                </button>
                                <button
                                    onClick={() => handleSettingsChange(prev => ({ ...prev, aiProvider: 'openai' }))}
                                    className={`flex-1 py-1.5 px-3 text-sm font-semibold rounded-md transition-colors ${settings.aiProvider === 'openai' ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-dark-hover'}`}
                                >
                                    OpenAI
                                </button>
                                <button
                                    onClick={() => handleSettingsChange(prev => ({ ...prev, aiProvider: 'deepseek' }))}
                                    className={`flex-1 py-1.5 px-3 text-sm font-semibold rounded-md transition-colors ${settings.aiProvider === 'deepseek' ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-dark-hover'}`}
                                >
                                    DeepSeek
                                </button>
                        </div>
                        {settings.aiProvider === 'gemini' && (
                            <div className="mt-4 space-y-3 animate-fade-in">
                                <div>
                                    <label htmlFor="gemini-api-key" className="block text-sm font-medium text-text-primary mb-2">
                                        Gemini API Key (Optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="gemini-api-key"
                                            type={isGeminiKeyVisible ? 'text' : 'password'}
                                            value={settings.geminiApiKey}
                                            onChange={(e) => {
                                                handleSettingsChange(prev => ({ ...prev, geminiApiKey: e.target.value }));
                                                setGeminiTestStatus('idle');
                                            }}
                                            placeholder="Overrides default key if provided"
                                            className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary text-sm"
                                        />
                                        <button type="button" onClick={() => setIsGeminiKeyVisible(p => !p)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            {isGeminiKeyVisible ? <EyeSlashIcon className="h-5 w-5 text-text-secondary" /> : <EyeIcon className="h-5 w-5 text-text-secondary" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-text-secondary mt-2 px-1">
                                        If you leave this empty, the application will use the pre-configured API key.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-4 pt-1">
                                    <button 
                                        onClick={handleTestGeminiConnection} 
                                        disabled={geminiTestStatus === 'testing' || !settings.geminiApiKey}
                                        className="px-4 py-1.5 rounded-md text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {geminiTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                                    </button>
                                     {geminiTestStatus !== 'idle' && geminiTestStatus !== 'testing' && geminiTestMessage && (
                                        <p className={`text-sm animate-fade-in ${geminiTestStatus === 'success' ? 'text-success' : 'text-danger'}`}>
                                            {geminiTestMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        {settings.aiProvider === 'openai' && (
                            <div className="mt-4 space-y-3 animate-fade-in">
                                <div>
                                    <label htmlFor="openai-api-key" className="block text-sm font-medium text-text-primary mb-2">
                                        OpenAI API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="openai-api-key"
                                            type={isOAKeyVisible ? 'text' : 'password'}
                                            value={settings.openaiApiKey}
                                            onChange={(e) => {
                                                handleSettingsChange(prev => ({ ...prev, openaiApiKey: e.target.value }));
                                                setOpenAITestStatus('idle');
                                            }}
                                            placeholder="Enter your OpenAI API key (sk-...)"
                                            className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary text-sm"
                                        />
                                        <button type="button" onClick={() => setIsOAKeyVisible(p => !p)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            {isOAKeyVisible ? <EyeSlashIcon className="h-5 w-5 text-text-secondary" /> : <EyeIcon className="h-5 w-5 text-text-secondary" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 pt-1">
                                    <button 
                                        onClick={handleTestOpenAIConnection} 
                                        disabled={openAITestStatus === 'testing' || !settings.openaiApiKey}
                                        className="px-4 py-1.5 rounded-md text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {openAITestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                                    </button>
                                     {openAITestStatus !== 'idle' && openAITestStatus !== 'testing' && openAITestMessage && (
                                        <p className={`text-sm animate-fade-in ${openAITestStatus === 'success' ? 'text-success' : 'text-danger'}`}>
                                            {openAITestMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        {settings.aiProvider === 'deepseek' && (
                            <div className="mt-4 space-y-3 animate-fade-in">
                                <div>
                                    <label htmlFor="deepseek-api-key" className="block text-sm font-medium text-text-primary mb-2">
                                        DeepSeek API Key
                                    </label>
                                     <div className="relative">
                                        <input
                                            id="deepseek-api-key"
                                            type={isDSKeyVisible ? 'text' : 'password'}
                                            value={settings.deepseekApiKey}
                                            onChange={(e) => {
                                                handleSettingsChange(prev => ({ ...prev, deepseekApiKey: e.target.value }));
                                                setDeepSeekTestStatus('idle');
                                            }}
                                            placeholder="Enter your DeepSeek API key"
                                            className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary text-sm"
                                        />
                                        <button type="button" onClick={() => setIsDSKeyVisible(p => !p)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            {isDSKeyVisible ? <EyeSlashIcon className="h-5 w-5 text-text-secondary" /> : <EyeIcon className="h-5 w-5 text-text-secondary" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 pt-1">
                                    <button 
                                        onClick={handleTestDeepSeekConnection} 
                                        disabled={deepSeekTestStatus === 'testing' || !settings.deepseekApiKey}
                                        className="px-4 py-1.5 rounded-md text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {deepSeekTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                                    </button>
                                     {deepSeekTestStatus !== 'idle' && deepSeekTestStatus !== 'testing' && deepSeekTestMessage && (
                                        <p className={`text-sm animate-fade-in ${deepSeekTestStatus === 'success' ? 'text-success' : 'text-danger'}`}>
                                            {deepSeekTestMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                     {/* Predefined AI Styles */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2 flex items-center space-x-1.5">
                            <StarIcon />
                            <span>Predefined AI Styles</span>
                        </label>
                        <div className="relative" ref={styleDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsStyleDropdownOpen(p => !p)}
                                className="w-full bg-dark-input p-2 rounded-md border border-border-color flex items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-accent-primary"
                            >
                                <span className="font-semibold text-text-primary">{selectedStyleName}</span>
                                <ChevronDownIcon className={`w-5 h-5 text-text-secondary transition-transform ${isStyleDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isStyleDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-full bg-dark-panel rounded-md shadow-lg z-10 border border-border-color animate-fade-in">
                                    {AI_STYLES.map(style => (
                                        <button 
                                            key={style.id}
                                            type="button"
                                            onClick={() => { handleStyleChange(style.id); setIsStyleDropdownOpen(false); }} 
                                            className={`block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-dark-hover ${selectedStyle === style.id ? 'font-bold' : ''}`}
                                        >
                                            {style.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-text-secondary mt-2 px-1">
                            Selecting a style will overwrite the rules and instructions below. Select 'Custom' to clear the fields.
                        </p>
                    </div>

                    {/* AI Features */}
                    <div className="space-y-4">
                         <label className="block text-sm font-medium text-text-primary flex items-center space-x-1.5">
                            <BeakerIcon />
                            <span>AI Features</span>
                        </label>
                         <div className="flex items-center justify-between bg-dark-input p-3 rounded-lg">
                            <div>
                                <h4 className="font-semibold text-text-primary">Glossary AI</h4>
                                <p className="text-xs text-text-secondary">Automatically detect and suggest key terms to add to your glossary.</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button onClick={() => handleToggle('useGlossaryAI')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.useGlossaryAI ? 'bg-accent-primary' : 'bg-gray-600'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.useGlossaryAI ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                         <div className="bg-dark-input p-3 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-text-primary">Default Match Type</h4>
                                    <p className="text-xs text-text-secondary">Default behavior for matching and applying new glossary terms.</p>
                                </div>
                                <select 
                                    value={settings.defaultMatchType}
                                    onChange={(e) => handleSettingsChange(prev => ({...prev, defaultMatchType: e.target.value as MatchType}))}
                                    className="bg-dark-bg p-2 rounded-md border border-border-color text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary"
                                >
                                    <option value={MatchType.CaseInsensitive}>Case-Insensitive</option>
                                    <option value={MatchType.Exact}>Exact</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Glossary Extraction Rules */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2 flex items-center space-x-1.5">
                            <DocumentTextIcon />
                            <span>Glossary Extraction Rules</span>
                             <div className="group relative">
                               <InformationCircleIcon className="cursor-pointer" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-dark-hover p-2 text-xs rounded-md text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Define specific rules for how the AI should identify and suggest glossary terms. This does not affect the final translation.
                                </div>
                            </div>
                        </label>
                        <div className="space-y-3 bg-dark-input p-3 rounded-lg">
                            <div>
                                <label htmlFor="glossary-instructions" className="block text-xs font-medium text-text-secondary mb-1">
                                    Extraction Instructions
                                </label>
                                <textarea
                                    id="glossary-instructions"
                                    rows={3}
                                    value={settings.glossaryExtractionInstructions}
                                    onChange={e => {
                                        handleSettingsChange(prev => ({ ...prev, glossaryExtractionInstructions: e.target.value }));
                                        setSelectedStyle('custom');
                                    }}
                                    placeholder="e.g., Extract all character names and locations. Suggest translations in a formal style."
                                    className="w-full bg-dark-bg p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="exclusion-list" className="block text-xs font-medium text-text-secondary mb-1">
                                    Exclusion List (comma-separated)
                                </label>
                                <textarea
                                    id="exclusion-list"
                                    rows={2}
                                    value={settings.exclusionList}
                                    onChange={e => handleSettingsChange(prev => ({ ...prev, exclusionList: e.target.value }))}
                                    placeholder="e.g., the, a, common word, another common word"
                                    className="w-full bg-dark-bg p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Custom Instructions */}
                    <div>
                         <label htmlFor="custom-instructions" className="block text-sm font-medium text-text-primary mb-2 flex items-center space-x-1.5">
                            <PencilIcon />
                            <span>Custom Instructions</span>
                            <div className="group relative">
                               <InformationCircleIcon className="cursor-pointer" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-dark-hover p-2 text-xs rounded-md text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Provide specific instructions to the AI to guide the tone, style, and terminology of the translation.
                                </div>
                            </div>
                        </label>
                        <textarea
                            id="custom-instructions"
                            rows={4}
                            value={settings.customInstructions}
                            onChange={(e) => {
                                handleSettingsChange(prev => ({ ...prev, customInstructions: e.target.value }));
                                setSelectedStyle('custom');
                            }}
                            placeholder="e.g., Use a formal tone for dialogue. Translate character names literally."
                            className="w-full bg-dark-input p-2 rounded-lg border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary text-sm"
                        />
                    </div>
                </div>
            </div>

            <footer className="p-4 border-t border-border-color flex justify-end items-center flex-shrink-0 bg-dark-sidebar">
                <button
                    onClick={onClose}
                    className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-5 rounded-lg transition-colors duration-200"
                >
                    Save & Close
                </button>
            </footer>
        </div>
    );
};

export default SettingsModal;
