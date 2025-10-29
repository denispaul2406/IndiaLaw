
import React from 'react';

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s < 50) return '#ef4444'; // red-500
    if (s < 75) return '#f59e0b'; // amber-500
    return '#22c55e'; // green-500
  };

  const color = getColor(score);

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      <svg className="w-full h-full" viewBox="0 0 200 200">
        <circle
          className="text-gray-200"
          strokeWidth="12"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
        />
        <circle
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-sm text-gray-500">out of 100</span>
      </div>
    </div>
  );
};

export default ScoreGauge;
