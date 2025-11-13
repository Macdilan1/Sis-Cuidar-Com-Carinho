import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
  const inputId = id || `input-${label.toLowerCase().replace(/\s/g, '-')}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        id={inputId}
        className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition-all duration-200"
        {...props}
      />
    </div>
  );
};