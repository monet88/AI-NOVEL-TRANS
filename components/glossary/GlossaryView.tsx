
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { GlossaryTerm, Gender } from '../../types';
import { MatchType } from '../../types';
import TrashIcon from '../icons/TrashIcon';
import MagnifyingGlassIcon from '../icons/MagnifyingGlassIcon';
import ArrowUpTrayIcon from '../icons/ArrowUpTrayIcon';
import ArrowDownTrayIcon from '../icons/ArrowDownTrayIcon';
import PlusIcon from '../icons/PlusIcon';
import SparkleIcon from '../icons/SparkleIcon';
import PencilIcon from '../icons/PencilIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import { useGlossaryContext } from '../../contexts';

interface GlossaryViewProps {
  onClose: () => void;
}

const toCsv = (terms: GlossaryTerm[]): string => {
    const headers = ['input', 'translation', 'gender', 'matchType'];
    const headerRow = headers.join(',');
    const rows = terms.map(term => {
        const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
        return [
            escape(term.input),
            escape(term.translation),
            escape(term.gender),
            escape(term.matchType),
        ].join(',');
    });
    return [headerRow, ...rows].join('\n');
};

const fromCsv = (csvText: string): Partial<GlossaryTerm>[] => {
    const lines = csvText.trim().replace(/\r/g, '').split('\n');
    const headerLine = lines.shift();
    if (!headerLine) {
        throw new Error("CSV file is empty or has no header.");
    }

    const headers = headerLine.split(',').map(h => h.trim());
    const requiredHeaders = ['input', 'translation'];
    if (!requiredHeaders.every(h => headers.includes(h))) {
        throw new Error("CSV must contain 'input' and 'translation' headers.");
    }

    return lines.map(line => {
        const values = line.split(',');
        const term: { [key: string]: string } = {};
        headers.forEach((header, index) => {
            // Trim quotes from values if they exist
            term[header] = values[index]?.trim().replace(/^"|"$/g, '');
        });
        return term as Partial<GlossaryTerm>;
    });
};


