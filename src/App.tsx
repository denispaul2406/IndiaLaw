
import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import DocumentsPage from './pages/DocumentsPage';
import AnalysisPage from './pages/AnalysisPage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import { Document } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { api } from './services/api-production';
import Spinner from './components/ui/Spinner';

type View = 'documents' | 'analysis' | 'chat';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('documents');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (view: View, doc?: Document) => {
    setCurrentView(view);
    if (doc) {
      setSelectedDocument(doc);
    } else if (view === 'documents') {
      setSelectedDocument(null);
    }
  };
  
  const handleDocumentUpdate = (updatedDoc: Document) => {
    setDocuments(docs => docs.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    if (selectedDocument?.id === updatedDoc.id) {
      setSelectedDocument(updatedDoc);
    }
  };

  const handleNewDocument = async (newDoc: Document) => {
    setDocuments(docs => [newDoc, ...docs]);
    // Reload to get updated status
    setTimeout(() => loadDocuments(), 2000);
  };

  const handleDocumentUpdate = async (updatedDoc: Document) => {
    setDocuments(docs => docs.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    if (selectedDocument?.id === updatedDoc.id) {
      const freshDoc = await api.getDocument(updatedDoc.id);
      setSelectedDocument({ ...freshDoc, analysis: updatedDoc.analysis });
    }
  };

  const renderContent = () => {
    const documentsPage = (
      <DocumentsPage
        documents={documents}
        onNavigate={handleNavigate}
        onNewDocument={handleNewDocument}
        onDocumentUpdate={handleDocumentUpdate}
        isLoading={isLoading}
        onRefresh={loadDocuments}
      />
    );

    switch (currentView) {
      case 'analysis':
        return selectedDocument ? <AnalysisPage document={selectedDocument} onNavigate={handleNavigate} /> : documentsPage;
      case 'chat':
        return selectedDocument ? <ChatPage document={selectedDocument} /> : documentsPage;
      case 'documents':
      default:
        return documentsPage;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} selectedDocument={selectedDocument} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
