import { useState, useEffect, useCallback, useMemo } from 'react';
import client from '../../api/client';
import type { ToastType } from '../../hooks/useToast';
import { Spinner } from '../ui/Spinner';
import { IconUser } from '../ui/Icons';

interface FeedbackPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

interface FeedbackItem {
  id: string;
  userId: string;
  content: string;
  type: string; // "BUG" | "FEATURE" | "OTHER"
  createdAt: string;
  user: {
    name: string;
    email: string | null;
    profileImgUrl: string | null;
  };
}

export function FeedbackPanel({ onToast }: FeedbackPanelProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/admin/feedback');
      setFeedbacks(res.data ?? []);
    } catch {
      onToast('Không tải được danh sách góp ý', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const filteredFeedbacks = useMemo(() => {
    if (filterType === 'ALL') return feedbacks;
    return feedbacks.filter((f) => f.type === filterType);
  }, [feedbacks, filterType]);

  const getFeedbackBadge = (type: string) => {
    let bg = 'rgba(14,165,233,0.1)';
    let color = '#0284c7';
    let border = 'rgba(14,165,233,0.25)';
    let text = 'Ý kiến khác';

    if (type === 'BUG') {
      bg = 'rgba(239,68,68,0.1)';
      color = '#dc2626';
      border = 'rgba(239,68,68,0.25)';
      text = 'Báo lỗi';
    } else if (type === 'FEATURE') {
      bg = 'rgba(245,158,11,0.1)';
      color = '#d97706';
      border = 'rgba(245,158,11,0.25)';
      text = 'Đóng góp tính năng';
    }

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
          background: bg,
          color: color,
          border: `1px solid ${border}`,
        }}
      >
        {text}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            Ý kiến đóng góp & Góp ý
          </h2>
          <p style={{ margin: '0', color: '#64748b', fontSize: 14 }}>
            Xem các báo cáo lỗi và đóng góp ý kiến từ người học
          </p>
        </div>
        <button
          onClick={fetchFeedbacks}
          style={{
            padding: '8px 16px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Làm mới
        </button>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'BUG', label: 'Báo lỗi' },
          { key: 'FEATURE', label: 'Đóng góp tính năng' },
          { key: 'OTHER', label: 'Ý kiến khác' },
        ].map((btn) => {
          const isActive = filterType === btn.key;
          return (
            <button
              key={btn.key}
              onClick={() => setFilterType(btn.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: isActive ? '#4f46e5' : '#e2e8f0',
                color: isActive ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={36} />
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          padding: 60,
          textAlign: 'center',
          color: '#64748b',
          fontSize: 14,
        }}>
          Không có góp ý nào phù hợp trong danh mục này.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredFeedbacks.map((item) => (
            <div
              key={item.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                padding: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: '1px solid #f1f5f9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {item.user.profileImgUrl ? (
                      <img
                        src={item.user.profileImgUrl}
                        alt={item.user.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <IconUser size={20} color="#94a3b8" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                      {item.user.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {item.user.email || 'Ẩn danh'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  {getFeedbackBadge(item.type)}
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>

              <div style={{
                fontSize: 14,
                color: '#334155',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {item.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
