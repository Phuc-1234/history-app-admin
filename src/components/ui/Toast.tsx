// src/components/ui/Toast.tsx
import type { Toast as ToastItem } from '../../hooks/useToast';

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}

const TOAST_STYLES = {
  success: { border: '1px solid #bbf7d0', icon: '✓', iconColor: '#16a34a', bg: '#f0fdf4', iconBg: '#dcfce7' },
  error:   { border: '1px solid #fecaca', icon: '✕', iconColor: '#dc2626', bg: '#fef2f2', iconBg: '#fee2e2' },
  info:    { border: '1px solid #c7d2fe', icon: 'ℹ', iconColor: '#4f46e5', bg: '#eef2ff', iconBg: '#e0e7ff' },
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24,
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const s = TOAST_STYLES[t.type];
        return (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: s.bg,
              border: s.border,
              borderRadius: 12,
              padding: '12px 16px',
              minWidth: 280,
              maxWidth: 380,
              boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
              pointerEvents: 'all',
              animation: 'slideInRight 0.3s ease',
            }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: s.iconBg,
              border: s.border,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: s.iconColor, fontWeight: 700, fontSize: 14,
              flexShrink: 0,
            }}>
              {s.icon}
            </span>
            <span style={{ fontSize: 14, color: '#0f172a', flex: 1, lineHeight: 1.5 }}>
              {t.message}
            </span>
            <button
              onClick={() => onRemove(t.id)}
              style={{
                background: 'none', border: 'none', color: '#94a3b8',
                cursor: 'pointer', fontSize: 16, padding: '0 2px',
              }}
            >×</button>
          </div>
        );
      })}
    </div>
  );
}
