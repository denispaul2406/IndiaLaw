
import React from 'react';
import { Document } from '../../types';

type View = 'documents' | 'analysis' | 'chat';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View, doc?: Document) => void;
  selectedDocument: Document | null;
}

const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NavItem: React.FC<{ icon: JSX.Element; label: string; isActive: boolean; onClick: () => void; disabled?: boolean }> = ({ icon, label, isActive, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 ${
      isActive
        ? 'bg-blue-700 text-white'
        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    aria-current={isActive ? 'page' : undefined}
  >
    {icon}
    <span className="ml-3">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, selectedDocument }) => {
  const isDocSelected = !!selectedDocument;
  const isDocAnalyzed = selectedDocument?.status === 'Analyzed';
  // Fix: Allow navigation to analysis page if status is 'Analyzed' OR 'Error'.
  const canViewAnalysis = isDocSelected && (selectedDocument.status === 'Analyzed' || selectedDocument.status === 'Error');

  return (
    <div className="flex flex-col w-64 bg-blue-900 text-white">
      <div className="flex items-center justify-center h-16 border-b border-blue-800 flex-shrink-0 px-4">
        <Logo />
        <h1 className="text-xl font-semibold ml-2">IndiaLawAI</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        <NavItem
          icon={<DocIcon />}
          label="All Documents"
          isActive={currentView === 'documents'}
          onClick={() => onNavigate('documents')}
        />
        <div className="px-4 pt-4 pb-2">
            <span className="text-xs font-semibold text-blue-300 uppercase">
                {selectedDocument ? selectedDocument.name.length > 20 ? `${selectedDocument.name.substring(0,18)}...` : selectedDocument.name : 'No Document Selected'}
            </span>
        </div>
        <NavItem
          icon={<AnalysisIcon />}
          label="Analysis Dashboard"
          isActive={currentView === 'analysis'}
          onClick={() => onNavigate('analysis', selectedDocument!)}
          disabled={!canViewAnalysis}
        />
        <NavItem
          icon={<ChatIcon />}
          label="Grounded Q&A"
          isActive={currentView === 'chat'}
          onClick={() => onNavigate('chat', selectedDocument!)}
          disabled={!isDocAnalyzed}
        />
      </nav>
      <div className="px-4 py-4 border-t border-blue-800">
        <div className="p-4 bg-blue-800 rounded-lg text-center">
            <h3 className="font-semibold text-white">Need Help?</h3>
            <p className="text-sm text-blue-200 mt-1">Check our support docs or contact us.</p>
            <button className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md text-sm">
                Support
            </button>
        </div>
      </div>
    </div>
  );
};

const DocIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const AnalysisIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;

export default Sidebar;
