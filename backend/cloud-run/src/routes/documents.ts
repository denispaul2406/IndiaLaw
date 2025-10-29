import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const snapshot = await db.collection('documents')
      .where('userId', '==', userId)
      .orderBy('uploadedAt', 'desc')
      .get();

    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ documents });
  } catch (error: any) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:documentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.uid;

    const docSnapshot = await db.collection('documents').doc(documentId).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docSnapshot.data()!;
    if (document.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ id: docSnapshot.id, ...document });
  } catch (error: any) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:documentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.uid;

    const docSnapshot = await db.collection('documents').doc(documentId).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docSnapshot.data()!;
    if (document.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from Firestore
    await db.collection('documents').doc(documentId).delete();

    // Delete from Storage (can be async)
    // StorageService.deleteFile(document.storagePath);

    res.json({ message: 'Document deleted' });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as documentsRouter };

