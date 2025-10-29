import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { VertexAIService } from '../services/vertex-ai';
import { TranslationService } from '../services/translation';
import { StorageService } from '../services/storage';
import admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

// Get or create Q&A session
router.get('/session/:documentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.uid;

    const sessionRef = db.collection('qaSessions').where('documentId', '==', documentId)
      .where('userId', '==', userId).limit(1);

    const snapshot = await sessionRef.get();

    if (snapshot.empty) {
      const newSession = {
        id: db.collection('qaSessions').doc().id,
        documentId,
        userId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = db.collection('qaSessions').doc(newSession.id);
      await docRef.set(newSession);
      return res.json(newSession);
    }

    const session = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    res.json(session);
  } catch (error: any) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ask question
router.post('/ask', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, question, sessionId } = req.body;
    const userId = req.user!.uid;

    if (!question || !documentId) {
      return res.status(400).json({ error: 'Question and documentId required' });
    }

    // Detect question language
    const questionLanguage = await TranslationService.detectLanguage(question);

    // Get document and extracted text
    const docSnapshot = await db.collection('documents').doc(documentId).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docSnapshot.data()!;
    if (document.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const textSnapshot = await db.collection('documentText').doc(documentId).get();
    if (!textSnapshot.exists) {
      return res.status(404).json({ error: 'Document text not extracted yet' });
    }

    const documentText = textSnapshot.data()!;
    const analysisSnapshot = await db.collection('analyses')
      .where('documentId', '==', documentId).limit(1).get();
    const analysis = analysisSnapshot.empty ? null : analysisSnapshot.docs[0].data();

    // Query knowledge base
    const knowledgeBaseContext = await VertexAIService.queryKnowledgeBase(question, 5);

    // Get conversation history
    let session;
    if (sessionId) {
      const sessionDoc = await db.collection('qaSessions').doc(sessionId).get();
      session = sessionDoc.data();
    }

    // Generate answer with streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullAnswer = '';
    for await (const chunk of VertexAIService.streamAnswer(
      question,
      questionLanguage,
      documentText.extractedText,
      analysis || {},
      knowledgeBaseContext.map(ctx => ctx.text || ''),
      session?.messages || []
    )) {
      fullAnswer += chunk;
      res.write(`data: ${JSON.stringify({ chunk, type: 'content' })}\n\n`);
    }

    // Translate answer if needed
    if (questionLanguage !== 'en') {
      const translatedAnswer = await TranslationService.translateText(fullAnswer, questionLanguage);
      res.write(`data: ${JSON.stringify({ chunk: '', type: 'complete', answer: translatedAnswer })}\n\n`);
      fullAnswer = translatedAnswer;
    } else {
      res.write(`data: ${JSON.stringify({ chunk: '', type: 'complete', answer: fullAnswer })}\n\n`);
    }

    // Save to session
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: question,
      language: questionLanguage,
      timestamp: new Date().toISOString(),
    };

    const assistantMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: fullAnswer,
      language: questionLanguage,
      timestamp: new Date().toISOString(),
    };

    if (session) {
      await db.collection('qaSessions').doc(session.id).update({
        messages: [...(session.messages || []), userMessage, assistantMessage],
        updatedAt: new Date().toISOString(),
      });
    }

    res.end();
  } catch (error: any) {
    console.error('Error in Q&A:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as qaRouter };

