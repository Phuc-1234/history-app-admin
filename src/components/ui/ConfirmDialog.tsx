// src/components/ui/ConfirmDialog.tsx
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #fecaca',
          borderRadius: 16,
          padding: 28,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 60px rgba(15,23,42,0.15)',
          animation: 'slideUp 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#ef4444',
          }}>⚠</div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 16, fontWeight: 700 }}>{title}</h3>
        </div>
        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>Hủy</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Xóa</Button>
        </div>
      </div>
    </div>
  );
}
