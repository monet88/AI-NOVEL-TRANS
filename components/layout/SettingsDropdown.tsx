import React from 'react';
import SettingsModal from '../modals/SettingsModal';
import { useUIContext } from '../../contexts';

const SettingsDropdown: React.FC = () => {
    const { isSettingsModalOpen, setIsSettingsModalOpen } = useUIContext();

    return (
        <>
            <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-3 py-1.5 rounded text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary"
                title="AI Settings"
            >
                <span>AI Setting</span>
            </button>
            
            {isSettingsModalOpen && (
                <SettingsModal
                    onClose={() => setIsSettingsModalOpen(false)}
                />
            )}
        </>
    );
};

export default SettingsDropdown;
