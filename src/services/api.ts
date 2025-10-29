
import { Document, Analysis, ChatMessage, DocumentStatus } from '../types';
import { analyzeDocumentCompliance, startChatStream, extractTextWithGemini } from './gemini';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Helper to read file as Base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix
        resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
});

// Helper function to extract text from PDF using pdfjs-dist
const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
        }

        return fullText.trim();
    } catch (error) {
        console.error('PDF.js extraction failed:', error);
        throw error;
    }
};

// Helper to read file as text (for Gemini analysis)
// Strategy: Try local extraction first (faster), then Gemini as fallback for complex documents
const toText = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            const reader = new FileReader();
            
            reader.onload = async () => {
                try {
                    const arrayBuffer = reader.result as ArrayBuffer;
                    
                    // Strategy 1: For PDFs, try local extraction first (no API calls, faster)
                    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                        try {
                            const extractedText = await extractTextFromPDF(arrayBuffer);
                            
                            if (extractedText.trim().length > 50) {
                                console.log('✅ Local PDF extraction successful, text length:', extractedText.length);
                                resolve(extractedText);
                                return;
                            } else {
                                console.warn('Local PDF extraction returned minimal text, trying Gemini as fallback...');
                                throw new Error('Insufficient text extracted');
                            }
                        } catch (pdfError) {
                            console.warn('Local PDF extraction failed, trying Gemini as fallback:', pdfError);
                            // Continue to Gemini fallback
                        }
                    }
                    
                    // Strategy 2: For images or PDFs, use Gemini as primary or fallback
                    if (file.type === 'application/pdf' || file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
                        try {
                            console.log('Attempting Gemini extraction for file type:', file.type);
                            const base64Data = await toBase64(file);
                            const extractedText = await extractTextWithGemini(base64Data, file.type || 'application/pdf');
                            console.log('✅ Gemini extraction successful, text length:', extractedText.length);
                            resolve(extractedText);
                            return;
                        } catch (geminiError) {
                            console.error('❌ Gemini extraction failed:', geminiError);
                            
                            // If both failed, reject with helpful error
                            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                                reject(new Error('Failed to extract text from PDF. Both local and AI extraction failed. The PDF might be corrupted, password-protected, or the AI service is unavailable.'));
                            } else {
                                reject(new Error('Failed to extract text. The file might not be readable.'));
                            }
                            return;
                        }
                    }
                    
                    // Strategy 3: Regular text reading for .txt, .md, etc.
                    const text = new TextDecoder().decode(arrayBuffer);
                    if (text.length === 0) {
                        reject(new Error('File appears to be empty or unreadable.'));
                        return;
                    }
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = error => reject(error);
            reader.readAsArrayBuffer(file);
        } catch (error) {
            reject(error);
        }
    });
};


export const api = {
  // This function is now just for initial setup, as documents are managed in-memory.
  getDocuments: async (): Promise<Document[]> => {
    return Promise.resolve([]);
  },

  startUploadAndAnalysis: async (file: File, onComplete: (doc: Document) => void): Promise<Document> => {
    const startTime = Date.now();
    const newDocId = `doc-${startTime}`;
    const newAnalysisId = `analysis-${startTime}`;

    const [base64Content, textContent] = await Promise.all([
        toBase64(file),
        toText(file).catch((error) => {
            console.error('Text extraction failed:', error);
            return `File could not be read as text. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        })
    ]);

    const newDoc: Document = {
      id: newDocId,
      name: file.name,
      uploadedAt: new Date().toISOString(),
      status: 'Processing',
      size: file.size,
      analysisId: newAnalysisId,
      content: base64Content,
    };

    // Immediately start analysis, but don't block the initial return
    (async () => {
        try {
            console.log('Extracted text length:', textContent.length);
            console.log('First 500 characters:', textContent.substring(0, 500));
            
            const analysisResult = await analyzeDocumentCompliance(textContent);
            const endTime = Date.now();

            const finalAnalysis: Analysis = {
                ...analysisResult,
                id: newAnalysisId,
                documentId: newDocId,
                createdAt: new Date().toISOString(),
                processingTime: Math.round((endTime - startTime) / 1000),
            };

            const finishedDoc: Document = {
                ...newDoc,
                status: 'Analyzed',
                analysis: finalAnalysis,
            };
            onComplete(finishedDoc);
        } catch (error) {
            console.error("Analysis process failed:", error);
            // Fix: Populate the errorMessage field in the document object on failure.
            const errorDoc: Document = {
                ...newDoc,
                status: 'Error',
                errorMessage: error instanceof Error ? error.message : 'An unknown error occurred during analysis.'
            };
            onComplete(errorDoc);
        }
    })();

    return newDoc;
  },

  postQuestionStream: async function* (document: Document, history: ChatMessage[], question: string): AsyncGenerator<Partial<ChatMessage>, void, unknown> {
    yield* startChatStream(document, history, question);
  }
};
