// src/components/ui/Button.tsx
import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'secondary';
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const VARIANTS = {
  primary: {
    background: 'linear-gradient(135deg, #c37938 0%, #a66228 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 4px 12px rgba(195,121,56,0.3)',
  },
  danger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
  },
  secondary: {
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    boxShadow: 'none',
  },
};

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 18px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
        ...v,
        ...style,
      }}
      {...props}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  );
}
