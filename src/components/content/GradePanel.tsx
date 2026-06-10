// src/components/content/GradePanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { GradeDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Badge } from '../ui/Badge';
import { Input, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconGrade } from '../ui/Icons';

interface GradePanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const EMPTY_FORM = { id: '', state: 'PRIVATE' as 'PUBLIC' | 'PRIVATE' };

export function GradePanel({ onToast }: GradePanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGrade, setEditGrade] = useState<GradeDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GradeDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/content/grades');
      setGrades(res.data.grades ?? []);
    } catch {
      onToast('Không tải được danh sách khối lớp', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const openCreate = () => { setEditGrade(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (g: GradeDto) => { setEditGrade(g); setForm({ id: String(g.id), state: g.state }); setModalOpen(true); };

  const handleSave = async () => {
    const id = Number(form.id);
    if (!form.id || isNaN(id)) { onToast('ID khối lớp phải là số hợp lệ', 'error'); return; }
    try {
      setSaving(true);
      if (editGrade) {
        await client.patch(`/api/admin/grades/${editGrade.id}`, { state: form.state });
        onToast(`Đã cập nhật Khối ${editGrade.id}`, 'success');
      } else {
        await client.post('/api/admin/grades', { id, state: form.state });
        onToast(`Đã tạo Khối ${id}`, 'success');
      }
      setModalOpen(false);
      fetchGrades();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/grades/${deleteTarget.id}`);
      onToast(`Đã xóa Khối ${deleteTarget.id}`, 'success');
      setDeleteTarget(null);
      fetchGrades();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Khối lớp</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{grades.length} khối lớp</p>
        </div>
        <Button icon={<IconPlus size={16} />} onClick={openCreate} id="create-grade-btn">Thêm Khối lớp</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : grades.length === 0 ? (
        <EmptyState message="Chưa có khối lớp nào" />
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <Th>ID</Th>
                <Th>Trạng thái</Th>
                <Th align="right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => (
                <tr key={g.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                      <span style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f3ff', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconGrade size={18} color="#6c63ff" />
                      </span>
                      Khối {g.id}
                    </span>
                  </Td>
                  <Td><Badge value={g.state} /></Td>
                  <Td align="right">
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(g)} style={{ padding: '6px 14px', fontSize: 13 }}>Sửa</Button>
                      <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(g)} style={{ padding: '6px 14px', fontSize: 13 }}>Xóa</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editGrade ? `Sửa Khối ${editGrade.id}` : 'Thêm Khối lớp mới'} onClose={() => setModalOpen(false)}>
        <Input label="ID Khối lớp" type="number" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} placeholder="Ví dụ: 10" disabled={!!editGrade} hint={editGrade ? 'ID không thể thay đổi' : 'Thường là 10, 11, hoặc 12'} />
        <Select label="Trạng thái" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value as 'PUBLIC' | 'PRIVATE' }))}>
          <option value="PRIVATE">PRIVATE — Ẩn với học sinh</option>
          <option value="PUBLIC">PUBLIC — Hiển thị công khai</option>
        </Select>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editGrade ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title={`Xóa Khối ${deleteTarget?.id}?`} message={`Hành động này sẽ xóa toàn bộ chủ đề, bài học và nội dung bên trong Khối ${deleteTarget?.id}. Không thể khôi phục.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' | 'left' }) {
  return <th style={{ padding: '12px 16px', textAlign: align ?? 'left', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: 'right' | 'left' }) {
  return <td style={{ padding: '12px 16px', textAlign: align ?? 'left', color: '#475569' }}>{children}</td>;
}
function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <IconGrade size={48} color="#94a3b8" />
      </div>
      <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>{message}</p>
    </div>
  );
}
