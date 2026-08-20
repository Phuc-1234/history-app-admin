// src/components/content/SectionPanel.tsx
import { useState, useEffect, useCallback, Fragment } from 'react';
import client from '../../api/client';
import type { SectionDto, GradeDto, TopicDto, LessonDto, NodeDto, AdminVideoDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Textarea, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconSection, IconMindMap } from '../ui/Icons';
import { RichTextEditor } from '../ui/RichTextEditor';
import flashcardIcon from '../../assets/flashcard_ic.png';
import type { TabId, NavParams } from '../../pages/DashboardPage';

const isBodyEmpty = (html: string) => {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
  return text === '';
};

interface SectionPanelProps {
  onToast: (msg: string, type: ToastType) => void;
  navParams?: NavParams;
  onNavigate?: (tab: TabId, params?: NavParams) => void;
}

function flattenSections(sections: SectionDto[], depth = 0): (SectionDto & { depth: number })[] {
  return sections.flatMap((s) => [{ ...s, depth }, ...flattenSections(s.children ?? [], depth + 1)]);
}

export function SectionPanel({ onToast, navParams, onNavigate }: SectionPanelProps) {
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

  // Node Management States
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [editNode, setEditNode] = useState<NodeDto | null>(null);
  const [nodeForm, setNodeForm] = useState({ header: '', body: '', videoId: '', position: '', sectionId: '' });
  const [videos, setVideos] = useState<AdminVideoDto[]>([]);
  const [nodeDeleteTarget, setNodeDeleteTarget] = useState<NodeDto | null>(null);
  const [nodeDeleting, setNodeDeleting] = useState(false);

  // Toggle Nodes State
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<number>>(new Set());

  const toggleSectionNodes = (secId: number) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      return next;
    });
  };

  // 1. Sequential Cascade Select Fetches
  useEffect(() => {
    let isMounted = true;
    const targetGradeId = navParams?.gradeId ? Number(navParams.gradeId) : null;
    const targetTopicId = navParams?.topicId ? Number(navParams.topicId) : null;
    const targetLessonId = navParams?.lessonId ? Number(navParams.lessonId) : null;

    async function loadCascade() {
      try {
        // High-speed parallel fetch if targetGradeId & targetTopicId are provided in navParams
        if (targetGradeId && targetTopicId) {
          const [gRes, tRes, lRes] = await Promise.all([
            client.get('/api/content/grades'),
            client.get(`/api/content/grades/${targetGradeId}/topics`),
            client.get(`/api/content/topics/${targetTopicId}/lessons`)
          ]);
          if (!isMounted) return;

          const gs: GradeDto[] = gRes.data.grades ?? [];
          const ts: TopicDto[] = tRes.data.topics ?? [];
          const ls: LessonDto[] = lRes.data.lessons ?? [];

          setGrades(gs);
          setTopics(ts);
          setLessons(ls);

          setSelectedGradeId(targetGradeId);
          setSelectedTopicId(targetTopicId);

          const activeLessonId = targetLessonId && ls.some(l => l.id === targetLessonId)
            ? targetLessonId
            : (ls.length ? ls[0].id : null);

          setSelectedLessonId(activeLessonId);
          return;
        }

        const gRes = await client.get('/api/content/grades');
        if (!isMounted) return;
        const gs: GradeDto[] = gRes.data.grades ?? [];
        setGrades(gs);

        const activeGradeId = targetGradeId && gs.some(g => g.id === targetGradeId)
          ? targetGradeId
          : (gs.length ? gs[0].id : null);

        setSelectedGradeId(activeGradeId);

        if (!activeGradeId) {
          setTopics([]);
          setLessons([]);
          setSelectedTopicId(null);
          setSelectedLessonId(null);
          return;
        }

        const tRes = await client.get(`/api/content/grades/${activeGradeId}/topics`);
        if (!isMounted) return;
        const ts: TopicDto[] = tRes.data.topics ?? [];
        setTopics(ts);

        const activeTopicId = targetTopicId && ts.some(t => t.id === targetTopicId)
          ? targetTopicId
          : (ts.length ? ts[0].id : null);

        setSelectedTopicId(activeTopicId);

        if (!activeTopicId) {
          setLessons([]);
          setSelectedLessonId(null);
          return;
        }

        const lRes = await client.get(`/api/content/topics/${activeTopicId}/lessons`);
        if (!isMounted) return;
        const ls: LessonDto[] = lRes.data.lessons ?? [];
        setLessons(ls);

        const activeLessonId = targetLessonId && ls.some(l => l.id === targetLessonId)
          ? targetLessonId
          : (ls.length ? ls[0].id : null);

        setSelectedLessonId(activeLessonId);

      } catch (err) {
        console.error('Error loading Section cascade:', err);
      }
    }

    loadCascade();
    client.get('/api/admin/videos').then((r) => { if (isMounted) setVideos(r.data.videos ?? []); }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [navParams?.gradeId, navParams?.topicId, navParams?.lessonId]);

  const handleGradeChange = async (gId: number | null) => {
    setSelectedGradeId(gId);
    if (!gId) {
      setTopics([]);
      setLessons([]);
      setSections([]);
      setSelectedTopicId(null);
      setSelectedLessonId(null);
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
        const ls: LessonDto[] = lRes.data.lessons ?? [];
        setLessons(ls);
        if (ls.length > 0) {
          setSelectedLessonId(ls[0].id);
        } else {
          setSelectedLessonId(null);
          setSections([]);
        }
      } else {
        setSelectedTopicId(null);
        setLessons([]);
        setSelectedLessonId(null);
        setSections([]);
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
      setSections([]);
      setSelectedLessonId(null);
      return;
    }
    try {
      setLoading(true);
      const res = await client.get(`/api/content/topics/${tId}/lessons`);
      const ls: LessonDto[] = res.data.lessons ?? [];
      setLessons(ls);
      if (ls.length > 0) {
        setSelectedLessonId(ls[0].id);
      } else {
        setSelectedLessonId(null);
        setSections([]);
      }
    } catch {
      onToast('Không tải được danh sách bài học', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = useCallback(async (lessonId: number) => {
    try {
      setLoading(true);
      const res = await client.get(`/api/content/lessons/${lessonId}/tree`);
      setSections(res.data.sections ?? []);
    } catch {
      onToast('Không tải được danh sách phần', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (selectedLessonId) {
      fetchSections(selectedLessonId);
    } else {
      setSections([]);
    }
  }, [selectedLessonId, fetchSections]);

  const allFlat = flattenSections(sections);

  const openCreate = () => { setEditSection(null); setForm({ name: '', summary: '', position: String(sections.length + 1), lessonId: String(selectedLessonId ?? ''), parentSectionId: '' }); setModalOpen(true); };
  const openEdit = (s: SectionDto) => { setEditSection(s); setForm({ name: s.name, summary: s.summary ?? '', position: String(s.position), lessonId: String(s.lessonId), parentSectionId: s.parentSectionId ? String(s.parentSectionId) : '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { onToast('Tên phần là bắt buộc', 'error'); return; }
    const position = Number(form.position); const lessonId = Number(form.lessonId);
    const parentSectionId = form.parentSectionId ? Number(form.parentSectionId) : undefined;
    if (isNaN(position) || !lessonId || position < 0) { onToast('Vị trí phải là số không âm', 'error'); return; }
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

  // Node CRUD Handlers
  const openCreateNode = (secId: number) => {
    setEditNode(null);
    const sec = allFlat.find(s => s.id === secId);
    const nextPos = sec && sec.nodes ? sec.nodes.length + 1 : 1;
    setNodeForm({ header: '', body: '', videoId: '', position: String(nextPos), sectionId: String(secId) });
    setNodeModalOpen(true);
  };

  const openEditNode = (n: NodeDto) => {
    setEditNode(n);
    setNodeForm({ header: n.header ?? '', body: n.body, videoId: n.videoId ?? '', position: String(n.position), sectionId: String(n.sectionId ?? '') });
    setNodeModalOpen(true);
  };

  const handleSaveNode = async () => {
    if (isBodyEmpty(nodeForm.body)) { onToast('Nội dung là bắt buộc', 'error'); return; }
    const position = Number(nodeForm.position);
    const sectionId = Number(nodeForm.sectionId);
    if (isNaN(position) || position < 0) { onToast('Vị trí phải là số không âm', 'error'); return; }
    if (!sectionId) { onToast('Phần là bắt buộc', 'error'); return; }
    try {
      setSaving(true);
      const payload = {
        header: nodeForm.header || undefined,
        body: nodeForm.body.trim(),
        videoId: nodeForm.videoId || null,
        position,
        sectionId
      };
      if (editNode) {
        await client.patch(`/api/admin/nodes/${editNode.id}`, { header: payload.header, body: payload.body, videoId: payload.videoId, position, sectionId: payload.sectionId });
        onToast('Đã cập nhật nút kiến thức', 'success');
      } else {
        await client.post('/api/admin/nodes', payload);
        onToast('Đã tạo nút kiến thức mới', 'success');
      }
      setNodeModalOpen(false);
      if (selectedLessonId) fetchSections(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeDeleteTarget) return;
    try {
      setNodeDeleting(true);
      await client.delete(`/api/admin/nodes/${nodeDeleteTarget.id}`);
      onToast('Đã xóa nút kiến thức', 'success');
      setNodeDeleteTarget(null);
      if (selectedLessonId) fetchSections(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa', 'error');
    } finally {
      setNodeDeleting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Nội dung bài học</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{allFlat.length} phần</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { id: 'section-grade', value: selectedGradeId, onChange: (v: number | null) => handleGradeChange(v), items: grades.map(g => ({ value: g.id, label: `Khối ${g.id}` })) },
            { id: 'section-topic', value: selectedTopicId, onChange: (v: number | null) => handleTopicChange(v), items: topics.map(t => ({ value: t.id, label: t.name })) },
            { id: 'section-lesson', value: selectedLessonId, onChange: (v: number | null) => setSelectedLessonId(v), items: lessons.map(l => ({ value: l.id, label: l.name })) },
          ].map(({ id, value, onChange, items }) => (
            <select key={id} id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} style={{ ...filterSelectStyle, maxWidth: 180 }}>
              {items.length === 0 && <option value="">—</option>}
              {items.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          ))}
          {selectedLessonId && (
            <Button
              variant="secondary"
              icon={<IconMindMap size={16} color="#c37938" />}
              onClick={() => onNavigate?.('mindmaps', { gradeId: selectedGradeId, topicId: selectedTopicId, lessonId: selectedLessonId })}
              style={{ borderColor: 'rgba(195, 121, 56, 0.25)', background: 'rgba(195, 121, 56, 0.05)', color: '#c37938', fontWeight: 600 }}
            >
              Sơ đồ tư duy
            </Button>
          )}
          <Button icon={<IconPlus size={16} />} onClick={openCreate} id="create-section-btn">Thêm Phần</Button>
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
              {allFlat.map((s, i) => {
                const hasNodes = s.nodes && s.nodes.length > 0;
                const isExpanded = expandedSectionIds.has(s.id);
                return (
                  <Fragment key={s.id}>
                    <tr style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', fontWeight: 700, fontSize: 13 }}>
                          {s.position}
                        </span>
                      </Td>
                      <Td>
                        <span style={{ color: '#0f172a', fontWeight: 600, paddingLeft: s.depth * 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {s.depth > 0 ? '└ ' : ''}
                          {hasNodes ? (
                            <button
                              onClick={() => toggleSectionNodes(s.id)}
                              style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', cursor: 'pointer', display: 'inline-flex', padding: '2px 4px', borderRadius: 4, alignItems: 'center', fontSize: 10, color: '#10b981', fontWeight: 700 }}
                            >
                              {isExpanded ? '▼ Nút' : '▶ Nút'} ({s.nodes?.length})
                            </button>
                          ) : null}
                          {s.name}
                        </span>
                      </Td>
                      <Td><span style={{ color: '#94a3b8', fontSize: 13 }}>{s.summary ?? '—'}</span></Td>
                      <Td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: s.depth === 0 ? '#c37938' : '#94a3b8', background: s.depth === 0 ? 'rgba(195, 121, 56, 0.06)' : '#f8fafc', padding: '2px 8px', borderRadius: 6, border: `1px solid ${s.depth === 0 ? 'rgba(195, 121, 56, 0.15)' : '#e2e8f0'}` }}>
                          {s.depth === 0 ? 'Gốc' : `Cấp ${s.depth}`}
                        </span>
                      </Td>
                      <Td align="right">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', whiteSpace: 'nowrap' }}>
                          <Button variant="secondary" onClick={() => openCreateNode(s.id)} style={{ padding: '6px 12px', fontSize: 13, borderColor: '#10b981', color: '#10b981', borderRadius: 30 }}>+ Nút</Button>
                          <Button variant="secondary" title="Thẻ lật" aria-label="Thẻ lật" icon={<img src={flashcardIcon} alt="Thẻ lật" style={{ width: 16, height: 16, objectFit: 'contain' }} />} onClick={() => onNavigate?.('flashcards', { gradeId: selectedGradeId, topicId: selectedTopicId, lessonId: selectedLessonId, sectionId: s.id, nodeId: null })} style={{ padding: '6px 10px', fontSize: 13, borderColor: '#ec4899', color: '#ec4899', borderRadius: 30 }} />
                          <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(s)} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 30 }}>Sửa</Button>
                          <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(s)} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 30 }}>Xóa</Button>
                        </div>
                      </Td>
                    </tr>
                    {isExpanded && s.nodes && (
                      <tr>
                        <td colSpan={5} style={{ background: '#f8fafc', padding: '16px 24px', borderLeft: '4px solid #10b981', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Danh sách nút kiến thức</span>
                            </div>
                            {s.nodes.length === 0 ? (
                              <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Chưa có nút kiến thức nào trong phần này.</span>
                            ) : (
                              s.nodes.sort((a, b) => a.position - b.position).map((n) => (
                                <div key={n.id} style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 12,
                                  padding: '14px 18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 16,
                                  boxShadow: '0 2px 6px rgba(15,23,42,0.02)'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#10b981', fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 2 }}>
                                      {n.position}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      {n.header && <strong style={{ display: 'block', fontSize: 14, color: '#0f172a', marginBottom: 4 }}>{n.header}</strong>}
                                      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: n.body }} />
                                      {n.videoId && (
                                        <div style={{ marginTop: 6, fontSize: 11, color: '#c37938', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          🎥 Video: {videos.find(v => v.id === n.videoId)?.title || n.videoId}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                    <Button variant="secondary" title="Thẻ lật" aria-label="Thẻ lật" icon={<img src={flashcardIcon} alt="Thẻ lật" style={{ width: 16, height: 16, objectFit: 'contain' }} />} onClick={() => onNavigate?.('flashcards', { gradeId: selectedGradeId, topicId: selectedTopicId, lessonId: selectedLessonId, sectionId: s.id, nodeId: n.id })} style={{ padding: '6px 10px', fontSize: 13, borderColor: '#ec4899', color: '#ec4899', borderRadius: 30 }} />
                                    <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEditNode(n)} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 30 }}>Sửa</Button>
                                    <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setNodeDeleteTarget(n)} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 30 }}>Xóa</Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editSection ? 'Sửa Phần' : 'Thêm Phần mới'} onClose={() => setModalOpen(false)}>
        <Input label="Tên phần" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ví dụ: I. Bối cảnh lịch sử" />
        <Textarea label="Tóm tắt (tùy chọn)" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} rows={2} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Vị trí" type="number" min={0} value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
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

      {/* Node Create/Edit Modal */}
      <Modal open={nodeModalOpen} title={editNode ? 'Sửa Nút kiến thức' : 'Thêm Nút kiến thức mới'} onClose={() => setNodeModalOpen(false)} width={580}>
        <Input label="Tiêu đề (tùy chọn)" value={nodeForm.header} onChange={(e) => setNodeForm((f) => ({ ...f, header: e.target.value }))} placeholder="Ví dụ: Nguyên nhân bùng nổ chiến tranh" />
        <RichTextEditor label="Nội dung *" value={nodeForm.body} onChange={(val) => setNodeForm((f) => ({ ...f, body: val }))} placeholder="Nội dung chính của nút kiến thức..." />
        <Select label="Video liên kết (tùy chọn)" value={nodeForm.videoId} onChange={(e) => setNodeForm((f) => ({ ...f, videoId: e.target.value }))}>
          <option value="">— Không liên kết video —</option>
          {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
        </Select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Vị trí" type="number" min={0} value={nodeForm.position} onChange={(e) => setNodeForm((f) => ({ ...f, position: e.target.value }))} />
          <Select label="Phần" value={nodeForm.sectionId} onChange={(e) => setNodeForm((f) => ({ ...f, sectionId: e.target.value }))}>
            {allFlat.map((s) => <option key={s.id} value={s.id}>{'  '.repeat(s.depth)}{s.name}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" onClick={() => setNodeModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSaveNode} loading={saving}>{editNode ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      {/* Node Delete Confirmation */}
      <ConfirmDialog open={!!nodeDeleteTarget} title="Xóa Nút kiến thức?" message="Xóa nút kiến thức này không thể khôi phục." onConfirm={handleDeleteNode} onCancel={() => setNodeDeleteTarget(null)} loading={nodeDeleting} />
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
        <IconSection size={48} color="#94a3b8" />
      </div>
      <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>{message}</p>
    </div>
  );
}
