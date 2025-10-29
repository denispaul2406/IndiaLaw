export interface Document {
  id: string;
  userId: string;
  name: string;
  originalFileName: string;
  size: number;
  uploadedAt: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  storagePath: string;
  documentType?: 'contract' | 'agreement' | 'other';
  language?: string;
  errorMessage?: string;
}

export interface DocumentText {
  documentId: string;
  extractedText: string;
  language: string;
  pageCount: number;
  extractedAt: string;
  documentAIOutput?: any;
  referencedDocuments?: string[];
}

export interface Risk {
  id: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  citation: string;
  recommendation: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  foundInReferencedDocs?: boolean;
  contextReasoning?: string;
}

export interface CategoryScore {
  category: 'GST' | 'Labor' | 'Contract Validity' | 'Data Protection';
  score: number;
}

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  clauseTitle: string;
  currentClause?: string;
  recommendedClause: string;
  legalBasis: string;
}

export interface Analysis {
  id: string;
  documentId: string;
  userId: string;
  indiaLawScore: number;
  riskSummary: {
    high: number;
    medium: number;
    low: number;
  };
  categoryScores: CategoryScore[];
  risks: Risk[];
  recommendations: Recommendation[];
  processingTime: number;
  createdAt: string;
  knowledgeBaseCitations: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  citations?: { title: string; uri: string }[];
  timestamp: string;
}

export interface QASession {
  id: string;
  documentId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

