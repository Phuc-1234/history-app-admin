// src/components/content/LessonPanel.tsx
import { useState, useEffect } from 'react';
import client from '../../api/client';
import type { LessonDto, GradeDto, TopicDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { ImageUploadInput } from '../ui/ImageUploadInput';
import { RichTextEditor } from '../ui/RichTextEditor';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconLesson, IconMindMap } from '../ui/Icons';
import flashcardIcon from '../../assets/flashcard_ic.png';
import type { TabId, NavParams } from '../../pages/DashboardPage';

interface LessonPanelProps {
  onToast: (msg: string, type: ToastType) => void;
  navParams?: NavParams;
  onNavigate?: (tab: TabId, params?: NavParams) => void;
}

export function LessonPanel({ onToast, navParams, onNavigate }: LessonPanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<LessonDto | null>(null);
  const [form, setForm] = useState({ name: '', summary: '', position: '', topicId: '', isPro: false, imgUrl: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LessonDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Sequential & Parallel Cascade Select Fetches
  useEffect(() => {
    let isMounted = true;
    const targetGradeId = navParams?.gradeId ? Number(navParams.gradeId) : null;
    const targetTopicId = navParams?.topicId ? Number(navParams.topicId) : null;

    async function loadCascade() {
      try {
        setLoading(true);
        // Fast parallel fetch if targetGradeId is provided
        if (targetGradeId) {
          const [gRes, tRes] = await Promise.all([
            client.get('/api/content/grades'),
            client.get(`/api/content/grades/${targetGradeId}/topics`)
          ]);
          if (!isMounted) return;

          const gs: GradeDto[] = gRes.data.grades ?? [];
          const ts: TopicDto[] = tRes.data.topics ?? [];

          setGrades(gs);
          setTopics(ts);

          setSelectedGradeId(targetGradeId);

          const activeTopicId = targetTopicId && ts.some(t => t.id === targetTopicId)
            ? targetTopicId
            : (ts.length ? ts[0].id : null);

          setSelectedTopicId(activeTopicId);

          if (activeTopicId) {
            const lRes = await client.get(`/api/content/topics/${activeTopicId}/lessons`);
            if (isMounted) {
              setLessons(lRes.data.lessons ?? []);
            }
          } else {
            setLessons([]);
          }
          return;
        }

        // Default load without navParams (direct click on Sidebar)
        const gRes = await client.get('/api/content/grades');
        if (!isMounted) return;
        const gs: GradeDto[] = gRes.data.grades ?? [];
        setGrades(gs);

        const activeGradeId = gs.length ? gs[0].id : null;
        setSelectedGradeId(activeGradeId);

        if (!activeGradeId) {
          setTopics([]);
          setLessons([]);
          setSelectedTopicId(null);
          return;
        }

        const tRes = await client.get(`/api/content/grades/${activeGradeId}/topics`);
        if (!isMounted) return;
        const ts: TopicDto[] = tRes.data.topics ?? [];
        setTopics(ts);

        const activeTopicId = ts.length ? ts[0].id : null;
        setSelectedTopicId(activeTopicId);

        if (!activeTopicId) {
          setLessons([]);
          return;
        }

        const lRes = await client.get(`/api/content/topics/${activeTopicId}/lessons`);
        if (!isMounted) return;
        setLessons(lRes.data.lessons ?? []);

      } catch (err) {
        console.error('Error loading Lesson cascade:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCascade();

    return () => {
      isMounted = false;
    };
  }, [navParams?.gradeId, navParams?.topicId]);

  const handleGradeChange = async (gId: number | null) => {
    setSelectedGradeId(gId);
    if (!gId) {
      setTopics([]);
      setLessons([]);
      setSelectedTopicId(null);
      return;
    }
    try {
      setLoading(true);
      const res = await client.get(`/api/content/grades/${gId}/topics`);
      const ts: TopicDto[] = res.data.topics ?? [];
      setTopics(ts);
      if (ts.length > 0) {
        const firstTopicId = ts[0].id;
        setSelectedTopicId(firstTopicId);
        const lRes = await client.get(`/api/content/topics/${firstTopicId}/lessons`);
        setLessons(lRes.data.lessons ?? []);
      } else {
        setSelectedTopicId(null);
        setLessons([]);
      }
    } catch {
      onToast('Không tải được danh sách chủ đề', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicChange = async (tId: number | null) => {
    setSelectedTopicId(tId);
    if (!tId) {
      setLessons([]);
      return;
    }
    try {
      setLoading(true);
      const res = await client.get(`/api/content/topics/${tId}/lessons`);
      setLessons(res.data.lessons ?? []);
    } catch {
      onToast('Không tải được danh sách bài học', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditLesson(null); setForm({ name: '', summary: '', position: String(lessons.length + 1), topicId: String(selectedTopicId ?? ''), isPro: false, imgUrl: '' }); setModalOpen(true); };
  const openEdit = (l: LessonDto) => { setEditLesson(l); setForm({ name: l.name, summary: l.summary ?? '', position: String(l.position), topicId: String(l.topicId), isPro: !!l.isPro, imgUrl: l.imgUrl ?? '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { onToast('Tên bài học là bắt buộc', 'error'); return; }
    const position = Number(form.position); const topicId = Number(form.topicId);
    if (isNaN(position) || !topicId || position < 0) { onToast('Vị trí phải là số không âm', 'error'); return; }
    try {
      setSaving(true);
      if (editLesson) {
        await client.patch(`/api/admin/lessons/${editLesson.id}`, { name: form.name.trim(), summary: form.summary || undefined, position, topicId, isPro: form.isPro, imgUrl: form.imgUrl.trim() || null });
        onToast('Đã cập nhật bài học', 'success');
      } else {
        await client.post('/api/admin/lessons', { name: form.name.trim(), summary: form.summary || undefined, position, topicId, isPro: form.isPro, imgUrl: form.imgUrl.trim() || null });
        onToast('Đã tạo bài học mới', 'success');
      }
      setModalOpen(false);
      if (selectedTopicId) handleTopicChange(selectedTopicId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu bài học', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/lessons/${deleteTarget.id}`);
      onToast('Đã xóa bài học', 'success');
      setDeleteTarget(null);
      if (selectedTopicId) handleTopicChange(selectedTopicId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa bài học', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Danh sách bài học</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{lessons.length} bài học</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select id="lesson-grade-filter" value={selectedGradeId ?? ''} onChange={(e) => handleGradeChange(Number(e.target.value) || null)} style={filterSelectStyle}>
            {grades.map((g) => <option key={g.id} value={g.id}>Khối {g.id}</option>)}
          </select>
          <select id="lesson-topic-filter" value={selectedTopicId ?? ''} onChange={(e) => handleTopicChange(Number(e.target.value) || null)} style={{ ...filterSelectStyle, maxWidth: 200 }}>
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
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {l.imgUrl && (
                        <img src={l.imgUrl} alt={l.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                      )}
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{l.name}</span>
                      {l.isPro && (
                        <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 800, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#ffffff', borderRadius: 6, textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(245,158,11,0.3)' }}>PRO</span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    {l.summary ? (
                      <div
                        style={{ color: '#64748b', fontSize: 13, maxHeight: '60px', overflow: 'hidden' }}
                        dangerouslySetInnerHTML={{ __html: l.summary }}
                      />
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>—</span>
                    )}
                  </Td>
                  <Td align="right">
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', whiteSpace: 'nowrap' }}>
                      <Button variant="secondary" onClick={() => onNavigate?.('sections', { gradeId: selectedGradeId, topicId: selectedTopicId, lessonId: l.id })} style={{ padding: '6px 12px', fontSize: 13, borderColor: '#c37938', color: '#c37938', borderRadius: 30 }}>Nội dung</Button>
                      <Button variant="secondary" title="Sơ đồ tư duy" aria-label="Sơ đồ tư duy" icon={<IconMindMap size={16} color="#0284c7" />} onClick={() => onNavigate?.('mindmaps', { gradeId: selectedGradeId, topicId: selectedTopicId, lessonId: l.id })} style={{ padding: '6px 10px', fontSize: 13, borderColor: '#0284c7', color: '#0284c7', borderRadius: 30 }} />
                      <Button variant="secondary" title="Thẻ ghi nhớ" aria-label="Thẻ ghi nhớ" icon={<img src={flashcardIcon} alt="Thẻ ghi nhớ" style={{ width: 16, height: 16, objectFit: 'contain' }} />} onClick={() => onNavigate?.('flashcards', { gradeId: selectedGradeId, topicId: selectedTopicId, lessonId: l.id, sectionId: null, nodeId: null })} style={{ padding: '6px 10px', fontSize: 13, borderColor: '#ec4899', color: '#ec4899', borderRadius: 30 }} />
                      <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(l)} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 30 }}>Sửa</Button>
                      <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(l)} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 30 }}>Xóa</Button>
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
        <ImageUploadInput label="Hình ảnh bài học" value={form.imgUrl} onChange={(val) => setForm((f) => ({ ...f, imgUrl: val }))} placeholder="Đường dẫn ảnh hoặc tải lên..." />
        <RichTextEditor label="Tóm tắt (tùy chọn)" value={form.summary} onChange={(val) => setForm((f) => ({ ...f, summary: val }))} placeholder="Mô tả ngắn về bài học..." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Vị trí" type="number" min={0} value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
          <Select label="Chủ đề" value={form.topicId} onChange={(e) => setForm((f) => ({ ...f, topicId: e.target.value }))}>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 6px' }}>
          <input
            type="checkbox"
            id="lesson-is-pro"
            checked={form.isPro}
            onChange={(e) => setForm((f) => ({ ...f, isPro: e.target.checked }))}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <label htmlFor="lesson-is-pro" style={{ fontSize: 14, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
            Chỉ dành cho tài khoản PRO
          </label>
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
