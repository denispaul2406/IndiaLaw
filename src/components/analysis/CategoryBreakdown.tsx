
import React from 'react';
import { CategoryScore } from '../../types';
import { CATEGORY_COLORS } from '../../constants';

interface CategoryBreakdownProps {
  data: CategoryScore[];
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.category}>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">{item.category}</span>
            <span className="text-sm font-medium text-gray-700">{item.score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`${CATEGORY_COLORS[item.category]} h-2.5 rounded-full`}
              style={{ width: `${item.score}%`, transition: 'width 1s ease-out' }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryBreakdown;
