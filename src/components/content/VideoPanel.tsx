// src/components/content/VideoPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { AdminVideoDto, GradeDto, TopicDto, LessonDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select, Textarea } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconVideo } from '../ui/Icons';

interface VideoPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const EMPTY_FORM = {
  title: '',
  position: '',
  summary: '',
  hlsUrl: '',
  lessonId: ''
};

export function VideoPanel({ onToast }: VideoPanelProps) {
  const [videos, setVideos] = useState<AdminVideoDto[]>([]);
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<AdminVideoDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminVideoDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states for cascading dropdowns inside Modal
  const [formTopics, setFormTopics] = useState<TopicDto[]>([]);
  const [formLessons, setFormLessons] = useState<LessonDto[]>([]);
  const [formGradeId, setFormGradeId] = useState<string>('');
  const [formTopicId, setFormTopicId] = useState<string>('');

  // 1. Fetch grades on mount
  useEffect(() => {
    client.get('/api/content/grades').then((r) => {
      const gs = r.data.grades ?? [];
      setGrades(gs);
      if (gs.length) setSelectedGradeId(gs[0].id);
    }).catch(() => onToast('Không tải được danh sách khối lớp', 'error'));
  }, [onToast]);

  // 2. Fetch topics when selectedGradeId changes
  useEffect(() => {
    if (!selectedGradeId) return;
    client.get(`/api/content/grades/${selectedGradeId}/topics`).then((r) => {
      const ts = r.data.topics ?? [];
      setTopics(ts);
      setSelectedTopicId(ts.length ? ts[0].id : null);
      setLessons([]);
      setSelectedLessonId(null);
    }).catch(() => onToast('Không tải được danh sách chủ đề', 'error'));
  }, [selectedGradeId, onToast]);

  // 3. Fetch lessons when selectedTopicId changes
  useEffect(() => {
    if (!selectedTopicId) return;
    client.get(`/api/content/topics/${selectedTopicId}/lessons`).then((r) => {
      const ls = r.data.lessons ?? [];
      setLessons(ls);
      setSelectedLessonId(ls.length ? ls[0].id : null);
    }).catch(() => onToast('Không tải được danh sách bài học', 'error'));
  }, [selectedTopicId, onToast]);

  // 4. Fetch videos when selectedLessonId changes (for list filtering)
  const fetchVideos = useCallback(async (lessonId: number) => {
    try {
      setLoading(true);
      const res = await client.get('/api/admin/videos', { params: { lessonId } });
      setVideos(res.data.videos ?? []);
    } catch {
      onToast('Không tải được danh sách video bài học', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (selectedLessonId) fetchVideos(selectedLessonId);
    else setVideos([]);
  }, [selectedLessonId, fetchVideos]);

  // Manage cascading dropdowns inside create/edit Modal
  useEffect(() => {
    if (!formGradeId) {
      setFormTopics([]);
      setFormLessons([]);
      return;
    }
    client.get(`/api/content/grades/${formGradeId}/topics`).then((r) => {
      const ts = r.data.topics ?? [];
      setFormTopics(ts);
      if (ts.length) {
        setFormTopicId(String(ts[0].id));
      } else {
        setFormTopicId('');
        setFormLessons([]);
      }
    });
  }, [formGradeId]);

  useEffect(() => {
    if (!formTopicId) {
      setFormLessons([]);
      return;
    }
    client.get(`/api/content/topics/${formTopicId}/lessons`).then((r) => {
      const ls = r.data.lessons ?? [];
      setFormLessons(ls);
      if (ls.length) {
        setForm((f) => ({ ...f, lessonId: String(ls[0].id) }));
      } else {
        setForm((f) => ({ ...f, lessonId: '' }));
      }
    });
  }, [formTopicId]);

  const openCreate = () => {
    setEditVideo(null);
    setForm(EMPTY_FORM);
    if (grades.length) {
      setFormGradeId(String(selectedGradeId ?? grades[0].id));
      setFormTopicId(String(selectedTopicId ?? ''));
      setForm((f) => ({ ...f, lessonId: String(selectedLessonId ?? '') }));
    }
    setModalOpen(true);
  };

  const openEdit = (v: AdminVideoDto) => {
    setEditVideo(v);
    setForm({
      title: v.title,
      position: String(v.position),
      summary: v.summary ?? '',
      hlsUrl: v.hlsUrl,
      lessonId: String(v.lessonId ?? '')
    });

    // Auto select containing hierarchy
    if (v.lessonId) {
      // Find lesson
      client.get(`/api/content/lessons/${v.lessonId}/sections`).then(async () => {
        // We need to resolve what grade/topic this lesson belongs to
        // An easier way is lookup in existing filters if they match
        // Or fetch lesson details from backend to see topicId
        try {
          const lRes = await client.get(`/api/content/lessons/${v.lessonId}`);
          const lesson = lRes.data.lesson;
          if (lesson) {
            const tRes = await client.get(`/api/content/topics/${lesson.topicId}`);
            const topic = tRes.data.topic;
            if (topic) {
              setFormGradeId(String(topic.gradeId));
              // Allow some time for useEffects to populate
              setTimeout(() => {
                setFormTopicId(String(lesson.topicId));
                setTimeout(() => {
                  setForm((f) => ({ ...f, lessonId: String(v.lessonId) }));
                }, 100);
              }, 100);
            }
          }
        } catch {
          // ignore error
        }
      });
    }

    setModalOpen(true);
  };

  const handleSave = async () => {
    const pos = Number(form.position);
    const lessonId = Number(form.lessonId);
    if (!form.title || !form.hlsUrl || isNaN(pos) || pos < 0 || !form.lessonId || isNaN(lessonId)) {
      onToast('Vui lòng điền đầy đủ thông tin hợp lệ (vị trí phải không âm)', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        position: pos,
        summary: form.summary || null,
        hlsUrl: form.hlsUrl,
        lessonId: lessonId
      };

      if (editVideo) {
        await client.patch(`/api/admin/videos/${editVideo.id}`, payload);
        onToast(`Đã cập nhật video ${form.title}`, 'success');
      } else {
        await client.post('/api/admin/videos', payload);
        onToast(`Đã tạo video ${form.title}`, 'success');
      }
      setModalOpen(false);
      if (selectedLessonId) fetchVideos(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu video', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/videos/${deleteTarget.id}`);
      onToast(`Đã xóa video ${deleteTarget.title}`, 'success');
      setDeleteTarget(null);
      if (selectedLessonId) fetchVideos(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa video', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Video bài học</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{videos.length} video trong bài học hiện tại</p>
        </div>
        <Button icon={<IconPlus size={16} />} onClick={openCreate} disabled={!selectedLessonId}>Thêm Video</Button>
      </div>

      {/* Hierarchy filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, background: '#ffffff', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Khối lớp</label>
          <select
            value={selectedGradeId ?? ''}
            onChange={(e) => setSelectedGradeId(Number(e.target.value))}
            style={FILTER_SELECT_STYLE}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>Khối {g.id}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Chủ đề</label>
          <select
            value={selectedTopicId ?? ''}
            onChange={(e) => setSelectedTopicId(Number(e.target.value))}
            disabled={!topics.length}
            style={FILTER_SELECT_STYLE}
          >
            {topics.length === 0 ? <option value="">Chưa có chủ đề</option> : null}
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Bài học</label>
          <select
            value={selectedLessonId ?? ''}
            onChange={(e) => setSelectedLessonId(Number(e.target.value))}
            disabled={!lessons.length}
            style={FILTER_SELECT_STYLE}
          >
            {lessons.length === 0 ? <option value="">Chưa có bài học</option> : null}
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : !selectedLessonId ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <IconVideo size={48} color="#94a3b8" />
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>Vui lòng chọn bài học để xem danh sách video</p>
        </div>
      ) : videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <IconVideo size={48} color="#94a3b8" />
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>Chưa có video nào trong bài học này</p>
        </div>
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <th style={TH_STYLE}>Vị trí</th>
                <th style={TH_STYLE}>Tiêu đề video</th>
                <th style={TH_STYLE}>Liên kết phát HLS (m3u8)</th>
                <th style={TH_STYLE}>Mô tả tóm tắt</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v, idx) => (
                <tr key={v.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...TD_STYLE, fontWeight: 700, width: 80 }}>{v.position}</td>
                  <td style={{ ...TD_STYLE, fontWeight: 600, color: '#0f172a' }}>{v.title}</td>
                  <td style={{ ...TD_STYLE, fontSize: 13, fontFamily: 'monospace', color: '#6c63ff', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.hlsUrl}
                  </td>
                  <td style={{ ...TD_STYLE, color: '#64748b', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.summary ?? '—'}
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(v)} style={{ padding: '6px 12px', fontSize: 13 }}>Sửa</Button>
                      <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(v)} style={{ padding: '6px 12px', fontSize: 13 }}>Xóa</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} title={editVideo ? `Sửa video: ${editVideo.title}` : 'Thêm video mới'} onClose={() => setModalOpen(false)}>
        {!editVideo && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Select label="Khối lớp" value={formGradeId} onChange={(e) => setFormGradeId(e.target.value)}>
                {grades.map(g => (
                  <option key={g.id} value={g.id}>Khối {g.id}</option>
                ))}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Chủ đề" value={formTopicId} onChange={(e) => setFormTopicId(e.target.value)} disabled={!formTopics.length}>
                {!formTopics.length && <option value="">Không có chủ đề</option>}
                {formTopics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Bài học liên kết" value={form.lessonId} onChange={(e) => setForm((f) => ({ ...f, lessonId: e.target.value }))} disabled={!formLessons.length}>
                {!formLessons.length && <option value="">Không có bài học</option>}
                {formLessons.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </div>
          </div>
        )}

        <Input label="Tiêu đề video" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ví dụ: Đoạn trích trận đánh Rạch Gầm - Xoài Mút" />
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <Input label="Vị trí hiển thị" type="number" min={0} value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="Ví dụ: 1" />
          </div>
          <div style={{ flex: 3 }}>
            <Input label="Đường dẫn phát (HLS HLS .m3u8)" value={form.hlsUrl} onChange={(e) => setForm((f) => ({ ...f, hlsUrl: e.target.value }))} placeholder="https://example.com/stream/video.m3u8" />
          </div>
        </div>

        <Textarea label="Tóm tắt nội dung video" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Mô tả tóm tắt nội dung video lịch sử..." />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editVideo ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Xóa video bài học?`}
        message={`Bạn có chắc chắn muốn xóa video "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

const FILTER_SELECT_STYLE = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  outline: 'none',
  fontSize: 14,
  boxSizing: 'border-box' as const,
  background: '#ffffff'
};

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
