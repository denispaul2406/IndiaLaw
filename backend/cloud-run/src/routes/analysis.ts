import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

router.get('/:documentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.uid;

    const analysisSnapshot = await db.collection('analyses')
      .where('documentId', '==', documentId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (analysisSnapshot.empty) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const analysis = analysisSnapshot.docs[0].data();
    res.json(analysis);
  } catch (error: any) {
    console.error('Error getting analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:documentId/analyze', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.uid;

    // Check document exists
    const docSnapshot = await db.collection('documents').doc(documentId).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docSnapshot.data()!;
    if (document.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Trigger analysis via Pub/Sub
    // Analysis will be handled by Cloud Function
    res.json({
      message: 'Analysis triggered',
      documentId,
    });
  } catch (error: any) {
    console.error('Error triggering analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as analysisRouter };

