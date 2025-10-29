
import { RiskLevel } from './types';

export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  HIGH: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
  LOW: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400' },
};

export const CATEGORY_COLORS: Record<string, string> = {
    'GST': 'bg-blue-500',
    'Labor': 'bg-indigo-500',
    'Contract Validity': 'bg-purple-500',
    'Data Protection': 'bg-pink-500',
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
];
