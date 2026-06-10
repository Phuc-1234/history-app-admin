// src/components/content/LessonPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { LessonDto, GradeDto, TopicDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Textarea, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconLesson } from '../ui/Icons';

interface LessonPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

export function LessonPanel({ onToast }: LessonPanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<LessonDto | null>(null);
  const [form, setForm] = useState({ name: '', summary: '', position: '', topicId: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LessonDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    client.get('/api/content/grades').then((r) => {
      const gs = r.data.grades ?? [];
      setGrades(gs);
      if (gs.length) setSelectedGradeId(gs[0].id);
    }).catch(() => onToast('Không tải được khối lớp', 'error'));
  }, [onToast]);

  useEffect(() => {
    if (!selectedGradeId) return;
    client.get(`/api/content/grades/${selectedGradeId}/topics`).then((r) => {
      const ts = r.data.topics ?? [];
      setTopics(ts);
      setSelectedTopicId(ts.length ? ts[0].id : null);
      setLessons([]);
    }).catch(() => onToast('Không tải được chủ đề', 'error'));
  }, [selectedGradeId, onToast]);

  const fetchLessons = useCallback(async (topicId: number) => {
    try {
      setLoading(true);
      const res = await client.get(`/api/content/topics/${topicId}/lessons`);
      setLessons(res.data.lessons ?? []);
    } catch {
      onToast('Không tải được bài học', 'error');
    } finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { if (selectedTopicId) fetchLessons(selectedTopicId); }, [selectedTopicId, fetchLessons]);

  const openCreate = () => { setEditLesson(null); setForm({ name: '', summary: '', position: String(lessons.length + 1), topicId: String(selectedTopicId ?? '') }); setModalOpen(true); };
  const openEdit = (l: LessonDto) => { setEditLesson(l); setForm({ name: l.name, summary: l.summary ?? '', position: String(l.position), topicId: String(l.topicId) }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { onToast('Tên bài học là bắt buộc', 'error'); return; }
    const position = Number(form.position); const topicId = Number(form.topicId);
    if (isNaN(position) || !topicId) { onToast('Dữ liệu không hợp lệ', 'error'); return; }
    try {
      setSaving(true);
      if (editLesson) {
        await client.patch(`/api/admin/lessons/${editLesson.id}`, { name: form.name.trim(), summary: form.summary || undefined, position });
        onToast('Đã cập nhật bài học', 'success');
      } else {
        await client.post('/api/admin/lessons', { name: form.name.trim(), summary: form.summary || undefined, position, topicId });
        onToast('Đã tạo bài học mới', 'success');
      }
      setModalOpen(false);
      if (selectedTopicId) fetchLessons(selectedTopicId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/lessons/${deleteTarget.id}`);
      onToast('Đã xóa bài học', 'success');
      setDeleteTarget(null);
      if (selectedTopicId) fetchLessons(selectedTopicId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Bài học</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{lessons.length} bài học</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select id="lesson-grade-filter" value={selectedGradeId ?? ''} onChange={(e) => setSelectedGradeId(Number(e.target.value))} style={filterSelectStyle}>
            {grades.map((g) => <option key={g.id} value={g.id}>Khối {g.id}</option>)}
          </select>
          <select id="lesson-topic-filter" value={selectedTopicId ?? ''} onChange={(e) => setSelectedTopicId(Number(e.target.value))} style={{ ...filterSelectStyle, maxWidth: 200 }}>
            {topics.length === 0 && <option value="">— Chọn chủ đề —</option>}
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Button icon={<IconPlus size={16} />} onClick={openCreate} id="create-lesson-btn">Thêm Bài học</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : lessons.length === 0 ? (
        <EmptyState message="Chưa có bài học nào cho chủ đề này" />
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <Th>STT</Th><Th>Tên bài học</Th><Th>Tóm tắt</Th><Th align="right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {lessons.sort((a, b) => a.position - b.position).map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontWeight: 700, fontSize: 13 }}>
                      {l.position}
                    </span>
                  </Td>
                  <Td><span style={{ color: '#0f172a', fontWeight: 600 }}>{l.name}</span></Td>
                  <Td><span style={{ color: '#94a3b8', fontSize: 13, fontStyle: l.summary ? 'normal' : 'italic' }}>{l.summary ?? '—'}</span></Td>
                  <Td align="right">
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(l)} style={{ padding: '6px 14px', fontSize: 13 }}>Sửa</Button>
                      <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(l)} style={{ padding: '6px 14px', fontSize: 13 }}>Xóa</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editLesson ? 'Sửa Bài học' : 'Thêm Bài học mới'} onClose={() => setModalOpen(false)}>
        <Input label="Tên bài học" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ví dụ: Bài 1: Cách mạng tháng Tám" />
        <Textarea label="Tóm tắt (tùy chọn)" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Mô tả ngắn về bài học..." rows={3} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Vị trí" type="number" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
          <Select label="Chủ đề" value={form.topicId} onChange={(e) => setForm((f) => ({ ...f, topicId: e.target.value }))} disabled={!!editLesson}>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editLesson ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Xóa Bài học?" message={`Xóa "${deleteTarget?.name}" sẽ xóa toàn bộ phần và nút kiến thức bên trong. Không thể khôi phục.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

const filterSelectStyle = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#0f172a', padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties;
function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ padding: '12px 16px', textAlign: align ?? 'left', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <td style={{ padding: '12px 16px', textAlign: align ?? 'left', color: '#475569' }}>{children}</td>;
}
function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <IconLesson size={48} color="#94a3b8" />
      </div>
      <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>{message}</p>
    </div>
  );
}
