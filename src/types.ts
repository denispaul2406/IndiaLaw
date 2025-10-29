
export type DocumentStatus = 'Uploaded' | 'Processing' | 'Analyzed' | 'Error';

export interface Document {
  id: string;
  name: string;
  uploadedAt: string;
  status: DocumentStatus;
  size: number; // in bytes
  analysisId?: string;
  content: string; 
  analysis?: Analysis;
  // Fix: Add an optional field to hold error messages.
  errorMessage?: string;
}

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Risk {
  id: string;
  level: RiskLevel;
  category: string;
  description: string;
  citation: string;
  recommendation: string;
}

export interface CategoryScore {
  category: 'GST' | 'Labor' | 'Contract Validity' | 'Data Protection';
  score: number;
  weight?: number; // Weight is used for calculation, but not required in the final object
}

export interface Analysis {
  id: string;
  documentId: string;
  indiaLawScore: number;
  riskSummary: {
    high: number;
    medium: number;
    low: number;
  };
  categoryScores: CategoryScore[];
  risks: Risk[];
  processingTime: number; // in seconds
  createdAt: string;
  translations?: Record<string, { summary: string; risks: Risk[] }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language?: string;
  citations?: { title: string; uri: string }[];
  timestamp: string;
}
