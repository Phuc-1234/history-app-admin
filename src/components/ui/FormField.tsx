// src/components/ui/FormField.tsx
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

const inputStyle = {
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#0f172a',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

interface FieldWrapperProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function FieldWrapper({ label, children, hint }: FieldWrapperProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{hint}</p>}
    </div>
  );
}

export function Input({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <FieldWrapper label={label} hint={hint}>
      <input
        {...props}
        style={{ ...inputStyle, ...props.style }}
        onFocus={(e) => {
          e.target.style.borderColor = '#6c63ff';
          e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e2e8f0';
          e.target.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
    </FieldWrapper>
  );
}

export function Textarea({ label, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <FieldWrapper label={label} hint={hint}>
      <textarea
        {...props}
        style={{ ...inputStyle, resize: 'vertical', minHeight: 90, ...props.style }}
        onFocus={(e) => {
          e.target.style.borderColor = '#6c63ff';
          e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e2e8f0';
          e.target.style.boxShadow = 'none';
        }}
      />
    </FieldWrapper>
  );
}

export function Select({ label, hint, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  return (
    <FieldWrapper label={label} hint={hint}>
      <select
        {...props}
        style={{ ...inputStyle, cursor: 'pointer', ...props.style }}
        onFocus={(e) => {
          e.target.style.borderColor = '#6c63ff';
          e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e2e8f0';
          e.target.style.boxShadow = 'none';
        }}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}
