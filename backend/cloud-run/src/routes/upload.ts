import { Router, Request, Response } from 'express';
import multer from 'multer';
import { StorageService } from '../services/storage';
import { DocumentAIService } from '../services/document-ai';
import { VertexAIService } from '../services/vertex-ai';
import { AuthenticatedRequest } from '../middleware/auth';
import admin from 'firebase-admin';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const db = admin.firestore();

/**
 * Process document in background - Extract text and analyze
 * This runs asynchronously after upload completes
 */
async function processDocumentInBackground(documentId: string, filePath: string, userId: string) {
  try {
    console.log(`[Background] Starting processing for document ${documentId}`);
    
    // Step 1: Extract text using Document AI
    const extracted = await DocumentAIService.extractText(filePath);
    
    // Save extracted text
    await db.collection('documentText').doc(documentId).set({
      documentId,
      extractedText: extracted.text,
      language: extracted.language,
      pageCount: extracted.pageCount,
      extractedAt: new Date().toISOString(),
      referencedDocuments: extracted.referencedDocuments || [],
    });

    // Update document with language
    await db.collection('documents').doc(documentId).update({
      language: extracted.language,
      status: 'extracted',
    });

    console.log(`[Background] Text extracted for document ${documentId}`);

    // Step 2: Query knowledge base
    const knowledgeBaseContext = await VertexAIService.queryKnowledgeBase(extracted.text.substring(0, 1000), 5);

    // Step 3: Analyze document
    const analysis = await VertexAIService.analyzeDocument(
      extracted.text,
      extracted.referencedDocuments || [],
      knowledgeBaseContext
    );

    // Step 4: Save analysis
    const analysisRef = db.collection('analyses').doc();
    const analysisData = {
      id: analysisRef.id,
      documentId,
      userId,
      ...analysis,
      processingTime: 0, // Will calculate if needed
      createdAt: new Date().toISOString(),
    };
    await analysisRef.set(analysisData);

    // Update document status
    await db.collection('documents').doc(documentId).update({
      status: 'completed',
      analysisId: analysisRef.id,
    });

    console.log(`[Background] Analysis completed for document ${documentId}`);
  } catch (error: any) {
    console.error(`[Background] Error processing document ${documentId}:`, error);
    
    // Update document status to error
    try {
      await db.collection('documents').doc(documentId).update({
        status: 'error',
        errorMessage: error.message || 'Processing failed',
      });
    } catch (updateError) {
      console.error('Failed to update document error status:', updateError);
    }
  }
}

router.post('/', upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (req.file.size > 15 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 15MB limit' });
    }

    const userId = req.user!.uid;
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = await StorageService.uploadFile(req.file.buffer, fileName, userId, 'uploads');

    // Create document record
    const docRef = db.collection('documents').doc();
    const document = {
      id: docRef.id,
      userId,
      name: req.file.originalname,
      originalFileName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      storagePath: filePath,
      documentType: undefined,
      language: undefined,
    };

    await docRef.set(document);

    // Start background processing (don't await - return immediately)
    // This processes the document asynchronously
    processDocumentInBackground(docRef.id, filePath, userId).catch((error) => {
      console.error(`Failed to process document ${docRef.id} in background:`, error);
    });

    res.json({
      documentId: docRef.id,
      status: 'processing',
      message: 'Document uploaded successfully. Processing started.',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

export { router as uploadRouter };

