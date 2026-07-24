// src/components/content/FlashcardPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { FlashcardDto, GradeDto, TopicDto, LessonDto, SectionDto, NodeDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Textarea, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconFlashcard, IconMagicWand, IconAlert } from '../ui/Icons';
import type { TabId, NavParams } from '../../pages/DashboardPage';

interface FlashcardPanelProps {
  onToast: (msg: string, type: ToastType) => void;
  navParams?: NavParams;
  onNavigate?: (tab: TabId, params?: NavParams) => void;
}

export function FlashcardPanel({ onToast, navParams, onNavigate: _onNavigate }: FlashcardPanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [nodes, setNodes] = useState<NodeDto[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardDto[]>([]);

  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCard, setEditCard] = useState<FlashcardDto | null>(null);
  const [form, setForm] = useState({ frontText: '', backText: '', sectionId: '', nodeId: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlashcardDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreviewList, setAiPreviewList] = useState<{ frontText: string; backText: string }[]>([]);
  const [aiSaveConfirmOpen, setAiSaveConfirmOpen] = useState(false);

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
        console.error('Error loading Flashcard cascade:', err);
      }
    }

    loadCascade();

    return () => {
      isMounted = false;
    };
  }, [navParams?.gradeId, navParams?.topicId, navParams?.lessonId]);

  const fetchFlashcards = useCallback(async (lessonId: number) => {
    try {
      setLoading(true);
      const res = await client.get(`/api/admin/flashcards?lessonId=${lessonId}`);
      setFlashcards(res.data.flashcards ?? []);
    } catch {
      onToast('Không tải được danh sách thẻ ghi nhớ', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (selectedLessonId) {
      fetchFlashcards(selectedLessonId);
    } else {
      setSections([]);
      setNodes([]);
    }
  }, [selectedLessonId, fetchFlashcards]);

  useEffect(() => {
    if (!selectedLessonId) {
      setSections([]);
      setNodes([]);
      setSelectedSectionId(null);
      setSelectedNodeId(null);
      return;
    }
    client.get(`/api/content/lessons/${selectedLessonId}/tree`).then((r) => {
      const tree = r.data;
      if (tree && tree.sections) {
        const flatSecs: SectionDto[] = [];
        const flatNodes: NodeDto[] = [];
        const traverse = (sList: SectionDto[]) => {
          for (const s of sList) {
            flatSecs.push(s);
            if (s.nodes) {
              flatNodes.push(...s.nodes);
            }
            if (s.children) {
              traverse(s.children);
            }
          }
        };
        traverse(tree.sections);
        setSections(flatSecs);
        setNodes(flatNodes);

        if (navParams?.sectionId && flatSecs.some(s => s.id === navParams.sectionId)) {
          setSelectedSectionId(navParams.sectionId);
        } else {
          setSelectedSectionId(null);
        }

        if (navParams?.nodeId && flatNodes.some(n => n.id === navParams.nodeId)) {
          setSelectedNodeId(navParams.nodeId);
        } else {
          setSelectedNodeId(null);
        }
      } else {
        setSections([]);
        setNodes([]);
        setSelectedSectionId(null);
        setSelectedNodeId(null);
      }
    }).catch(() => {
      setSections([]);
      setNodes([]);
      setSelectedSectionId(null);
      setSelectedNodeId(null);
    });
  }, [selectedLessonId, navParams?.sectionId, navParams?.nodeId]);

  // 2. Individual CRUD Handlers
  const openCreate = () => {
    setEditCard(null);
    setForm({
      frontText: '',
      backText: '',
      sectionId: selectedSectionId ? String(selectedSectionId) : '',
      nodeId: selectedNodeId ? String(selectedNodeId) : '',
    });
    setModalOpen(true);
  };

  const openEdit = (card: FlashcardDto) => {
    setEditCard(card);
    setForm({
      frontText: card.frontText,
      backText: card.backText,
      sectionId: card.sectionId ? String(card.sectionId) : '',
      nodeId: card.nodeId ? String(card.nodeId) : '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.frontText.trim() || !form.backText.trim()) {
      onToast('Vui lòng điền đầy đủ cả hai mặt thẻ', 'error');
      return;
    }
    if (!selectedLessonId) {
      onToast('Bài học là bắt buộc', 'error');
      return;
    }
    try {
      setSaving(true);
      const nodeId = form.nodeId ? Number(form.nodeId) : null;
      const sectionId = !nodeId && form.sectionId ? Number(form.sectionId) : null;
      const lessonId = !nodeId && !sectionId ? selectedLessonId : null;
      const payload = {
        frontText: form.frontText.trim(),
        backText: form.backText.trim(),
        lessonId,
        sectionId,
        nodeId,
      };

      if (editCard) {
        await client.patch(`/api/admin/flashcards/${editCard.id}`, payload);
        onToast('Đã cập nhật thẻ ghi nhớ', 'success');
      } else {
        await client.post('/api/admin/flashcards', payload);
        onToast('Đã tạo thẻ ghi nhớ mới', 'success');
      }
      setModalOpen(false);
      fetchFlashcards(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !selectedLessonId) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/flashcards/${deleteTarget.id}`);
      onToast('Đã xóa thẻ ghi nhớ', 'success');
      setDeleteTarget(null);
      fetchFlashcards(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // 3. AI Generation Handlers
  const handleAIGenerate = async () => {
    if (!aiText.trim()) {
      onToast('Vui lòng nhập đoạn văn bản lịch sử cần tóm tắt', 'error');
      return;
    }

    try {
      setAiGenerating(true);
      const res = await client.post('/api/admin/ai/generate', {
        type: 'flashcards',
        text: aiText.trim()
      });

      const data = res.data;
      if (!data || !Array.isArray(data.flashcards)) {
        throw new Error('Định dạng dữ liệu trả về từ AI không đúng cấu trúc flashcards');
      }

      setAiPreviewList(data.flashcards);
      onToast(`Sinh thành công ${data.flashcards.length} thẻ ghi nhớ từ AI!`, 'success');
    } catch (err: any) {
      console.error(err);
      onToast(err?.response?.data?.error || err.message || 'Lỗi khi sinh câu hỏi từ AI', 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAISave = async () => {
    if (!selectedLessonId) return;
    if (aiPreviewList.length === 0) {
      onToast('Không có thẻ nào để lưu', 'error');
      return;
    }
    try {
      setSaving(true);
      await client.post(`/api/admin/lessons/${selectedLessonId}/flashcards/bulk`, {
        flashcards: aiPreviewList.map(f => ({
          frontText: f.frontText.trim(),
          backText: f.backText.trim(),
        }))
      });
      onToast('Đã lưu hàng loạt thẻ ghi nhớ thành công!', 'success');
      setAiModalOpen(false);
      setAiText('');
      setAiPreviewList([]);
      fetchFlashcards(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu thẻ hàng loạt', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredFlashcards = flashcards.filter((card) => {
    if (selectedNodeId) {
      return card.nodeId === selectedNodeId;
    }
    if (selectedSectionId) {
      if (card.sectionId === selectedSectionId) return true;
      if (card.nodeId) {
        const node = nodes.find((n) => n.id === card.nodeId);
        return node?.sectionId === selectedSectionId;
      }
      return false;
    }
    return true;
  });

  return (
    <div>
      {/* Cascade Filters */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        boxShadow: '0 2px 8px rgba(15,23,42,0.02)',
      }}>
        <Select
          label="Khối lớp"
          value={selectedGradeId ?? ''}
          onChange={(e) => {
            setSelectedGradeId(Number(e.target.value));
            setSelectedSectionId(null);
            setSelectedNodeId(null);
          }}
        >
          {grades.map((g) => (
            <option key={g.id} value={g.id}>Khối {g.id}</option>
          ))}
        </Select>

        <Select
          label="Chủ đề"
          value={selectedTopicId ?? ''}
          onChange={(e) => {
            setSelectedTopicId(Number(e.target.value) || null);
            setSelectedSectionId(null);
            setSelectedNodeId(null);
          }}
          disabled={topics.length === 0}
        >
          {topics.length === 0 && <option value="">Chưa có chủ đề nào</option>}
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>

        <Select
          label="Bài học"
          value={selectedLessonId ?? ''}
          onChange={(e) => {
            setSelectedLessonId(Number(e.target.value) || null);
            setSelectedSectionId(null);
            setSelectedNodeId(null);
          }}
          disabled={lessons.length === 0}
        >
          {lessons.length === 0 && <option value="">Chưa có bài học nào</option>}
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>

        <Select
          label="Phần/Nhánh"
          value={selectedSectionId ?? ''}
          onChange={(e) => {
            const secId = Number(e.target.value) || null;
            setSelectedSectionId(secId);
            setSelectedNodeId(null);
          }}
          disabled={!selectedLessonId || sections.length === 0}
        >
          <option value="">Tất cả</option>
          {sections.map((sec) => (
            <option key={sec.id} value={sec.id}>{sec.name}</option>
          ))}
        </Select>

        <Select
          label="Nút kiến thức"
          value={selectedNodeId ?? ''}
          onChange={(e) => setSelectedNodeId(Number(e.target.value) || null)}
          disabled={!selectedSectionId}
        >
          <option value="">Tất cả</option>
          {nodes
            .filter((n) => n.sectionId === selectedSectionId)
            .map((node) => (
              <option key={node.id} value={node.id}>
                {node.header || node.body.slice(0, 40) + '...'}
              </option>
            ))}
        </Select>
      </div>

      {/* Main Actions & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Thẻ ghi nhớ (Flashcards)</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            {selectedLessonId ? `Có ${filteredFlashcards.length} thẻ ghi nhớ trong bài học này` : 'Vui lòng chọn bài học'}
          </p>
        </div>

        {selectedLessonId && (
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              variant="secondary"
              icon={<IconMagicWand size={16} color="#6c63ff" />}
              onClick={() => {
                setAiPreviewList([]);
                setAiModalOpen(true);
              }}
              style={{
                borderColor: '#c7d2fe',
                background: '#faf5ff',
                color: '#6c63ff',
                fontWeight: 600,
              }}
            >
              Trợ lý AI
            </Button>
            <Button icon={<IconPlus size={16} />} onClick={openCreate}>
              Thêm Thẻ thủ công
            </Button>
          </div>
        )}
      </div>

      {/* Cards Table / Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : !selectedLessonId ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', color: '#64748b' }}>
          Vui lòng chọn Khối lớp, Chủ đề và Bài học để tải danh sách thẻ ghi nhớ.
        </div>
      ) : filteredFlashcards.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <div style={{ marginBottom: 16 }}><IconFlashcard size={48} color="#cbd5e1" /></div>
          Chưa có thẻ ghi nhớ nào. Bạn có thể tự thêm hoặc nhấn "Tạo bằng AI" để tự sinh nhanh từ sách giáo khoa!
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {filteredFlashcards.map((card) => (
            <div
              key={card.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 180,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.03)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6c63ff', background: '#f5f3ff', padding: '2px 8px', borderRadius: 20 }}>
                    Thẻ #{card.id}
                  </span>
                  {card.nodeId ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 20 }}>
                      Nút #{card.nodeId}
                    </span>
                  ) : card.sectionId ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0284c7', background: '#f0f9ff', padding: '2px 8px', borderRadius: 20 }}>
                      Nhánh #{card.sectionId}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>
                      Bài học
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ display: 'block', fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Mặt trước (Q)</strong>
                  <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 600, lineHeight: 1.4 }}>{card.frontText}</p>
                </div>
                <div style={{ borderTop: '1px dashed #f1f5f9', paddingTop: 10 }}>
                  <strong style={{ display: 'block', fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Mặt sau (A)</strong>
                  <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.4 }}>{card.backText}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button
                  onClick={() => openEdit(card)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <IconEdit size={14} /> <span style={{ fontSize: 12 }}>Sửa</span>
                </button>
                <button
                  onClick={() => setDeleteTarget(card)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <IconDelete size={14} /> <span style={{ fontSize: 12 }}>Xóa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual CRUD Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editCard ? `Chỉnh sửa thẻ #${editCard.id}` : 'Thêm thẻ ghi nhớ mới'}
      >
        <div style={{ width: 460, maxWidth: '100%' }}>
          <Textarea
            label="Mặt trước (Câu hỏi / Thuật ngữ)"
            value={form.frontText}
            onChange={(e) => setForm({ ...form, frontText: e.target.value })}
            placeholder="Ví dụ: Chiến dịch Điện Biên Phủ bắt đầu vào ngày nào?"
            rows={3}
          />
          <Textarea
            label="Mặt sau (Câu trả lời / Định nghĩa)"
            value={form.backText}
            onChange={(e) => setForm({ ...form, backText: e.target.value })}
            placeholder="Ví dụ: Ngày 13 tháng 3 năm 1954."
            rows={3}
          />
          <Select
            label="Thuộc phần/nhánh sơ đồ (Tùy chọn)"
            value={form.sectionId}
            onChange={(e) => {
              const secId = e.target.value;
              setForm({
                ...form,
                sectionId: secId,
                nodeId: '', // Reset node selection if section changes
              });
            }}
          >
            <option value="">-- Mặc định thuộc bài học --</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </Select>

          <Select
            label="Thuộc nút kiến thức cụ thể (Tùy chọn)"
            value={form.nodeId}
            onChange={(e) => setForm({ ...form, nodeId: e.target.value })}
            disabled={!form.sectionId} // Only enable if a section is selected
          >
            <option value="">-- Thuộc toàn bộ nhánh sơ đồ --</option>
            {nodes
              .filter((n) => n.sectionId === Number(form.sectionId))
              .map((node) => (
                <option key={node.id} value={node.id}>
                  {node.header || node.body.slice(0, 40) + '...'}
                </option>
              ))}
          </Select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu lại'}</Button>
          </div>
        </div>
      </Modal>

      {/* AI Generate Modal */}
      <Modal
        open={aiModalOpen}
        onClose={() => !aiGenerating && setAiModalOpen(false)}
        title="Tự động sinh Thẻ ghi nhớ bằng Trợ lý AI"
      >
        <div style={{ width: 680, maxWidth: '100%', maxHeight: '76vh', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '4px' }}>
          
          {/* Key & Model settings */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: '#fffbeb',
            borderRadius: 8,
            border: '1px solid #fef3c7',
            marginBottom: 16,
            fontSize: 13,
            color: '#b45309',
            width: 'fit-content',
            fontWeight: 500,
          }}>
            <IconAlert size={16} color="#b45309" />
            <span>AI có thể mắc sai sót. Hãy kiểm tra kỹ thông tin trước khi lưu.</span>
          </div>

          {/* Text Input */}
          <Textarea
            label="Nội dung/Văn bản lịch sử cần tóm tắt"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Dán nội dung sách giáo khoa hoặc đoạn sử liệu vào đây..."
            rows={6}
            disabled={aiGenerating}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {aiPreviewList.length > 0 && `Đang xem trước ${aiPreviewList.length} thẻ ghi nhớ`}
            </span>
            <Button
              variant="secondary"
              icon={aiGenerating ? <Spinner size={14} /> : <IconMagicWand size={14} color="#6c63ff" />}
              onClick={handleAIGenerate}
              disabled={aiGenerating}
              style={{
                borderColor: '#c7d2fe',
                background: '#faf5ff',
                color: '#6c63ff',
              }}
            >
              {aiGenerating ? 'Đang phân tích...' : 'Bắt đầu sinh bằng AI'}
            </Button>
          </div>

          {/* AI Result Preview / Editing List */}
          {aiPreviewList.length > 0 && (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 16,
              background: '#f8fafc',
              maxHeight: 250,
              marginBottom: 16,
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#334155' }}>Xem trước kết quả sinh từ AI</h4>
              {aiPreviewList.map((item, idx) => (
                <div key={idx} style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                  position: 'relative'
                }}>
                  <button
                    onClick={() => setAiPreviewList(aiPreviewList.filter((_, i) => i !== idx))}
                    style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                  >
                    Bỏ thẻ
                  </button>
                  <div style={{ marginRight: 60 }}>
                    <div style={{ marginBottom: 6 }}>
                      <strong style={{ fontSize: 11, color: '#94a3b8' }}>Mặt trước (Q):</strong>
                      <input
                        value={item.frontText}
                        onChange={(e) => {
                          const newList = [...aiPreviewList];
                          newList[idx].frontText = e.target.value;
                          setAiPreviewList(newList);
                        }}
                        style={{ width: '100%', border: 'none', borderBottom: '1px solid #f1f5f9', padding: '4px 0', fontSize: 13, outline: 'none', fontWeight: 600, color: '#0f172a' }}
                      />
                    </div>
                    <div>
                      <strong style={{ fontSize: 11, color: '#94a3b8' }}>Mặt sau (A):</strong>
                      <input
                        value={item.backText}
                        onChange={(e) => {
                          const newList = [...aiPreviewList];
                          newList[idx].backText = e.target.value;
                          setAiPreviewList(newList);
                        }}
                        style={{ width: '100%', border: 'none', borderBottom: '1px solid #f1f5f9', padding: '4px 0', fontSize: 13, outline: 'none', color: '#475569' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setAiPreviewList([...aiPreviewList, { frontText: 'Câu hỏi mới', backText: 'Câu trả lời mới' }])}
                style={{ width: '100%', padding: 10, border: '1px dashed #cbd5e1', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 13 }}
              >
                + Thêm một thẻ trống
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <Button variant="secondary" onClick={() => setAiModalOpen(false)} disabled={aiGenerating || saving}>Hủy</Button>
            <Button
              onClick={() => setAiSaveConfirmOpen(true)}
              disabled={aiGenerating || saving || aiPreviewList.length === 0}
            >
              {saving ? 'Đang lưu...' : 'Lưu tất cả vào Bài học (Ghi đè)'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xóa thẻ ghi nhớ"
        message="Bạn có chắc chắn muốn xóa thẻ ghi nhớ này? Hành động này không thể hoàn tác."
        loading={deleting}
      />

      {/* AI Save Confirmation */}
      <ConfirmDialog
        open={aiSaveConfirmOpen}
        onCancel={() => setAiSaveConfirmOpen(false)}
        onConfirm={async () => {
          setAiSaveConfirmOpen(false);
          await handleAISave();
        }}
        title="Xác nhận ghi đè danh sách thẻ ghi nhớ"
        message="Hành động này sẽ ghi đè và THAY THẾ hoàn toàn tất cả các thẻ ghi nhớ hiện tại của bài học này bằng danh sách thẻ ghi nhớ mới từ AI. Bạn có chắc chắn muốn tiếp tục không?"
        loading={saving}
      />
    </div>
  );
}
