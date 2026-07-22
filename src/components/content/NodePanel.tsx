// src/components/content/NodePanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { NodeDto, GradeDto, TopicDto, LessonDto, SectionDto, AdminVideoDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconNode } from '../ui/Icons';
import { RichTextEditor } from '../ui/RichTextEditor';

const isBodyEmpty = (html: string) => {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
  return text === '';
};

interface NodePanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

function flattenSections(sections: SectionDto[]): SectionDto[] {
  return sections.flatMap((s) => [s, ...flattenSections(s.children ?? [])]);
}

export function NodePanel({ onToast }: NodePanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [nodes, setNodes] = useState<NodeDto[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editNode, setEditNode] = useState<NodeDto | null>(null);
  const [form, setForm] = useState({ header: '', body: '', videoId: '', position: '', sectionId: '' });
  const [videos, setVideos] = useState<AdminVideoDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NodeDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Sequential Cascade Select Fetches
  useEffect(() => {
    let isMounted = true;

    async function loadCascade() {
      try {
        setLoading(true);
        const gRes = await client.get('/api/content/grades');
        if (!isMounted) return;
        const gs: GradeDto[] = gRes.data.grades ?? [];
        setGrades(gs);

        const activeGradeId = gs.length ? gs[0].id : null;
        setSelectedGradeId(activeGradeId);

        if (!activeGradeId) {
          setTopics([]);
          setLessons([]);
          setSections([]);
          setNodes([]);
          setSelectedTopicId(null);
          setSelectedLessonId(null);
          setSelectedSectionId(null);
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
          setSections([]);
          setNodes([]);
          setSelectedLessonId(null);
          setSelectedSectionId(null);
          return;
        }

        const lRes = await client.get(`/api/content/topics/${activeTopicId}/lessons`);
        if (!isMounted) return;
        const ls: LessonDto[] = lRes.data.lessons ?? [];
        setLessons(ls);

        const activeLessonId = ls.length ? ls[0].id : null;
        setSelectedLessonId(activeLessonId);

        if (!activeLessonId) {
          setSections([]);
          setNodes([]);
          setSelectedSectionId(null);
          return;
        }

        const sRes = await client.get(`/api/content/lessons/${activeLessonId}/sections`);
        if (!isMounted) return;
        const ss: SectionDto[] = sRes.data.sections ?? [];
        setSections(ss);
        const flat = flattenSections(ss);

        const activeSectionId = flat.length ? flat[0].id : null;
        setSelectedSectionId(activeSectionId);

        if (activeLessonId && activeSectionId) {
          const treeRes = await client.get(`/api/content/lessons/${activeLessonId}/tree`);
          if (isMounted) {
            const allSections: SectionDto[] = flattenSections(treeRes.data.sections ?? []);
            const selectedSec = allSections.find((s) => s.id === activeSectionId);
            setNodes(selectedSec?.nodes ?? []);
          }
        }
      } catch (err) {
        console.error('NodePanel cascade error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCascade();
    client.get('/api/admin/videos').then((r) => { if (isMounted) setVideos(r.data.videos ?? []); }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGradeChange = async (gId: number | null) => {
    setSelectedGradeId(gId);
    if (!gId) {
      setTopics([]); setLessons([]); setSections([]); setNodes([]);
      setSelectedTopicId(null); setSelectedLessonId(null); setSelectedSectionId(null);
      return;
    }
    try {
      setLoading(true);
      const res = await client.get(`/api/content/grades/${gId}/topics`);
      const ts: TopicDto[] = res.data.topics ?? [];
      setTopics(ts);
      if (ts.length > 0) {
        handleTopicChange(ts[0].id);
      } else {
        setSelectedTopicId(null); setLessons([]); setSections([]); setNodes([]);
        setSelectedLessonId(null); setSelectedSectionId(null);
      }
    } catch { onToast('Không tải được chủ đề', 'error'); }
    finally { setLoading(false); }
  };

  const handleTopicChange = async (tId: number | null) => {
    setSelectedTopicId(tId);
    if (!tId) {
      setLessons([]); setSections([]); setNodes([]);
      setSelectedLessonId(null); setSelectedSectionId(null);
      return;
    }
    try {
      setLoading(true);
      const res = await client.get(`/api/content/topics/${tId}/lessons`);
      const ls: LessonDto[] = res.data.lessons ?? [];
      setLessons(ls);
      if (ls.length > 0) {
        handleLessonChange(ls[0].id);
      } else {
        setSelectedLessonId(null); setSections([]); setNodes([]); setSelectedSectionId(null);
      }
    } catch { onToast('Không tải được bài học', 'error'); }
    finally { setLoading(false); }
  };

  const handleLessonChange = async (lId: number | null) => {
    setSelectedLessonId(lId);
    if (!lId) {
      setSections([]); setNodes([]); setSelectedSectionId(null);
      return;
    }
    try {
      setLoading(true);
      const res = await client.get(`/api/content/lessons/${lId}/sections`);
      const ss: SectionDto[] = res.data.sections ?? [];
      setSections(ss);
      const flat = flattenSections(ss);
      if (flat.length > 0) {
        handleSectionChange(lId, flat[0].id);
      } else {
        setSelectedSectionId(null); setNodes([]);
      }
    } catch { onToast('Không tải được phần bài học', 'error'); }
    finally { setLoading(false); }
  };

  const handleSectionChange = async (lId: number | null, sId: number | null) => {
    setSelectedSectionId(sId);
    if (!lId || !sId) {
      setNodes([]);
      return;
    }
    try {
      setLoading(true);
      const res = await client.get(`/api/content/lessons/${lId}/tree`);
      const allSections: SectionDto[] = flattenSections(res.data.sections ?? []);
      const selectedSec = allSections.find((s) => s.id === sId);
      setNodes(selectedSec?.nodes ?? []);
    } catch { onToast('Không tải được nút kiến thức', 'error'); }
    finally { setLoading(false); }
  };

  const flatSections = flattenSections(sections);

  const openCreate = () => { setEditNode(null); setForm({ header: '', body: '', videoId: '', position: String(nodes.length + 1), sectionId: String(selectedSectionId ?? '') }); setModalOpen(true); };
  const openEdit = (n: NodeDto) => { setEditNode(n); setForm({ header: n.header ?? '', body: n.body, videoId: n.videoId ?? '', position: String(n.position), sectionId: String(n.sectionId ?? '') }); setModalOpen(true); };

  const handleSave = async () => {
    if (isBodyEmpty(form.body)) { onToast('Nội dung (body) là bắt buộc', 'error'); return; }
    const position = Number(form.position); const sectionId = Number(form.sectionId);
    if (!sectionId) { onToast('Phần là bắt buộc', 'error'); return; }
    try {
      setSaving(true);
      const payload = {
        header: form.header || undefined,
        body: form.body.trim(),
        videoId: form.videoId || null,
        position,
        sectionId
      };
      if (editNode) {
        await client.patch(`/api/admin/nodes/${editNode.id}`, payload);
        onToast('Đã cập nhật nút kiến thức', 'success');
      } else {
        await client.post('/api/admin/nodes', payload);
        onToast('Đã tạo nút kiến thức mới', 'success');
      }
      setModalOpen(false);
      if (selectedLessonId && selectedSectionId) handleSectionChange(selectedLessonId, selectedSectionId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/nodes/${deleteTarget.id}`);
      onToast('Đã xóa nút kiến thức', 'success');
      setDeleteTarget(null);
      if (selectedLessonId && selectedSectionId) handleSectionChange(selectedLessonId, selectedSectionId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Nút kiến thức</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{nodes.length} nút</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { id: 'node-grade',   value: selectedGradeId,   onChange: (v: number | null) => handleGradeChange(v),   items: grades.map(g => ({ value: g.id, label: `Khối ${g.id}` })) },
            { id: 'node-topic',   value: selectedTopicId,   onChange: (v: number | null) => handleTopicChange(v),   items: topics.map(t => ({ value: t.id, label: t.name })) },
            { id: 'node-lesson',  value: selectedLessonId,  onChange: (v: number | null) => handleLessonChange(v),  items: lessons.map(l => ({ value: l.id, label: l.name })) },
            { id: 'node-section', value: selectedSectionId, onChange: (v: number | null) => handleSectionChange(selectedLessonId, v), items: flatSections.map(s => ({ value: s.id, label: s.name })) },
          ].map(({ id, value, onChange, items }) => (
            <select key={id} id={id} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value) || null)} style={{ ...filterSelectStyle, maxWidth: 160 }}>
              {items.length === 0 && <option value="">—</option>}
              {items.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          ))}
          <Button icon={<IconPlus size={16} />} onClick={openCreate} id="create-node-btn">Thêm Node</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : nodes.length === 0 ? (
        <EmptyState message="Chưa có nút kiến thức nào cho phần này" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {nodes.sort((a, b) => a.position - b.position).map((n) => (
            <div key={n.id} style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              boxShadow: '0 1px 6px rgba(15,23,42,0.05)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#a5b4fc';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(108,99,255,0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(15,23,42,0.05)';
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c63ff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {n.position}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {n.header && <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{n.header}</div>}
                <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: n.body }} />
                {n.videoId && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#6c63ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>🎥 Video:</span> <span>{videos.find(v => v.id === n.videoId)?.title || n.videoId}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(n)} style={{ padding: '8px' }}></Button>
                <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(n)} style={{ padding: '8px' }}></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={editNode ? 'Sửa Nút kiến thức' : 'Thêm Nút kiến thức mới'} onClose={() => setModalOpen(false)} width={580}>
        <Input label="Tiêu đề (tùy chọn)" value={form.header} onChange={(e) => setForm((f) => ({ ...f, header: e.target.value }))} placeholder="Ví dụ: Nguyên nhân bùng nổ chiến tranh" />
        <RichTextEditor label="Nội dung *" value={form.body} onChange={(val) => setForm((f) => ({ ...f, body: val }))} placeholder="Nội dung chính của nút kiến thức..." />
        <Select label="Video liên kết (tùy chọn)" value={form.videoId} onChange={(e) => setForm((f) => ({ ...f, videoId: e.target.value }))}>
          <option value="">— Không liên kết video —</option>
          {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
        </Select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Vị trí" type="number" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
          <Select label="Phần" value={form.sectionId} onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}>
            {flatSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editNode ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Xóa Nút kiến thức?" message="Xóa nút kiến thức này không thể khôi phục." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

const filterSelectStyle = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#0f172a', padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties;

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <IconNode size={48} color="#94a3b8" />
      </div>
      <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>{message}</p>
    </div>
  );
}
