import { useState, useEffect, useCallback, useMemo } from 'react';
import client from '../../api/client';
import type { ToastType } from '../../hooks/useToast';
import { Spinner } from '../ui/Spinner';
import { IconUser } from '../ui/Icons';

const IconList = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const IconGrid = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

interface FeedbackPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

interface FeedbackItem {
  id: string;
  userId: string;
  content: string;
  type: string; // "BUG" | "FEATURE" | "OTHER" | "INCORRECT_INFO"
  status: 'PENDING' | 'RESOLVED' | 'IGNORED';
  targetName?: string | null;
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
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const handleUpdateStatus = useCallback(async (id: string, newStatus: 'PENDING' | 'RESOLVED' | 'IGNORED') => {
    try {
      await client.patch(`/api/admin/feedback/${id}`, { status: newStatus });
      onToast('Cập nhật trạng thái thành công', 'success');
      setFeedbacks((prev) =>
        prev.map((fb) => (fb.id === id ? { ...fb, status: newStatus } : fb))
      );
    } catch {
      onToast('Không thể cập nhật trạng thái góp ý', 'error');
    }
  }, [onToast]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const filteredFeedbacks = useMemo(() => {
    let result = feedbacks;
    if (filterType !== 'ALL') {
      result = result.filter((f) => f.type === filterType);
    }
    if (filterStatus !== 'ALL') {
      result = result.filter((f) => f.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.content.toLowerCase().includes(q) ||
          f.user.name.toLowerCase().includes(q) ||
          (f.user.email && f.user.email.toLowerCase().includes(q))
      );
    }
    return result;
  }, [feedbacks, filterType, filterStatus, searchQuery]);

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
    } else if (type === 'INCORRECT_INFO') {
      bg = 'rgba(239,68,68,0.1)';
      color = '#dc2626';
      border = 'rgba(239,68,68,0.25)';
      text = 'Thông tin sai';
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

  const getStatusBadge = (status: 'PENDING' | 'RESOLVED' | 'IGNORED') => {
    let bg = 'rgba(245,158,11,0.1)';
    let color = '#d97706';
    let border = 'rgba(245,158,11,0.25)';
    let text = 'Chờ xử lý';

    if (status === 'RESOLVED') {
      bg = 'rgba(34,197,94,0.1)';
      color = '#15803d';
      border = 'rgba(34,197,94,0.25)';
      text = 'Đã giải quyết';
    } else if (status === 'IGNORED') {
      bg = 'rgba(100,116,139,0.1)';
      color = '#475569';
      border = 'rgba(100,116,139,0.25)';
      text = 'Bỏ qua';
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
          onClick={() => setViewMode(viewMode === 'full' ? 'compact' : 'full')}
          title={viewMode === 'full' ? 'Chuyển sang chế độ thu nhỏ' : 'Chuyển sang chế độ đầy đủ'}
          style={{
            padding: '8px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#94a3b8';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          {viewMode === 'full' ? <IconGrid size={20} /> : <IconList size={20} />}
        </button>
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1, minWidth: 240 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Tìm kiếm:</label>
          <input
            type="text"
            placeholder="Tìm theo nội dung, tên người gửi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 13,
              color: '#334155',
              outline: 'none',
              height: 38,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Phân loại:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 180,
              height: 38,
              boxSizing: 'border-box',
            }}
          >
            <option value="ALL">Tất cả phân loại</option>
            <option value="BUG">Báo lỗi</option>
            <option value="INCORRECT_INFO">Thông tin sai</option>
            <option value="FEATURE">Tính năng</option>
            <option value="OTHER">Ý kiến khác</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Trạng thái:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 180,
              height: 38,
              boxSizing: 'border-box',
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="RESOLVED">Đã giải quyết</option>
            <option value="IGNORED">Bỏ qua</option>
          </select>
        </div>
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
        <div style={
          viewMode === 'full'
            ? { display: 'flex', flexDirection: 'column', gap: 16 }
            : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }
        }>
          {filteredFeedbacks.map((item) => (
            <div
              key={item.id}
              style={
                viewMode === 'full'
                  ? {
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 20,
                      padding: 24,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }
                  : {
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 20,
                      padding: 16,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 180,
                    }
              }
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: viewMode === 'full' ? 16 : 12,
                paddingBottom: viewMode === 'full' ? 16 : 12,
                borderBottom: '1px solid #f1f5f9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: viewMode === 'full' ? 40 : 32,
                    height: viewMode === 'full' ? 40 : 32,
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
                      <IconUser size={viewMode === 'full' ? 20 : 16} color="#94a3b8" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: viewMode === 'full' ? 15 : 14, fontWeight: 700, color: '#0f172a' }}>
                      {item.user.name}
                    </div>
                    <div style={{ fontSize: viewMode === 'full' ? 13 : 12, color: '#64748b' }}>
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
                fontSize: viewMode === 'full' ? 14 : 13,
                color: '#334155',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                flexGrow: 1,
                marginBottom: item.targetName ? (viewMode === 'full' ? 14 : 10) : 0,
              }}>
                {item.content}
              </div>

              {item.targetName && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#64748b',
                  alignSelf: 'flex-start',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                  <span>{item.targetName}</span>
                </div>
              )}

              {/* Status and Action Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: viewMode === 'full' ? 16 : 12,
                paddingTop: viewMode === 'full' ? 16 : 12,
                borderTop: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {viewMode === 'full' && <span style={{ fontSize: 13, color: '#64748b' }}>Trạng thái:</span>}
                  {getStatusBadge(item.status)}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {item.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                      style={{
                        padding: viewMode === 'full' ? '6px 12px' : '4px 8px',
                        background: '#22c55e',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: viewMode === 'full' ? 12 : 11,
                        fontWeight: 600,
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      Giải quyết
                    </button>
                  )}
                  {item.status !== 'IGNORED' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'IGNORED')}
                      style={{
                        padding: viewMode === 'full' ? '6px 12px' : '4px 8px',
                        background: '#64748b',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: viewMode === 'full' ? 12 : 11,
                        fontWeight: 600,
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      Bỏ qua
                    </button>
                  )}
                  {item.status !== 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'PENDING')}
                      style={{
                        padding: viewMode === 'full' ? '6px 12px' : '4px 8px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 10,
                        fontSize: viewMode === 'full' ? 12 : 11,
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      {viewMode === 'full' ? 'Đặt lại chờ xử lý' : 'Đặt lại'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
