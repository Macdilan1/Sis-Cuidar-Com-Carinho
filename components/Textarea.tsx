
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, id, ...props }) => {
  const textareaId = id || `textarea-${label.toLowerCase().replace(/\s/g, '-')}`;
  return (
    <div>
      <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <textarea
        id={textareaId}
        className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition-all duration-200"
        {...props}
      ></textarea>
    </div>
  );
};
