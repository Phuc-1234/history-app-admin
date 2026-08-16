// src/components/ui/Badge.tsx
import type { HierarchyState } from '../../types/api';

interface BadgeProps {
  value: HierarchyState | string;
}

const COLORS: Record<string, { bg: string; color: string; border: string }> = {
  PUBLIC:     { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a', border: 'rgba(34,197,94,0.25)' },
  PRIVATE:    { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', border: 'rgba(239,68,68,0.25)' },
  ADMIN:      { bg: 'rgba(195,121,56,0.1)',  color: '#c37938', border: 'rgba(195,121,56,0.25)' },
  SUPER_ADMIN:{ bg: 'rgba(195,121,56,0.1)',  color: '#ef4444', border: 'rgba(195,121,56,0.25)' },
  STUDENT:    { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', border: 'rgba(107,114,128,0.2)' },
};

export function Badge({ value }: BadgeProps) {
  const style = COLORS[value] ?? { bg: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'rgba(99,102,241,0.25)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.03em',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {value}
    </span>
  );
}
