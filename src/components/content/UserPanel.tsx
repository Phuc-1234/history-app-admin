// src/components/content/UserPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { AdminUserDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { Badge } from '../ui/Badge';
import { IconEdit, IconDelete, IconUser, IconXP, IconGold } from '../ui/Icons';

interface UserPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const EMPTY_FORM = {
  role: 'STUDENT',
  isHidden: false,
  isVerified: false,
  totalXp: '0',
  totalGold: '0'
};

export function UserPanel({ onToast }: UserPanelProps) {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserDto | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const openEdit = (u: AdminUserDto) => {
    setEditUser(u);
    setForm({
      role: u.role,
      isHidden: u.isHidden,
      isVerified: u.isVerified,
      totalXp: String(u.totalXp),
      totalGold: String(u.totalGold)
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editUser) return;
    try {
      setSaving(true);
      await client.patch(`/api/admin/users/${editUser.id}`, {
        role: form.role,
        isHidden: form.isHidden,
        isVerified: form.isVerified,
        totalXp: Number(form.totalXp),
        totalGold: Number(form.totalGold)
      });
      onToast(`Đã cập nhật người dùng ${editUser.name}`, 'success');
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu người dùng', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/users/${deleteTarget.id}`);
      onToast(`Đã xóa người dùng ${deleteTarget.name}`, 'success');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa người dùng', 'error');
    } finally {
      setDeleting(false);
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
                <th style={{ ...TH_STYLE, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
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
                    <Badge value={u.role} />
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
                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.isHidden && <span style={{ background: '#fee2e2', color: '#ef4444', fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>Bị ẩn</span>}
                      {u.isVerified ? 
                        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>✓ Đã xác thực</span> :
                        <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>Chưa xác thực</span>
                      }
                    </div>
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(u)} style={{ padding: '6px 12px', fontSize: 13 }}>Sửa</Button>
                      <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(u)} style={{ padding: '6px 12px', fontSize: 13 }}>Xóa</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      <Modal open={modalOpen} title={`Chỉnh sửa: ${editUser?.name}`} onClose={() => setModalOpen(false)}>
        <Select label="Vai trò" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          <option value="STUDENT">STUDENT — Học sinh</option>
          <option value="ADMIN">ADMIN — Quản trị viên</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN — Quản trị cấp tối cao</option>
        </Select>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <Select label="Ẩn tài khoản" value={form.isHidden ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, isHidden: e.target.value === 'true' }))}>
              <option value="false">Không ẩn (Hiển thị)</option>
              <option value="true">Ẩn tài khoản</option>
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Xác thực email" value={form.isVerified ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, isVerified: e.target.value === 'true' }))}>
              <option value="false">Chưa xác thực</option>
              <option value="true">Đã xác thực</option>
            </Select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <Input label="Tổng điểm XP" type="number" value={form.totalXp} onChange={(e) => setForm((f) => ({ ...f, totalXp: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Tổng số Vàng" type="number" value={form.totalGold} onChange={(e) => setForm((f) => ({ ...f, totalGold: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>Lưu thay đổi</Button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Xóa tài khoản: ${deleteTarget?.name}?`}
        message={`Cảnh báo: Hành động này sẽ xóa vĩnh viễn tài khoản người dùng ${deleteTarget?.email} khỏi cơ sở dữ liệu và Supabase Auth. Dữ liệu tiến trình học và các tương tác của họ cũng sẽ bị mất.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
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
