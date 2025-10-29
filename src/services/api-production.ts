import { Document, Analysis, ChatMessage, DocumentStatus } from '../types';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Get auth token for API requests
const getAuthToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
};

// API request helper
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response;
};

export const api = {
  // Get all documents for current user
  getDocuments: async (): Promise<Document[]> => {
    const response = await apiRequest('/api/documents');
    const data = await response.json();
    return data.documents || [];
  },

  // Get single document
  getDocument: async (documentId: string): Promise<Document> => {
    const response = await apiRequest(`/api/documents/${documentId}`);
    return await response.json();
  },

  // Upload document
  uploadDocument: async (file: File, onProgress?: (progress: number) => void): Promise<Document> => {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve({
            id: data.documentId,
            name: file.name,
            uploadedAt: new Date().toISOString(),
            status: 'Processing',
            size: file.size,
            content: '',
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));

      xhr.open('POST', `${API_URL}/api/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },

  // Get analysis
  getAnalysis: async (documentId: string): Promise<Analysis | null> => {
    try {
      const response = await apiRequest(`/api/analysis/${documentId}`);
      return await response.json();
    } catch (error: any) {
      if (error.message.includes('404')) return null;
      throw error;
    }
  },

  // Trigger analysis
  triggerAnalysis: async (documentId: string): Promise<void> => {
    await apiRequest(`/api/analysis/${documentId}/analyze`, { method: 'POST' });
  },

  // Get Q&A session
  getQASession: async (documentId: string): Promise<any> => {
    const response = await apiRequest(`/api/qa/session/${documentId}`);
    return await response.json();
  },

  // Ask question (streaming)
  askQuestion: async function* (
    documentId: string,
    question: string,
    sessionId?: string
  ): AsyncGenerator<string, void, unknown> {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/api/qa/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ documentId, question, sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Q&A request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content' && data.chunk) {
              yield data.chunk;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  },

  // Get PDF report
  getReport: async (analysisId: string): Promise<string> => {
    const response = await apiRequest(`/api/report/${analysisId}/pdf`);
    const data = await response.json();
    return data.reportUrl;
  },

  // Delete document
  deleteDocument: async (documentId: string): Promise<void> => {
    await apiRequest(`/api/documents/${documentId}`, { method: 'DELETE' });
  },
};