const GlossaryView: React.FC<GlossaryViewProps> = ({ onClose }) => {
    const { settings, handleSettingsChange, handleGlossaryBulkUpdate, setEditingTermInGlossaryViewId } = useGlossaryContext();
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newTerm, setNewTerm] = useState<Omit<GlossaryTerm, 'id'>>({
        input: '',
        translation: '',
        gender: 'Không xác định',
        matchType: settings.defaultMatchType,
    });

    useEffect(() => {
        setNewTerm(p => ({...p, matchType: settings.defaultMatchType}));
    }, [settings.defaultMatchType]);

    const [validationError, setValidationError] = useState({ input: false, translation: false });
    
    const [termToUpdate, setTermToUpdate] = useState<{ oldTranslation: string; newTranslation: string; matchType: MatchType } | null>(null);
    const [originalTranslation, setOriginalTranslation] = useState('');

    const [editingTermId, setEditingTermId] = useState<string | null>(null);
    const [savingState, setSavingState] = useState<{ [termId: string]: 'saving' | 'saved' }>({});
    const savingTimeoutsRef = useRef<{ [termId: string]: number }>({});

    useEffect(() => {
        const timeouts = savingTimeoutsRef.current;
        return () => {
            Object.values(timeouts).forEach(clearTimeout);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            onClose();
          }
        };
    
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const filteredGlossary = useMemo(() => {
        if (!searchTerm) return settings.glossary;
        return settings.glossary.filter(term => 
            term.input.toLowerCase().includes(searchTerm.toLowerCase()) ||
            term.translation.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, settings.glossary]);

    const handleGlossaryChange = <K extends keyof GlossaryTerm>(id: string, field: K, value: GlossaryTerm[K]) => {
        handleSettingsChange(prev => ({
            ...prev,
            glossary: prev.glossary.map(term =>
                term.id === id ? { ...term, [field]: value } : term
            ),
        }));

        setSavingState(prev => ({ ...prev, [id]: 'saving' }));
        if (savingTimeoutsRef.current[id]) {
            clearTimeout(savingTimeoutsRef.current[id]);
        }

        savingTimeoutsRef.current[id] = window.setTimeout(() => {
            setSavingState(prev => ({ ...prev, [id]: 'saved' }));
            
            savingTimeoutsRef.current[id] = window.setTimeout(() => {
                setSavingState(prev => {
                    const newState = { ...prev };
                    delete newState[id];
                    return newState;
                });
            }, 2000);
        }, 1200);
    };

    const handleAddTerm = () => {
        const isInputInvalid = !newTerm.input.trim();
        const isTranslationInvalid = !newTerm.translation.trim();

        if (isInputInvalid || isTranslationInvalid) {
            setValidationError({ input: isInputInvalid, translation: isTranslationInvalid });
            return;
        }

        const termToAdd: GlossaryTerm = {
            id: uuidv4(),
            ...newTerm,
            gender: newTerm.gender || 'Không xác định',
            matchType: newTerm.matchType || settings.defaultMatchType,
        };
        handleSettingsChange(prev => ({ ...prev, glossary: [...prev.glossary, termToAdd] }));
        setNewTerm({ input: '', translation: '', gender: 'Không xác định', matchType: settings.defaultMatchType });
        setValidationError({ input: false, translation: false });
    };

    const removeGlossaryTerm = (id: string) => {
        const newGlossary = settings.glossary.filter(term => term.id !== id);
        handleSettingsChange(prev => ({ ...prev, glossary: newGlossary }));
    };

    const handleExportJson = () => {
        if (settings.glossary.length === 0) {
            alert("Glossary is empty. Nothing to export.");
            return;
        }
        const jsonString = JSON.stringify(settings.glossary, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ai-novel-weaver-glossary.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportCsv = () => {
        if (settings.glossary.length === 0) {
            alert("Glossary is empty. Nothing to export.");
            return;
        }
        const csvString = toCsv(settings.glossary);
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ai-novel-weaver-glossary.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("File content is not readable text.");
                }
                
                let parsedData: Partial<GlossaryTerm>[];
                if (file.name.endsWith('.csv')) {
                    parsedData = fromCsv(text);
                } else if (file.name.endsWith('.json')) {
                    parsedData = JSON.parse(text);
                } else {
                     throw new Error("Unsupported file type. Please use .json or .csv");
                }
                
                if (!Array.isArray(parsedData)) {
                    throw new Error("Imported file is not a valid glossary format (must be an array).");
                }

                const currentInputs = new Set(settings.glossary.map(t => t.input.toLowerCase()));
                
                const uniqueNewTerms = parsedData.filter(term =>
                    term.input && typeof term.input === 'string' &&
                    term.translation && typeof term.translation === 'string' &&
                    !currentInputs.has(term.input.toLowerCase())
                ).map((term: any): GlossaryTerm => ({
                    id: uuidv4(),
                    input: term.input,
                    translation: term.translation,
                    gender: ['Male', 'Female', 'Neutral'].includes(term.gender) ? term.gender : 'Không xác định',
                    matchType: [MatchType.Exact, MatchType.CaseInsensitive].includes(term.matchType) ? term.matchType : settings.defaultMatchType,
                }));

                if (uniqueNewTerms.length > 0) {
                    handleSettingsChange(prev => ({ ...prev, glossary: [...prev.glossary, ...uniqueNewTerms] }));
                    alert(`${uniqueNewTerms.length} new terms imported successfully.`);
                } else {
                    alert('No new terms to import. The file might be empty or contain only duplicate entries.');
                }

            } catch (error) {
                console.error("Failed to import glossary:", error);
                alert(`Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                 if(fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-sidebar rounded-xl shadow-2xl w-full h-full md:max-w-5xl md:h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-border-color flex flex-col sm:flex-row justify-between items-center flex-shrink-0 gap-3">
                    <h2 className="text-xl font-bold text-text-primary">Glossary AI</h2>
                     <div className="flex items-center space-x-2 flex-wrap justify-center">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"/>
                            <input 
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-dark-input border border-border-color rounded-md pl-10 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
                            />
                        </div>
                        <div className="flex items-center bg-dark-hover rounded-md">
                            <button onClick={handleExportJson} className="flex items-center space-x-2 px-3 py-1.5 rounded-l-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dark-input">
                                <ArrowDownTrayIcon />
                                <span>Export JSON</span>
                            </button>
                             <div className="w-px h-5 bg-border-color"></div>
                             <button onClick={handleExportCsv} className="flex items-center space-x-2 px-3 py-1.5 rounded-r-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dark-input">
                                <span>Export CSV</span>
                            </button>
                        </div>
                         <button onClick={handleImportClick} className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary">
                            <ArrowUpTrayIcon />
                            <span>Import</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileImport}
                            accept=".json,.csv"
                            className="hidden"
                        />
                    </div>
                </header>
                <div className="flex-grow overflow-y-auto p-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[700px]">
                            <thead className="text-text-secondary sticky top-0 bg-dark-sidebar">
                                <tr>
                                    <th className="p-2 w-1/3">Input</th>
                                    <th className="p-2 w-1/3">Translation</th>
                                    <th className="p-2">Gender</th>
                                    <th className="p-2">Match</th>
                                    <th className="p-2 text-center w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-success/20">
                                    <td><input type="text" placeholder="Enter data..." value={newTerm.input} onChange={e => {
                                        setNewTerm(p => ({...p, input: e.target.value}));
                                        if (validationError.input) setValidationError(p => ({...p, input: false}));
                                    }} className={`w-full bg-dark-input p-2 rounded-md border focus:outline-none focus:ring-1 focus:ring-accent-primary ${validationError.input ? 'border-danger' : 'border-border-color'}`} /></td>
                                    <td><input type="text" placeholder="Enter data..." value={newTerm.translation} onChange={e => {
                                        setNewTerm(p => ({...p, translation: e.target.value}));
                                        if (validationError.translation) setValidationError(p => ({...p, translation: false}));
                                    }} className={`w-full bg-dark-input p-2 rounded-md border focus:outline-none focus:ring-1 focus:ring-accent-primary ${validationError.translation ? 'border-danger' : 'border-border-color'}`} /></td>
                                    <td>
                                        <select value={newTerm.gender} onChange={e => setNewTerm(p => ({...p, gender: e.target.value as Gender}))} className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary">
                                            <option>Không xác định</option><option>Neutral</option><option>Male</option><option>Female</option>
                                        </select>
                                    </td>
                                    <td>
                                        <select value={newTerm.matchType} onChange={e => setNewTerm(p => ({...p, matchType: e.target.value as MatchType}))} className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary">
                                            <option value={MatchType.CaseInsensitive}>{MatchType.CaseInsensitive}</option>
                                            <option value={MatchType.Exact}>{MatchType.Exact}</option>
                                        </select>
                                    </td>
                                    <td className="text-center"><button onClick={handleAddTerm} className="p-2 text-text-secondary hover:text-success"><PlusIcon className="w-5 h-5"/></button></td>
                                </tr>
                                {filteredGlossary.map((term) => (
                                    <tr key={term.id} className={`border-b border-border-color transition-colors duration-300 ${
                                        savingState[term.id] === 'saved' ? 'bg-success/10' :
                                        editingTermId === term.id ? 'bg-accent-primary/10' : 'hover:bg-dark-hover'
                                    }`}>
                                        <td><input type="text" value={term.input} onChange={e => handleGlossaryChange(term.id, 'input', e.target.value)} onFocus={() => { setEditingTermId(term.id); setEditingTermInGlossaryViewId(term.id); }} onBlur={() => { setEditingTermId(null); setEditingTermInGlossaryViewId(null); }} className="w-full bg-transparent p-2 focus:bg-dark-input focus:outline-none focus:ring-1 focus:ring-accent-primary rounded-md" /></td>
                                        <td>
                                            <input
                                                type="text"
                                                value={term.translation}
                                                onChange={e => {
                                                    const newTranslation = e.target.value;
                                                    handleGlossaryChange(term.id, 'translation', newTranslation);
                                                    if (originalTranslation && newTranslation !== originalTranslation) {
                                                        setTermToUpdate({
                                                            oldTranslation: originalTranslation,
                                                            newTranslation: newTranslation,
                                                            matchType: term.matchType,
                                                        });
                                                    } else {
                                                        setTermToUpdate(null);
                                                    }
                                                }}
                                                onFocus={() => { setOriginalTranslation(term.translation); setEditingTermId(term.id); setEditingTermInGlossaryViewId(term.id); }}
                                                onBlur={() => {
                                                    setEditingTermId(null);
                                                    setEditingTermInGlossaryViewId(null);
                                                    if(term.translation !== originalTranslation) {
                                                         setTermToUpdate({
                                                            oldTranslation: originalTranslation,
                                                            newTranslation: term.translation,
                                                            matchType: term.matchType,
                                                        });
                                                    } else {
                                                        setTermToUpdate(null);
                                                    }
                                                    setOriginalTranslation('');
                                                }}
                                                className="w-full bg-transparent p-2 focus:bg-dark-input focus:outline-none focus:ring-1 focus:ring-accent-primary rounded-md"
                                            />
                                        </td>
                                        <td>
                                            <select value={term.gender} onChange={e => handleGlossaryChange(term.id, 'gender', e.target.value as Gender)} onFocus={() => { setEditingTermId(term.id); setEditingTermInGlossaryViewId(term.id); }} onBlur={() => { setEditingTermId(null); setEditingTermInGlossaryViewId(null); }} className="w-full bg-transparent p-2 focus:bg-dark-input focus:outline-none focus:ring-1 focus:ring-accent-primary rounded-md appearance-none text-center">
                                                <option>Không xác định</option><option>Neutral</option><option>Male</option><option>Female</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select value={term.matchType} onChange={e => handleGlossaryChange(term.id, 'matchType', e.target.value as MatchType)} onFocus={() => { setEditingTermId(term.id); setEditingTermInGlossaryViewId(term.id); }} onBlur={() => { setEditingTermId(null); setEditingTermInGlossaryViewId(null); }} className="w-full bg-transparent p-2 focus:bg-dark-input focus:outline-none focus:ring-1 focus:ring-accent-primary rounded-md appearance-none text-center">
                                                <option value={MatchType.CaseInsensitive}>{MatchType.CaseInsensitive}</option>
                                                <option value={MatchType.Exact}>{MatchType.Exact}</option>
                                            </select>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center space-x-2 h-full">
                                                <div className="w-4 h-4 flex items-center justify-center">
                                                    {savingState[term.id] === 'saving' && (
                                                        <div className="animate-spin h-4 w-4 text-text-secondary" role="status" aria-label="saving">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {savingState[term.id] === 'saved' && (
                                                        <CheckCircleIcon className="w-5 h-5 text-success animate-fade-in" role="status" aria-label="saved"/>
                                                    )}
                                                </div>
                                                <button onClick={() => removeGlossaryTerm(term.id)} className="p-2 text-text-secondary hover:text-danger"><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredGlossary.length === 0 && (
                        <div className="text-center py-16 text-text-secondary">
                            No Rows To Show
                        </div>
                    )}
                </div>

                {termToUpdate && (
                     <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-dark-hover p-3 rounded-lg shadow-2xl flex items-center space-x-4 border border-border-color z-10 w-auto max-w-xl animate-fade-in">
                        <p className="text-sm text-text-primary flex-shrink">
                            Update all occurrences of "<span className="font-semibold text-danger">{termToUpdate.oldTranslation}</span>" to "<span className="font-semibold text-success">{termToUpdate.newTranslation}</span>" in the current project?
                        </p>
                        <div className="flex space-x-2 flex-shrink-0">
                            <button 
                                onClick={() => {
                                    handleGlossaryBulkUpdate(termToUpdate.oldTranslation, termToUpdate.newTranslation, termToUpdate.matchType);
                                    setTermToUpdate(null);
                                }} 
                                className="px-4 py-1.5 rounded-md text-sm font-semibold bg-accent-primary text-white hover:bg-accent-primary-hover"
                            >
                                Update All
                            </button>
                            <button onClick={() => setTermToUpdate(null)} className="px-4 py-1.5 rounded-md text-sm font-medium bg-dark-input text-text-primary hover:bg-border-color">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                
                <footer className="p-4 border-t border-border-color flex justify-end items-center flex-shrink-0 bg-dark-sidebar rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-5 rounded-lg transition-colors duration-200"
                    >
                        Save & Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default GlossaryView;
