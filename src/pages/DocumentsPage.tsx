
import React, { useState, useRef } from 'react';
import { Document, DocumentStatus } from '../types';
import { api } from '../services/api-production';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

interface DocumentsPageProps {
  documents: Document[];
  onNavigate: (view: 'analysis' | 'chat', doc: Document) => void;
  onNewDocument: (doc: Document) => void;
  onDocumentUpdate: (doc: Document) => void;
  isLoading: boolean;
  onRefresh?: () => void;
}

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  const styles = {
    Analyzed: 'bg-green-100 text-green-800',
    Processing: 'bg-blue-100 text-blue-800 animate-pulse',
    Uploaded: 'bg-gray-100 text-gray-800',
    Error: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0111.293 2.707l4 4A1 1 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;

const DocumentsPage: React.FC<DocumentsPageProps> = ({ documents, onNavigate, onNewDocument, onDocumentUpdate, isLoading, onRefresh }) => {
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        alert('File size exceeds 15MB limit');
        return;
      }
      setUploadingFile(file);
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const newDoc = await api.uploadDocument(file, (progress) => {
        setUploadProgress(progress);
      });
      onNewDocument(newDoc);
      // Poll for status updates
      pollDocumentStatus(newDoc.id);
    } catch (error) {
      console.error("Upload failed:", error);
      const errorDoc = {
        id: `doc-err-${Date.now()}`,
        name: file.name,
        uploadedAt: new Date().toISOString(),
        status: 'Error' as DocumentStatus,
        size: file.size,
        content: '',
        errorMessage: error instanceof Error ? error.message : 'A critical error occurred during upload.'
      };
      onNewDocument(errorDoc);
    } finally {
      setIsUploading(false);
      setUploadingFile(null);
      setUploadProgress(0);
    }
  };

  const pollDocumentStatus = async (documentId: string) => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const doc = await api.getDocument(documentId);
        const updatedDoc = { ...doc, analysis: doc.analysis } as Document;
        onDocumentUpdate(updatedDoc);

        if (doc.status === 'completed' || doc.status === 'Error') {
          clearInterval(interval);
          if (onRefresh) onRefresh();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error polling document status:', error);
        if (attempts >= maxAttempts) clearInterval(interval);
      }
    }, 10000); // Poll every 10 seconds
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
        <Button onClick={triggerFileSelect} disabled={isUploading}>
          {isUploading ? <Spinner /> : <UploadIcon />}
          {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload & Analyze'}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.txt,.md"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Uploaded</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-10"><Spinner /> Loading documents...</td></tr>
              ) : documents.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">No documents found. Upload one to get started.</td></tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileIcon />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                        </div>
                      </div>
                    </td>
                    {/* Fix: Add a title attribute to the status badge to show the error message on hover. */}
                    <td className="px-6 py-4 whitespace-nowrap" title={doc.errorMessage}>
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(doc.size / 1024).toFixed(2)} KB</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onNavigate('analysis', doc)}
                        disabled={doc.status !== 'Analyzed'}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        View Analysis
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;

export default DocumentsPage;
