import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth';
import { uploadRouter } from './routes/upload';
import { analysisRouter } from './routes/analysis';
import { qaRouter } from './routes/qa';
import { reportRouter } from './routes/report';
import { documentsRouter } from './routes/documents';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/upload', authMiddleware, uploadRouter);
app.use('/api/analysis', authMiddleware, analysisRouter);
app.use('/api/qa', authMiddleware, qaRouter);
app.use('/api/report', authMiddleware, reportRouter);
app.use('/api/documents', authMiddleware, documentsRouter);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

