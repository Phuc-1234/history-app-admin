// src/components/dashboard/AiUsagePanel.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import client from '../../api/client';
import type { AiUsageStatsResponse } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';

interface AiUsagePanelProps {
  onToast?: (message: string, type?: ToastType) => void;
}


type TimeSpanOption = '7' | '30' | '90' | 'all' | 'custom';

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

function formatFullNumber(num: number): string {
  return num.toLocaleString('vi-VN');
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
  fontSize: 13,
  background: '#ffffff',
  padding: '10px 14px',
};

export function AiUsagePanel({ onToast }: AiUsagePanelProps) {
  const [timeSpan, setTimeSpan] = useState<TimeSpanOption>('30');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AiUsageStatsResponse | null>(null);
  const [searchUser, setSearchUser] = useState<string>('');

  const fetchAiStats = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (timeSpan === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      } else {
        params.days = timeSpan;
      }

      if (selectedUserId) {
        params.userId = selectedUserId;
      }

      const res = await client.get('/api/admin/stats/ai-usage', { params });
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch AI token stats:', err);
      onToast?.(err?.response?.data?.error || 'Không thể tải thống kê AI token', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiStats();
  }, [timeSpan, selectedUserId]);

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      fetchAiStats();
    }
  };

  // Filter rankings by user search query
  const filteredRankings = useMemo(() => {
    if (!data?.rankings) return [];
    if (!searchUser.trim()) return data.rankings;

    const q = searchUser.toLowerCase().trim();
    return data.rankings.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        r.userId.toLowerCase().includes(q)
    );
  }, [data?.rankings, searchUser]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header & Filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: '#ffffff',
          padding: '20px 24px',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6c63ff, #4f46e5)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 18,
                boxShadow: '0 4px 12px rgba(108,99,255,0.3)',
              }}
            >
              ✨
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
                Thống kê tiêu thụ AI Token
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                Theo dõi lượng token tiêu thụ theo thời gian & bảng xếp hạng người dùng
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {/* Time Span Filter Pills */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: 3,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            {[
              { id: '7', label: '7 ngày' },
              { id: '30', label: '30 ngày' },
              { id: '90', label: '90 ngày' },
              { id: 'all', label: 'Tất cả' },
              { id: 'custom', label: 'Tùy chọn' },
            ].map((opt) => {
              const active = timeSpan === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTimeSpan(opt.id as TimeSpanOption)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 9,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#4f46e5' : '#64748b',
                    background: active ? '#ffffff' : 'transparent',
                    boxShadow: active ? '0 2px 6px rgba(15,23,42,0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* User Selector Dropdown (Optional Filter) */}
          {data?.rankings && data.rankings.length > 0 && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                color: '#0f172a',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Tất cả người dùng</option>
              {data.rankings.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name} ({formatNumber(u.tokensInPeriod)} tokens)
                </option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchAiStats}
            title="Tải lại dữ liệu"
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Custom Date Picker Range Form */}
      {timeSpan === 'custom' && (
        <form
          onSubmit={handleCustomDateSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#ffffff',
            padding: '14px 20px',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            width: 'fit-content',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Từ ngày:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Đến ngày:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#6c63ff',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Áp dụng
          </button>
        </form>
      )}

      {loading ? (
        <div
          style={{
            background: '#ffffff',
            padding: 40,
            borderRadius: 20,
            textAlign: 'center',
            color: '#64748b',
            border: '1px solid #e2e8f0',
          }}
        >
          Đang tải dữ liệu tiêu thụ AI token...
        </div>
      ) : !data ? (
        <div
          style={{
            background: '#ffffff',
            padding: 40,
            borderRadius: 20,
            textAlign: 'center',
            color: '#ef4444',
            border: '1px solid #fee2e2',
          }}
        >
          Không thể lấy thông tin thống kê.
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
                padding: '20px 24px',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tổng AI Tokens
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#6c63ff', margin: '8px 0 4px' }}>
                {formatFullNumber(data.summary.totalTokensInPeriod)}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {selectedUserId ? 'Của người dùng chọn' : 'Trong khoảng thời gian'}
              </div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
                padding: '20px 24px',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Số User dùng AI
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', margin: '8px 0 4px' }}>
                {data.summary.activeUsersCount}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Người dùng có phát sinh token</div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
                padding: '20px 24px',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Token Trung Bình / User
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0284c7', margin: '8px 0 4px' }}>
                {formatNumber(data.summary.avgTokensPerUser)}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Trung bình mỗi active user</div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
                padding: '20px 24px',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Top User Cao Nhất
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706', margin: '8px 0 4px' }}>
                {formatNumber(data.summary.topUserTokens)}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Kỷ kỷ lục tiêu thụ token</div>
            </div>
          </div>

          {/* AI Token Usage Area Chart */}
          <div
            style={{
              background: '#ffffff',
              padding: '24px 28px',
              borderRadius: 20,
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Biểu đồ tiêu thụ Token theo ngày
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  {data.summary.startStr && data.summary.endStr
                    ? `Từ ${data.summary.startStr} đến ${data.summary.endStr}`
                    : 'Tất cả các ngày có dữ liệu'}
                </p>
              </div>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              {data.timeSeries.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: 14,
                  }}
                >
                  Chưa có dữ liệu tiêu thụ token trong khoảng thời gian này.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6c63ff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => formatNumber(val)}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: any) => [formatFullNumber(Number(value)) + ' tokens', 'Token tiêu thụ']}
                      labelFormatter={(label) => `Ngày: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalTokens"
                      stroke="#6c63ff"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTokens)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* User Ranking Table */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Bảng xếp hạng tiêu thụ AI Token
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  Danh sách người dùng xếp theo tổng số token tiêu thụ trong khoảng thời gian đã chọn
                </p>
              </div>

              {/* User Search Bar */}
              <div style={{ position: 'relative', width: 260 }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên/email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 14px 8px 34px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: 14,
                  }}
                >
                  🔍
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px', width: 60, textAlign: 'center' }}>Hạng</th>
                    <th style={{ padding: '12px 16px' }}>Người dùng</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Vai trò</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Số Session AI</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Token (Giai đoạn)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Token (Tất cả)</th>
                    <th style={{ padding: '12px 16px', width: 140 }}>Tỷ lệ tiêu thụ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRankings.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                        Không tìm thấy người dùng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredRankings.map((user) => {
                      const isTop1 = user.rank === 1;
                      const isTop2 = user.rank === 2;
                      const isTop3 = user.rank === 3;

                      return (
                        <tr
                          key={user.userId}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Rank */}
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>
                            {isTop1 ? (
                              <span style={{ fontSize: 16 }} title="Hạng 1">🥇</span>
                            ) : isTop2 ? (
                              <span style={{ fontSize: 16 }} title="Hạng 2">🥈</span>
                            ) : isTop3 ? (
                              <span style={{ fontSize: 16 }} title="Hạng 3">🥉</span>
                            ) : (
                              <span style={{ color: '#64748b' }}>#{user.rank}</span>
                            )}
                          </td>

                          {/* User Details */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <img
                                src={user.profileImgUrl || 'https://via.placeholder.com/40'}
                                alt={user.name}
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 10,
                                  objectFit: 'cover',
                                  border: user.isPro ? '2px solid #eab308' : '1px solid #e2e8f0',
                                }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{user.name}</span>
                                  {user.isPro && (
                                    <span
                                      style={{
                                        background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                                        color: '#ffffff',
                                        fontSize: 10,
                                        fontWeight: 800,
                                        padding: '2px 6px',
                                        borderRadius: 6,
                                        letterSpacing: '0.05em',
                                      }}
                                    >
                                      PRO
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  {user.email || user.userId}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                background:
                                  user.role === 'SUPER_ADMIN'
                                    ? '#fef2f2'
                                    : user.role === 'ADMIN'
                                    ? '#f0fdf4'
                                    : '#f1f5f9',
                                color:
                                  user.role === 'SUPER_ADMIN'
                                    ? '#ef4444'
                                    : user.role === 'ADMIN'
                                    ? '#16a34a'
                                    : '#64748b',
                              }}
                            >
                              {user.role}
                            </span>
                          </td>

                          {/* Sessions */}
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                            {user.sessionCount}
                          </td>

                          {/* Period Tokens */}
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#4f46e5' }}>
                            {formatFullNumber(user.tokensInPeriod)}
                          </td>

                          {/* All time Tokens */}
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>
                            {formatFullNumber(user.tokensAllTime)}
                          </td>

                          {/* Usage share % bar */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(100, user.sharePercent)}%`,
                                    background: 'linear-gradient(90deg, #6c63ff, #4f46e5)',
                                    borderRadius: 3,
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', width: 36, textAlign: 'right' }}>
                                {user.sharePercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
