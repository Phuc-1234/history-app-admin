// src/components/content/TopicPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { TopicDto, GradeDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';

interface TopicPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const EMPTY_FORM = { name: '', position: '', gradeId: '' };

export function TopicPanel({ onToast }: TopicPanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTopic, setEditTopic] = useState<TopicDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TopicDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    client.get('/api/content/grades').then((r) => {
      const gs = r.data.grades ?? [];
      setGrades(gs);
      if (gs.length > 0) setSelectedGradeId(gs[0].id);
    }).catch(() => onToast('Không tải được danh sách khối lớp', 'error'));
  }, [onToast]);

  const fetchTopics = useCallback(async (gradeId: number) => {
    try {
      setLoading(true);
      const res = await client.get(`/api/content/grades/${gradeId}/topics`);
      setTopics(res.data.topics ?? []);
    } catch {
      onToast('Không tải được danh sách chủ đề', 'error');
    } finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { if (selectedGradeId) fetchTopics(selectedGradeId); }, [selectedGradeId, fetchTopics]);

  const openCreate = () => { setEditTopic(null); setForm({ name: '', position: String(topics.length + 1), gradeId: String(selectedGradeId ?? '') }); setModalOpen(true); };
  const openEdit = (t: TopicDto) => { setEditTopic(t); setForm({ name: t.name, position: String(t.position), gradeId: String(t.gradeId) }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { onToast('Tên chủ đề là bắt buộc', 'error'); return; }
    const position = Number(form.position); const gradeId = Number(form.gradeId);
    if (isNaN(position) || isNaN(gradeId)) { onToast('Dữ liệu không hợp lệ', 'error'); return; }
    try {
      setSaving(true);
      if (editTopic) {
        await client.patch(`/api/admin/topics/${editTopic.id}`, { name: form.name.trim(), position });
        onToast('Đã cập nhật chủ đề', 'success');
      } else {
        await client.post('/api/admin/topics', { name: form.name.trim(), position, gradeId });
        onToast('Đã tạo chủ đề mới', 'success');
      }
      setModalOpen(false);
      if (selectedGradeId) fetchTopics(selectedGradeId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/topics/${deleteTarget.id}`);
      onToast('Đã xóa chủ đề', 'success');
      setDeleteTarget(null);
      if (selectedGradeId) fetchTopics(selectedGradeId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Chủ đề</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{topics.length} chủ đề</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select id="topic-grade-filter" value={selectedGradeId ?? ''} onChange={(e) => setSelectedGradeId(Number(e.target.value))} style={filterSelectStyle}>
            {grades.map((g) => <option key={g.id} value={g.id}>Khối {g.id}</option>)}
          </select>
          <Button icon="+" onClick={openCreate} id="create-topic-btn">Thêm Chủ đề</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : topics.length === 0 ? (
        <EmptyState message="Chưa có chủ đề nào cho khối lớp này" />
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <Th>Vị trí</Th><Th>Tên chủ đề</Th><Th>Khối lớp</Th><Th align="right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {topics.sort((a, b) => a.position - b.position).map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#6c63ff', fontWeight: 700, fontSize: 13 }}>
                      {t.position}
                    </span>
                  </Td>
                  <Td><span style={{ color: '#0f172a', fontWeight: 600 }}>{t.name}</span></Td>
                  <Td><span style={{ color: '#6c63ff', fontWeight: 600, fontSize: 13 }}>Khối {t.gradeId}</span></Td>
                  <Td align="right">
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="secondary" onClick={() => openEdit(t)} style={{ padding: '6px 14px', fontSize: 13 }}>✏ Sửa</Button>
                      <Button variant="danger" onClick={() => setDeleteTarget(t)} style={{ padding: '6px 14px', fontSize: 13 }}>🗑 Xóa</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editTopic ? 'Sửa Chủ đề' : 'Thêm Chủ đề mới'} onClose={() => setModalOpen(false)}>
        <Input label="Tên chủ đề" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ví dụ: Việt Nam thời phong kiến" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Vị trí" type="number" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="1" />
          <Select label="Khối lớp" value={form.gradeId} onChange={(e) => setForm((f) => ({ ...f, gradeId: e.target.value }))} disabled={!!editTopic}>
            {grades.map((g) => <option key={g.id} value={g.id}>Khối {g.id}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editTopic ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Xóa Chủ đề?" message={`Xóa "${deleteTarget?.name}" sẽ xóa toàn bộ bài học và nội dung bên trong. Không thể khôi phục.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

const filterSelectStyle = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#0f172a', padding: '9px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties;

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ padding: '12px 16px', textAlign: align ?? 'left', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <td style={{ padding: '12px 16px', textAlign: align ?? 'left', color: '#475569' }}>{children}</td>;
}
function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>{message}</p>
    </div>
  );
}
