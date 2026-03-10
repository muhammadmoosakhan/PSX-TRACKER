'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            className="block text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-2.5 text-sm rounded-[12px] outline-none
            transition-all duration-200 cursor-pointer
            focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30
            ${error ? 'ring-2 ring-red-400' : ''}
            ${className}
          `}
          style={{
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
