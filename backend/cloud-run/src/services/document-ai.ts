import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as path from 'path';
import { StorageService } from './storage';

const client = new DocumentProcessorServiceClient({
  keyFilename: process.env.SERVICE_ACCOUNT_PATH || './config/service-account.json',
});

export interface ExtractedText {
  text: string;
  language: string;
  pageCount: number;
  structure?: any;
  referencedDocuments?: string[];
}

export class DocumentAIService {
  /**
   * Extract text from PDF using Document AI Layout Parser
   */
  static async extractText(filePath: string): Promise<ExtractedText> {
    const processorIdFull = process.env.DOCUMENT_AI_LAYOUT_PROCESSOR;
    if (!processorIdFull) {
      throw new Error('Document AI Layout Processor not configured');
    }

    const projectId = process.env.GCP_PROJECT_ID;
    const location = 'asia-south1';

    // Extract processor ID from full path if needed
    let processorId = processorIdFull;
    if (processorIdFull.includes('/processors/')) {
      processorId = processorIdFull.split('/processors/')[1];
    }

    // Download file from storage
    const fileBuffer = await StorageService.downloadFile(filePath);

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const request = {
      name,
      rawDocument: {
        content: fileBuffer,
        mimeType: 'application/pdf',
      },
    };

    const [result] = await client.processDocument(request);
    const { document } = result;

    if (!document) {
      throw new Error('No document returned from Document AI');
    }

    const text = document.text || '';
    const pageCount = document.pages?.length || 0;

    // Detect language (simple heuristic - can be enhanced)
    const language = this.detectLanguage(text);

    // Extract referenced documents (look for patterns like "GCC", "SCC", "Safety Manual")
    const referencedDocuments = this.extractReferencedDocuments(text);

    return {
      text,
      language,
      pageCount,
      structure: document,
      referencedDocuments,
    };
  }

  /**
   * Detect language from text (simple heuristic)
   */
  private static detectLanguage(text: string): string {
    // Check for Devanagari (Hindi)
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Check for Tamil
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    // Check for Bengali
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    // Check for Telugu
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    // Default to English
    return 'en';
  }

  /**
   * Extract referenced document names from text
   */
  private static extractReferencedDocuments(text: string): string[] {
    const patterns = [
      /(?:GCC|General Conditions of Contract)/gi,
      /(?:SCC|Special Conditions of Contract)/gi,
      /(?:PCC|Particular Conditions of Contract)/gi,
      /(?:Safety Manual|Safety Manuals?)/gi,
      /(?:Technical Specification|Technical Specifications?)/gi,
    ];

    const found: string[] = [];
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        if (match && !found.includes(match[0])) {
          found.push(match[0]);
        }
      }
    }

    return found;
  }

  /**
   * Extract text using OCR processor for scanned documents
   */
  static async extractTextOCR(filePath: string): Promise<ExtractedText> {
    const processorId = process.env.DOCUMENT_AI_OCR_PROCESSOR;
    if (!processorId) {
      throw new Error('Document AI OCR Processor not configured');
    }

    const projectId = process.env.GCP_PROJECT_ID;
    const location = 'asia-south1';

    const fileBuffer = await StorageService.downloadFile(filePath);
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const request = {
      name,
      rawDocument: {
        content: fileBuffer,
        mimeType: 'application/pdf',
      },
    };

    const [result] = await client.processDocument(request);
    const { document } = result;

    if (!document) {
      throw new Error('No document returned from Document AI OCR');
    }

    const text = document.text || '';
    const pageCount = document.pages?.length || 0;
    const language = this.detectLanguage(text);
    const referencedDocuments = this.extractReferencedDocuments(text);

    return {
      text,
      language,
      pageCount,
      structure: document,
      referencedDocuments,
    };
  }
}

