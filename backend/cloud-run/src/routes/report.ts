import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { StorageService } from '../services/storage';
import admin from 'firebase-admin';
// @ts-ignore - pdfkit types are outdated
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

const router = Router();
const db = admin.firestore();

router.get('/:analysisId/pdf', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { analysisId } = req.params;
    const userId = req.user!.uid;

    const analysisSnapshot = await db.collection('analyses').doc(analysisId).get();
    if (!analysisSnapshot.exists) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const analysis = analysisSnapshot.data()!;
    if (analysis.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get document info
    const docSnapshot = await db.collection('documents').doc(analysis.documentId).get();
    const document = docSnapshot.data()!;

    // Generate PDF
    const pdfBuffer = await generatePDFReport(document, analysis);

    // Save to storage
    const reportPath = await StorageService.uploadFile(
      pdfBuffer,
      `report-${analysisId}.pdf`,
      userId,
      'reports'
    );

    // Get signed URL
    const downloadUrl = await StorageService.getSignedUrl(reportPath, 60);

    res.json({
      reportUrl: downloadUrl,
      reportPath,
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

async function generatePDFReport(document: any, analysis: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cover page
    doc.fontSize(24).text('IndiaLawAI Compliance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Document: ${document.name}`, { align: 'center' });
    doc.fontSize(12).text(`Generated: ${new Date(analysis.createdAt).toLocaleDateString()}`, { align: 'center' });
    doc.addPage();

    // Executive Summary
    doc.fontSize(20).text('Executive Summary');
    doc.moveDown();
    doc.fontSize(16).text(`IndiaLaw Score: ${analysis.indiaLawScore}/100`);
    doc.moveDown();
    doc.fontSize(12).text(`Risk Summary:`);
    doc.text(`- High Risks: ${analysis.riskSummary.high}`);
    doc.text(`- Medium Risks: ${analysis.riskSummary.medium}`);
    doc.text(`- Low Risks: ${analysis.riskSummary.low}`);
    doc.addPage();

    // Category Scores
    doc.fontSize(20).text('Compliance Scores by Category');
    doc.moveDown();
    analysis.categoryScores.forEach((category: any) => {
      doc.fontSize(14).text(`${category.category}: ${category.score}%`);
      doc.moveDown(0.5);
    });
    doc.addPage();

    // Risks
    doc.fontSize(20).text('Identified Risks & Recommendations');
    doc.moveDown();
    analysis.risks.forEach((risk: any, index: number) => {
      doc.fontSize(14).text(`${index + 1}. ${risk.level} Risk - ${risk.category}`);
      doc.fontSize(12).text(`Description: ${risk.description}`);
      doc.fontSize(11).text(`Citation: ${risk.citation}`, { italic: true });
      doc.fontSize(12).text(`Recommendation: ${risk.recommendation}`);
      doc.moveDown();
    });
    doc.addPage();

    // Recommendations
    doc.fontSize(20).text('Detailed Recommendations');
    doc.moveDown();
    analysis.recommendations.forEach((rec: any, index: number) => {
      doc.fontSize(14).text(`${index + 1}. ${rec.clauseTitle}`);
      if (rec.currentClause) {
        doc.fontSize(11).text(`Current: ${rec.currentClause}`, { color: 'red' });
      }
      doc.fontSize(11).text(`Recommended: ${rec.recommendedClause}`, { color: 'green' });
      doc.fontSize(10).text(`Legal Basis: ${rec.legalBasis}`, { italic: true });
      doc.moveDown();
    });

    // Legal Citations
    if (analysis.knowledgeBaseCitations?.length > 0) {
      doc.addPage();
      doc.fontSize(20).text('Legal Citations Referenced');
      doc.moveDown();
      analysis.knowledgeBaseCitations.forEach((citation: string) => {
        doc.fontSize(11).text(`- ${citation}`);
        doc.moveDown(0.3);
      });
    }

    doc.end();
  });
}

export { router as reportRouter };

