import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // In Cloud Run, use default credentials. For local dev, use service account file.
  const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;
  
  if (serviceAccountPath) {
    // Local development with service account file
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Production - use default credentials from GCP
    admin.initializeApp();
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    displayName?: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      displayName: decodedToken.name,
    };

    next();
  } catch (error: any) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

