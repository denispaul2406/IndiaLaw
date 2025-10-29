
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

  const variantStyles = {
    primary: 'border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500',
    outline: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
