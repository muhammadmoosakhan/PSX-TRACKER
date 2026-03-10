'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, error, prefix, suffix, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            className="block text-sm font-medium"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span
              className="absolute left-3 text-sm pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            >
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-2.5 text-sm rounded-[12px] outline-none
              transition-all duration-200
              focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30
              disabled:opacity-50 disabled:cursor-not-allowed
              ${prefix ? 'pl-10' : ''}
              ${suffix ? 'pr-10' : ''}
              ${error ? 'ring-2 ring-red-400' : ''}
              ${className}
            `}
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
            }}
            {...props}
          />
          {suffix && (
            <span
              className="absolute right-3 text-sm pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            >
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helper && !error && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
