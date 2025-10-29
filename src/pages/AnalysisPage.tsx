
import React, { useState, useEffect } from 'react';
import { Document, Analysis, RiskLevel } from '../types';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import ScoreGauge from '../components/analysis/ScoreGauge';
import CategoryBreakdown from '../components/analysis/CategoryBreakdown';
import RiskList from '../components/analysis/RiskList';
import { SUPPORTED_LANGUAGES } from '../constants';
import Button from '../components/ui/Button';
import { api } from '../services/api-production';

interface AnalysisPageProps {
  document: Document;
  onNavigate: (view: 'chat', doc: Document) => void;
}

const AnalysisPage: React.FC<AnalysisPageProps> = ({ document, onNavigate }) => {
  const [selectedLang, setSelectedLang] = useState('en');
  const [analysis, setAnalysis] = useState<Analysis | null>(document.analysis || null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    if (!analysis && document.status === 'completed') {
      loadAnalysis();
    }
  }, [document]);

  const loadAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const analysisData = await api.getAnalysis(document.id);
      setAnalysis(analysisData);
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleReAnalyze = async () => {
    try {
      await api.triggerAnalysis(document.id);
      // Poll for new analysis
      setTimeout(() => loadAnalysis(), 5000);
    } catch (error) {
      console.error('Error triggering re-analysis:', error);
      alert('Failed to trigger re-analysis');
    }
  };

  const handleDownloadReport = async () => {
    if (!analysis) return;
    
    setDownloadingReport(true);
    try {
      const reportUrl = await api.getReport(analysis.id);
      window.open(reportUrl, '_blank');
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Fix: Add a dedicated UI for when the document status is 'Error'.
  if (document.status === 'Error') {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center">
        <ErrorIcon />
        <h2 className="mt-4 text-xl font-semibold text-red-600">Analysis Failed</h2>
        <p className="text-gray-600 mt-2">The document "{document.name}" could not be analyzed.</p>
        {document.errorMessage && (
          <p className="mt-2 text-sm text-gray-500 bg-red-50 p-3 rounded-md border border-red-200 max-w-md">
            <strong>Reason:</strong> {document.errorMessage}
          </p>
        )}
      </div>
    );
  }

  if (!analysis) {
    if (loadingAnalysis) {
      return (
        <div className="flex flex-col justify-center items-center h-full text-center">
          <Spinner size="lg" />
          <h2 className="mt-4 text-xl font-semibold">Loading Analysis...</h2>
        </div>
      );
    }
    
    if (document.status === 'Processing') {
      return (
        <div className="flex flex-col justify-center items-center h-full text-center">
          <Spinner size="lg" />
          <h2 className="mt-4 text-xl font-semibold">Analysis in Progress...</h2>
          <p className="text-gray-600">The AI is currently reviewing your document: {document.name}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col justify-center items-center h-full text-center">
        <p className="text-gray-600">No analysis available yet.</p>
        <Button onClick={handleReAnalyze} className="mt-4">
          Trigger Analysis
        </Button>
      </div>
    );
  }

  const riskCounts = analysis.riskSummary;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analysis Dashboard</h1>
          <p className="text-gray-600 mt-1">Report for: <span className="font-semibold">{document.name}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => onNavigate('chat', document)} variant="secondary">
            <ChatIcon /> Ask AI
          </Button>
          <Button onClick={handleReAnalyze}>
            <RefreshIcon /> Re-analyze
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-center">IndiaLaw Score</h2>
            <ScoreGauge score={analysis.indiaLawScore} />
          </Card>
          <Card>
            <h2 className="text-lg font-semibold mb-4">Risk Summary</h2>
            <div className="space-y-3">
              <RiskSummaryItem level="HIGH" count={riskCounts.high} />
              <RiskSummaryItem level="MEDIUM" count={riskCounts.medium} />
              <RiskSummaryItem level="LOW" count={riskCounts.low} />
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Compliance Score by Category</h2>
            <CategoryBreakdown data={analysis.categoryScores} />
          </Card>
        </div>
      </div>

      {/* Risk Details Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Identified Risks & Recommendations</h2>
            <div className="flex items-center gap-4">
                <select 
                    value={selectedLang} 
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
                <Button variant="outline" onClick={handleDownloadReport} disabled={downloadingReport}>
                  {downloadingReport ? <Spinner /> : 'Download PDF Report'}
                </Button>
            </div>
        </div>
        <RiskList risks={analysis.risks} />
      </div>
    </div>
  );
};

const RiskSummaryItem: React.FC<{ level: RiskLevel; count: number }> = ({ level, count }) => {
  const colors: Record<RiskLevel, string> = {
    HIGH: 'bg-red-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-green-500',
  };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <span className={`h-3 w-3 rounded-full ${colors[level]} mr-3`}></span>
        <span className="text-sm font-medium text-gray-700">{level} Risk</span>
      </div>
      <span className="text-lg font-bold text-gray-900">{count}</span>
    </div>
  );
};

const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;

export default AnalysisPage;
