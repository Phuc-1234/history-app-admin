// src/components/content/UserPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { AdminUserDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Spinner } from '../ui/Spinner';
import { IconUser, IconXP, IconGold } from '../ui/Icons';
import { UserStreakCalendarModal } from './UserStreakCalendarModal';

interface UserPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

export function UserPanel({ onToast }: UserPanelProps) {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForCalendar, setSelectedUserForCalendar] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await client.get('/api/admin/users', { params });
      setUsers(res.data.users ?? []);
    } catch {
      onToast('Không tải được danh sách người dùng', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, onToast]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await client.patch(`/api/admin/users/${userId}`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u)));
      onToast('Đã cập nhật vai trò', 'success');
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi cập nhật vai trò', 'error');
    }
  };

  const handleVisibilityChange = async (userId: string, isHidden: boolean) => {
    try {
      await client.patch(`/api/admin/users/${userId}`, { isHidden });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isHidden } : u)));
      onToast('Đã cập nhật trạng thái hiển thị', 'success');
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi cập nhật trạng thái', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Người dùng</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{users.length} tài khoản trong hệ thống</p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, background: '#ffffff', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              outline: 'none',
              fontSize: 14,
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ width: 200 }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              outline: 'none',
              fontSize: 14,
              boxSizing: 'border-box',
              background: '#ffffff'
            }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="STUDENT">STUDENT (Học sinh)</option>
            <option value="ADMIN">ADMIN (Quản trị)</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN (Tối cao)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <IconUser size={48} color="#94a3b8" />
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>Không tìm thấy người dùng phù hợp</p>
        </div>
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <th style={TH_STYLE}>Người dùng</th>
                <th style={TH_STYLE}>Email</th>
                <th style={TH_STYLE}>Vai trò</th>
                <th style={TH_STYLE}>XP / Vàng</th>
                <th style={TH_STYLE}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr
                  key={u.id}
                  className="clickable-row"
                  style={{
                    background: idx % 2 === 0 ? '#ffffff' : '#fafbff',
                    borderTop: '1px solid #f1f5f9'
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'SELECT' || target.tagName === 'OPTION' || target.closest('select')) {
                      return;
                    }
                    setSelectedUserForCalendar({ id: u.id, name: u.name ?? 'Người dùng' });
                  }}
                >
                  <td style={TD_STYLE}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#4338ca'
                      }}>
                        {u.name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={TD_STYLE}>{u.email}</td>
                  <td style={TD_STYLE}>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={INLINE_SELECT_STYLE}
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </td>
                  <td style={TD_STYLE}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2563eb', fontWeight: 600 }}>
                      <IconXP size={14} color="#2563eb" /> {u.totalXp} XP
                    </span>
                    <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#d97706', fontWeight: 600 }}>
                      <IconGold size={14} color="#d97706" /> {u.totalGold}
                    </span>
                  </td>
                  <td style={TD_STYLE}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select
                        value={u.isHidden ? 'true' : 'false'}
                        onChange={(e) => handleVisibilityChange(u.id, e.target.value === 'true')}
                        style={{
                          ...INLINE_SELECT_STYLE,
                          color: u.isHidden ? '#ef4444' : '#16a34a',
                          borderColor: u.isHidden ? '#fca5a5' : '#86efac',
                          background: u.isHidden ? '#fef2f2' : '#f0fdf4'
                        }}
                      >
                        <option value="false">Hiển thị</option>
                        <option value="true">Bị ẩn</option>
                      </select>
                      {u.isVerified ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>✓ Đã xác thực</span>
                      ) : (
                        <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>Chưa xác thực</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUserForCalendar && (
        <UserStreakCalendarModal
          open={!!selectedUserForCalendar}
          userId={selectedUserForCalendar.id}
          userName={selectedUserForCalendar.name}
          onClose={() => setSelectedUserForCalendar(null)}
        />
      )}
    </div>
  );
}

const TH_STYLE = {
  padding: '12px 16px',
  textAlign: 'left' as const,
  fontSize: 12,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const
};

const TD_STYLE = {
  padding: '12px 16px',
  color: '#475569',
  fontSize: 14
};

const INLINE_SELECT_STYLE = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  cursor: 'pointer'
};

