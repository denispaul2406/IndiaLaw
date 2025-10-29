
import React from 'react';
import { RiskLevel } from '../../types';
import { RISK_COLORS } from '../../constants';

interface BadgeProps {
  level: RiskLevel;
}

const Badge: React.FC<BadgeProps> = ({ level }) => {
  const color = RISK_COLORS[level];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color.bg} ${color.text}`}
    >
      {level}
    </span>
  );
};

export default Badge;
