
import React, { useState } from 'react';
import { Risk } from '../../types';
import Badge from '../ui/Badge';

interface RiskListProps {
  risks: Risk[];
}

const RiskItem: React.FC<{ risk: Risk }> = ({ risk }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <button
        className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-50 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center">
          <Badge level={risk.level} />
          <span className="ml-4 font-medium text-gray-800">{risk.description}</span>
        </div>
        <ChevronDownIcon isOpen={isOpen} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-600">Category</h4>
              <p className="text-sm text-gray-800">{risk.category}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-600">Legal Citation</h4>
              <p className="text-sm text-gray-800 italic">{risk.citation}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-green-700">Recommendation</h4>
              <p className="text-sm text-gray-800">{risk.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RiskList: React.FC<RiskListProps> = ({ risks }) => {
  if (risks.length === 0) {
    return (
      <div className="text-center py-10 bg-white border rounded-lg">
        <CheckCircleIcon />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No Risks Identified</h3>
        <p className="mt-1 text-sm text-gray-500">This document appears to be compliant based on our analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {risks.map((risk) => (
        <RiskItem key={risk.id} risk={risk} />
      ))}
    </div>
  );
};

const ChevronDownIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-5 w-5 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckCircleIcon = () => (
    <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default RiskList;
