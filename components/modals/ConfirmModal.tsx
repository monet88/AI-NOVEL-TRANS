
import React from 'react';
import TrashIcon from '../icons/TrashIcon';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, 
    title, 
    message, 
    confirmLabel, 
    confirmVariant = 'danger',
    onConfirm, 
    onCancel 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-panel rounded-lg shadow-xl w-full max-w-md border border-border-color overflow-hidden animate-fade-in-up">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                        {confirmVariant === 'danger' && <TrashIcon className="w-6 h-6 text-danger" />}
                        {title}
                    </h2>
                    <p className="text-text-secondary mb-6 leading-relaxed">
                        {message}
                    </p>
                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-md font-medium text-sm text-text-secondary bg-dark-sidebar hover:bg-dark-hover hover:text-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-4 py-2 rounded-md font-medium text-sm text-white transition-colors ${
                                confirmVariant === 'danger' ? 'bg-danger hover:bg-red-600' : 'bg-accent-primary hover:bg-accent-primary-hover'
                            }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
