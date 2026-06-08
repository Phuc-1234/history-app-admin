// src/components/content/SectionPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { SectionDto, GradeDto, TopicDto, LessonDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Textarea, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';

interface SectionPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

function flattenSections(sections: SectionDto[], depth = 0): (SectionDto & { depth: number })[] {
  return sections.flatMap((s) => [{ ...s, depth }, ...flattenSections(s.children ?? [], depth + 1)]);
}

export function SectionPanel({ onToast }: SectionPanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<SectionDto | null>(null);
  const [form, setForm] = useState({ name: '', summary: '', position: '', lessonId: '', parentSectionId: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SectionDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    client.get('/api/content/grades').then((r) => { const gs = r.data.grades ?? []; setGrades(gs); if (gs.length) setSelectedGradeId(gs[0].id); });
  }, []);
  useEffect(() => {
    if (!selectedGradeId) return;
    client.get(`/api/content/grades/${selectedGradeId}/topics`).then((r) => { const ts = r.data.topics ?? []; setTopics(ts); setSelectedTopicId(ts.length ? ts[0].id : null); setLessons([]); setSections([]); });
  }, [selectedGradeId]);
  useEffect(() => {
    if (!selectedTopicId) return;
    client.get(`/api/content/topics/${selectedTopicId}/lessons`).then((r) => { const ls = r.data.lessons ?? []; setLessons(ls); setSelectedLessonId(ls.length ? ls[0].id : null); setSections([]); });
  }, [selectedTopicId]);

  const fetchSections = useCallback(async (lessonId: number) => {
    try { setLoading(true); const res = await client.get(`/api/content/lessons/${lessonId}/sections`); setSections(res.data.sections ?? []); }
    catch { onToast('Không tải được danh sách phần', 'error'); }
    finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { if (selectedLessonId) fetchSections(selectedLessonId); }, [selectedLessonId, fetchSections]);

  const allFlat = flattenSections(sections);

  const openCreate = () => { setEditSection(null); setForm({ name: '', summary: '', position: String(sections.length + 1), lessonId: String(selectedLessonId ?? ''), parentSectionId: '' }); setModalOpen(true); };
  const openEdit = (s: SectionDto) => { setEditSection(s); setForm({ name: s.name, summary: s.summary ?? '', position: String(s.position), lessonId: String(s.lessonId), parentSectionId: s.parentSectionId ? String(s.parentSectionId) : '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { onToast('Tên phần là bắt buộc', 'error'); return; }
    const position = Number(form.position); const lessonId = Number(form.lessonId);
    const parentSectionId = form.parentSectionId ? Number(form.parentSectionId) : undefined;
    if (!lessonId) { onToast('Bài học là bắt buộc', 'error'); return; }
    try {
      setSaving(true);
      if (editSection) {
        await client.patch(`/api/admin/sections/${editSection.id}`, { name: form.name.trim(), summary: form.summary || undefined, position, parentSectionId: parentSectionId ?? null });
        onToast('Đã cập nhật phần', 'success');
      } else {
        await client.post('/api/admin/sections', { name: form.name.trim(), summary: form.summary || undefined, position, lessonId, parentSectionId });
        onToast('Đã tạo phần mới', 'success');
      }
      setModalOpen(false);
      if (selectedLessonId) fetchSections(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/sections/${deleteTarget.id}`);
      onToast('Đã xóa phần', 'success');
      setDeleteTarget(null);
      if (selectedLessonId) fetchSections(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Phần</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{allFlat.length} phần</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { id: 'section-grade', value: selectedGradeId, onChange: setSelectedGradeId, items: grades.map(g => ({ value: g.id, label: `Khối ${g.id}` })) },
            { id: 'section-topic', value: selectedTopicId, onChange: setSelectedTopicId, items: topics.map(t => ({ value: t.id, label: t.name })) },
            { id: 'section-lesson', value: selectedLessonId, onChange: setSelectedLessonId, items: lessons.map(l => ({ value: l.id, label: l.name })) },
          ].map(({ id, value, onChange, items }) => (
            <select key={id} id={id} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} style={{ ...filterSelectStyle, maxWidth: 180 }}>
              {items.length === 0 && <option value="">—</option>}
              {items.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          ))}
          <Button icon="+" onClick={openCreate} id="create-section-btn">Thêm Phần</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : allFlat.length === 0 ? (
        <EmptyState message="Chưa có phần nào cho bài học này" />
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <Th>STT</Th><Th>Tên phần</Th><Th>Tóm tắt</Th><Th>Cấp</Th><Th align="right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {allFlat.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', fontWeight: 700, fontSize: 13 }}>
                      {s.position}
                    </span>
                  </Td>
                  <Td><span style={{ color: '#0f172a', fontWeight: 600, paddingLeft: s.depth * 20 }}>{s.depth > 0 ? '└ ' : ''}{s.name}</span></Td>
                  <Td><span style={{ color: '#94a3b8', fontSize: 13 }}>{s.summary ?? '—'}</span></Td>
                  <Td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.depth === 0 ? '#6c63ff' : '#94a3b8', background: s.depth === 0 ? '#f5f3ff' : '#f8fafc', padding: '2px 8px', borderRadius: 6, border: `1px solid ${s.depth === 0 ? '#ddd6fe' : '#e2e8f0'}` }}>
                      {s.depth === 0 ? 'Gốc' : `Cấp ${s.depth}`}
                    </span>
                  </Td>
                  <Td align="right">
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="secondary" onClick={() => openEdit(s)} style={{ padding: '6px 14px', fontSize: 13 }}>✏ Sửa</Button>
                      <Button variant="danger" onClick={() => setDeleteTarget(s)} style={{ padding: '6px 14px', fontSize: 13 }}>🗑 Xóa</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editSection ? 'Sửa Phần' : 'Thêm Phần mới'} onClose={() => setModalOpen(false)}>
        <Input label="Tên phần" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ví dụ: I. Bối cảnh lịch sử" />
        <Textarea label="Tóm tắt (tùy chọn)" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} rows={2} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Vị trí" type="number" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
          <Select label="Phần cha (tùy chọn)" value={form.parentSectionId} onChange={(e) => setForm((f) => ({ ...f, parentSectionId: e.target.value }))}>
            <option value="">— Không có (phần gốc) —</option>
            {allFlat.filter(s => s.id !== editSection?.id).map((s) => (
              <option key={s.id} value={s.id}>{'  '.repeat(s.depth)}{s.name}</option>
            ))}
          </Select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editSection ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Xóa Phần?" message={`Xóa "${deleteTarget?.name}" sẽ xóa toàn bộ nút kiến thức bên trong. Không thể khôi phục.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
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
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>{message}</p>
    </div>
  );
}
