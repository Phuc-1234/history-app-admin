// src/components/content/QuestionPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { AdminQuestionDto, GradeDto, TopicDto, LessonDto, SectionDto, NodeDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconQuestion, IconXP } from '../ui/Icons';
import { RichTextEditor } from '../ui/RichTextEditor';
import { stripHtml } from '../../utils/html';

interface QuestionPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

interface FormAnswer {
  content: string;
  isCorrect: boolean;
  leftText: string;
  rightText: string;
}

interface FormQuestionItem {
  key: string;
  type: 'CHOOSE' | 'FILL' | 'MATCH';
  difficulty: string;
  isActive: boolean;
  promptText: string;
  document: string;
  explanation: string;
  answers: FormAnswer[];
}

const EMPTY_ANSWER: FormAnswer = { content: '', isCorrect: false, leftText: '', rightText: '' };

export function QuestionPanel({ onToast }: QuestionPanelProps) {
  const [questions, setQuestions] = useState<AdminQuestionDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Hierarchy lists for filters and forms
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [, setNodes] = useState<NodeDto[]>([]);

  // Filter state
  const [selGradeId, setSelGradeId] = useState('');
  const [selTopicId, setSelTopicId] = useState('');
  const [selLessonId, setSelLessonId] = useState('');
  const [selSectionId, setSelSectionId] = useState('');
  const [selNodeId, setSelNodeId] = useState('');
  const [selType, setSelType] = useState('');

  // Modal form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<AdminQuestionDto | null>(null);
  
  // Scope settings shared by all questions in the batch
  const [scopeState, setScopeState] = useState({
    scopeType: 'GRADE' as 'GRADE' | 'TOPIC' | 'LESSON' | 'SECTION' | 'NODE' | 'NATIONAL',
    gradeId: '',
    topicId: '',
    lessonId: '',
    sectionId: '',
    nodeId: ''
  });
  
  // List of question forms to build (supports batching in create mode)
  const [formQuestions, setFormQuestions] = useState<FormQuestionItem[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminQuestionDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cascading dropdowns states inside Form Modal
  const [formTopics, setFormTopics] = useState<TopicDto[]>([]);
  const [formLessons, setFormLessons] = useState<LessonDto[]>([]);
  const [formSections, setFormSections] = useState<SectionDto[]>([]);
  const [formNodes, setFormNodes] = useState<NodeDto[]>([]);

  // 1. Fetch grades on mount
  useEffect(() => {
    client.get('/api/content/grades').then((r) => {
      setGrades(r.data.grades ?? []);
    }).catch(() => onToast('Không tải được danh sách khối lớp', 'error'));
  }, [onToast]);

  // 2. Cascade load for filter topics
  useEffect(() => {
    if (!selGradeId) { setTopics([]); setSelTopicId(''); return; }
    client.get(`/api/content/grades/${selGradeId}/topics`).then((r) => {
      setTopics(r.data.topics ?? []);
      setSelTopicId('');
    });
  }, [selGradeId]);

  // 3. Cascade load for filter lessons
  useEffect(() => {
    if (!selTopicId) { setLessons([]); setSelLessonId(''); return; }
    client.get(`/api/content/topics/${selTopicId}/lessons`).then((r) => {
      setLessons(r.data.lessons ?? []);
      setSelLessonId('');
    });
  }, [selTopicId]);

  // 4. Cascade load for filter sections
  useEffect(() => {
    if (!selLessonId) { setSections([]); setSelSectionId(''); return; }
    client.get(`/api/content/lessons/${selLessonId}/sections`).then((r) => {
      setSections(r.data.sections ?? []);
      setSelSectionId('');
    });
  }, [selLessonId]);

  // 5. Cascade load for filter nodes
  useEffect(() => {
    if (!selSectionId) { setNodes([]); setSelNodeId(''); return; }
    client.get(`/api/content/sections/${selSectionId}/nodes`).then((r) => {
      setNodes(r.data.nodes ?? []);
      setSelNodeId('');
    });
  }, [selSectionId]);

  // Fetch Questions
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selGradeId) params.gradeId = Number(selGradeId);
      if (selTopicId) params.topicId = Number(selTopicId);
      if (selLessonId) params.lessonId = Number(selLessonId);
      if (selSectionId) params.sectionId = Number(selSectionId);
      if (selNodeId) params.nodeId = Number(selNodeId);
      if (selType) params.type = selType;

      const res = await client.get('/api/admin/questions', { params });
      setQuestions(res.data.questions ?? []);
    } catch {
      onToast('Không tải được danh sách câu hỏi', 'error');
    } finally {
      setLoading(false);
    }
  }, [selGradeId, selTopicId, selLessonId, selSectionId, selNodeId, selType, onToast]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Cascade loads for form Modal
  useEffect(() => {
    if (!scopeState.gradeId) { setFormTopics([]); setFormLessons([]); setFormSections([]); setFormNodes([]); return; }
    client.get(`/api/content/grades/${scopeState.gradeId}/topics`).then(r => setFormTopics(r.data.topics ?? []));
  }, [scopeState.gradeId]);

  useEffect(() => {
    if (!scopeState.topicId) { setFormLessons([]); setFormSections([]); setFormNodes([]); return; }
    client.get(`/api/content/topics/${scopeState.topicId}/lessons`).then(r => setFormLessons(r.data.lessons ?? []));
  }, [scopeState.topicId]);

  useEffect(() => {
    if (!scopeState.lessonId) { setFormSections([]); setFormNodes([]); return; }
    client.get(`/api/content/lessons/${scopeState.lessonId}/sections`).then(r => setFormSections(r.data.sections ?? []));
  }, [scopeState.lessonId]);

  useEffect(() => {
    if (!scopeState.sectionId) { setFormNodes([]); return; }
    client.get(`/api/content/sections/${scopeState.sectionId}/nodes`).then(r => setFormNodes(r.data.nodes ?? []));
  }, [scopeState.sectionId]);

  const openCreate = () => {
    setEditQuestion(null);
    setScopeState({
      scopeType: 'GRADE',
      gradeId: selGradeId,
      topicId: selTopicId,
      lessonId: selLessonId,
      sectionId: selSectionId,
      nodeId: selNodeId
    });
    setFormQuestions([
      {
        key: Math.random().toString(),
        type: 'CHOOSE',
        difficulty: '1',
        isActive: true,
        promptText: '',
        document: '',
        explanation: '',
        answers: [{ ...EMPTY_ANSWER }]
      }
    ]);
    setModalOpen(true);
  };

  const openEdit = (q: AdminQuestionDto) => {
    setEditQuestion(q);
    
    // Resolve scope ids from q.scopeType and q.scopeId to prepopulate cascade selectors
    const scopeTypeVal = (q.scopeType as any) || 'GRADE';
    const scopeIdVal = q.scopeId;

    let gradeId = '';
    let topicId = '';
    let lessonId = '';
    let sectionId = '';
    let nodeId = '';

    if (scopeTypeVal === 'GRADE' && scopeIdVal) gradeId = String(scopeIdVal);
    else if (scopeTypeVal === 'TOPIC' && scopeIdVal) {
      topicId = String(scopeIdVal);
      gradeId = String(q.gradeId ?? '');
    } else if (scopeTypeVal === 'LESSON' && scopeIdVal) {
      lessonId = String(scopeIdVal);
      topicId = String(q.topicId ?? '');
      gradeId = String(q.gradeId ?? '');
    } else if (scopeTypeVal === 'SECTION' && scopeIdVal) {
      sectionId = String(scopeIdVal);
      lessonId = String(q.lessonId ?? '');
      topicId = String(q.topicId ?? '');
      gradeId = String(q.gradeId ?? '');
    } else if (scopeTypeVal === 'NODE' && scopeIdVal) {
      nodeId = String(scopeIdVal);
      sectionId = String(q.sectionId ?? '');
      lessonId = String(q.lessonId ?? '');
      topicId = String(q.topicId ?? '');
      gradeId = String(q.gradeId ?? '');
    }

    setScopeState({
      scopeType: scopeTypeVal,
      gradeId,
      topicId,
      lessonId,
      sectionId,
      nodeId
    });

    // Parse answers from answerDataJson (or fallback to legacy answers)
    let parsedAnswers: FormAnswer[] = [];
    const type = q.type as 'CHOOSE' | 'FILL' | 'MATCH';
    const json = q.answerDataJson;

    if (json) {
      if (type === 'CHOOSE') {
        const options: string[] = json.options ?? [];
        const correctOption: number[] = json.correctOption ?? [];
        parsedAnswers = options.map((opt, i) => ({
          content: opt,
          isCorrect: correctOption.includes(i),
          leftText: '',
          rightText: ''
        }));
      } else if (type === 'FILL') {
        const acceptedAnswers: string[] = json.acceptedAnswers ?? [];
        parsedAnswers = acceptedAnswers.map(ans => ({
          content: ans,
          isCorrect: true,
          leftText: '',
          rightText: ''
        }));
      } else if (type === 'MATCH') {
        const pairs: Record<string, string>[] = json.pairs ?? [];
        parsedAnswers = pairs.map(p => {
          const left = Object.keys(p)[0] ?? '';
          return {
            content: '',
            isCorrect: true,
            leftText: left,
            rightText: p[left] ?? ''
          };
        });
      }
    }

    // Fallback if parsedAnswers is empty
    if (parsedAnswers.length === 0 && q.answers && q.answers.length > 0) {
      parsedAnswers = q.answers.map(a => ({
        content: a.content,
        isCorrect: !!a.isCorrect,
        leftText: a.leftText ?? '',
        rightText: a.rightText ?? ''
      }));
    }

    if (parsedAnswers.length === 0) {
      parsedAnswers = [EMPTY_ANSWER];
    }

    setFormQuestions([
      {
        key: Math.random().toString(),
        type,
        difficulty: String(q.difficulty),
        isActive: q.isActive !== false,
        promptText: q.promptText,
        document: q.document ?? '',
        explanation: q.explanation ?? '',
        answers: parsedAnswers
      }
    ]);
    setModalOpen(true);
  };

  const addQuestionItem = () => {
    setFormQuestions(prev => [
      ...prev,
      {
        key: Math.random().toString(),
        type: 'CHOOSE',
        difficulty: '1',
        isActive: true,
        promptText: '',
        document: '',
        explanation: '',
        answers: [{ ...EMPTY_ANSWER }]
      }
    ]);
  };

  const removeQuestionItem = (idx: number) => {
    setFormQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestionField = <K extends keyof FormQuestionItem>(idx: number, field: K, val: FormQuestionItem[K]) => {
    setFormQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  };

  const addAnswerField = (qIdx: number) => {
    setFormQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, answers: [...q.answers, { ...EMPTY_ANSWER }] } : q));
  };

  const removeAnswerField = (qIdx: number, ansIdx: number) => {
    setFormQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, answers: q.answers.filter((_, aIdx) => aIdx !== ansIdx) } : q));
  };

  const updateAnswerField = (qIdx: number, ansIdx: number, field: keyof FormAnswer, val: any) => {
    setFormQuestions(prev => prev.map((q, i) => i === qIdx ? {
      ...q,
      answers: q.answers.map((ans, aIdx) => aIdx === ansIdx ? { ...ans, [field]: val } : ans)
    } : q));
  };

  const handleSave = async () => {
    // Validate scope selections based on scopeType
    let scopeId: number | null = null;
    if (scopeState.scopeType === 'GRADE') {
      if (!scopeState.gradeId) return onToast('Vui lòng chọn Khối lớp', 'error');
      scopeId = Number(scopeState.gradeId);
    } else if (scopeState.scopeType === 'TOPIC') {
      if (!scopeState.topicId) return onToast('Vui lòng chọn Chủ đề', 'error');
      scopeId = Number(scopeState.topicId);
    } else if (scopeState.scopeType === 'LESSON') {
      if (!scopeState.lessonId) return onToast('Vui lòng chọn Bài học', 'error');
      scopeId = Number(scopeState.lessonId);
    } else if (scopeState.scopeType === 'SECTION') {
      if (!scopeState.sectionId) return onToast('Vui lòng chọn Phần', 'error');
      scopeId = Number(scopeState.sectionId);
    } else if (scopeState.scopeType === 'NODE') {
      if (!scopeState.nodeId) return onToast('Vui lòng chọn Nút kiến thức', 'error');
      scopeId = Number(scopeState.nodeId);
    }

    const payloads = [];
    for (let index = 0; index < formQuestions.length; index++) {
      const qItem = formQuestions[index];
      const diff = Number(qItem.difficulty);
      const promptTrimmed = qItem.promptText.trim();

      if (!promptTrimmed) {
        return onToast(`Nội dung câu hỏi số ${index + 1} không được để trống`, 'error');
      }
      if (isNaN(diff) || !qItem.answers.length) {
        return onToast(`Vui lòng điền đầy đủ thông tin hợp lệ ở câu hỏi số ${index + 1}`, 'error');
      }

      // Construct answerDataJson based on type
      let answerDataJson: any = null;
      if (qItem.type === 'CHOOSE') {
        const options = qItem.answers.map(a => a.content.trim()).filter(Boolean);
        const correctOption = qItem.answers
          .map((a, i) => (a.isCorrect ? i : -1))
          .filter(i => i !== -1);

        if (options.length === 0) {
          return onToast(`Câu hỏi số ${index + 1}: Vui lòng điền nội dung các lựa chọn`, 'error');
        }
        if (correctOption.length === 0) {
          return onToast(`Câu hỏi số ${index + 1}: Vui lòng chọn ít nhất một lựa chọn đúng`, 'error');
        }

        answerDataJson = { options, correctOption };
      } else if (qItem.type === 'FILL') {
        const acceptedAnswers = qItem.answers.map(a => a.content.trim()).filter(Boolean);
        if (acceptedAnswers.length === 0) {
          return onToast(`Câu hỏi số ${index + 1}: Vui lòng điền các đáp án được chấp nhận`, 'error');
        }

        answerDataJson = { acceptedAnswers };
      } else if (qItem.type === 'MATCH') {
        const pairs = qItem.answers
          .filter(a => a.leftText.trim() && a.rightText.trim())
          .map(a => ({ [a.leftText.trim()]: a.rightText.trim() }));

        if (pairs.length === 0) {
          return onToast(`Câu hỏi số ${index + 1}: Vui lòng điền đầy đủ các cặp nối`, 'error');
        }

        answerDataJson = { pairs };
      }

      payloads.push({
        type: qItem.type,
        difficulty: diff,
        promptText: promptTrimmed,
        document: qItem.document.trim() || null,
        explanation: qItem.explanation.trim() || null,
        isActive: qItem.isActive,
        scopeType: scopeState.scopeType,
        scopeId,
        answerDataJson,
        // Legacy backups
        gradeId: scopeState.gradeId ? Number(scopeState.gradeId) : null,
        topicId: scopeState.topicId ? Number(scopeState.topicId) : null,
        lessonId: scopeState.lessonId ? Number(scopeState.lessonId) : null,
        sectionId: scopeState.sectionId ? Number(scopeState.sectionId) : null,
        nodeId: scopeState.nodeId ? Number(scopeState.nodeId) : null
      });
    }

    try {
      setSaving(true);
      if (editQuestion) {
        await client.patch(`/api/admin/questions/${editQuestion.id}`, payloads[0]);
        onToast('Đã lưu câu hỏi thành công', 'success');
      } else {
        for (let i = 0; i < payloads.length; i++) {
          await client.post('/api/admin/questions', payloads[i]);
        }
        onToast(`Đã tạo thành công ${payloads.length} câu hỏi`, 'success');
      }
      setModalOpen(false);
      fetchQuestions();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu câu hỏi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/questions/${deleteTarget.id}`);
      onToast('Đã xóa câu hỏi thành công', 'success');
      setDeleteTarget(null);
      fetchQuestions();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa câu hỏi', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getScopeBadgeLabel = (q: AdminQuestionDto) => {
    if (q.scopeType === 'NATIONAL') return 'Quốc gia';
    if (q.scopeType === 'GRADE') return `Khối ${q.scopeId}`;
    if (q.scopeType === 'TOPIC') return `Chủ đề #${q.scopeId}`;
    if (q.scopeType === 'LESSON') return `Bài #${q.scopeId}`;
    if (q.scopeType === 'SECTION') return `Phần #${q.scopeId}`;
    if (q.scopeType === 'NODE') return `Nút #${q.scopeId}`;
    return 'Chưa xác định';
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Ngân hàng câu hỏi</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{questions.length} câu hỏi hiển thị</p>
        </div>
        <Button icon={<IconPlus size={16} />} onClick={openCreate}>Thêm câu hỏi</Button>
      </div>

      {/* Dynamic Filters */}
      <div style={{ background: '#ffffff', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Khối</label>
            <select value={selGradeId} onChange={(e) => setSelGradeId(e.target.value)} style={SELECT_STYLE}>
              <option value="">Tất cả Khối</option>
              {grades.map(g => <option key={g.id} value={g.id}>Khối {g.id}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Chủ đề</label>
            <select value={selTopicId} onChange={(e) => setSelTopicId(e.target.value)} disabled={!topics.length} style={SELECT_STYLE}>
              <option value="">Tất cả Chủ đề</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Bài học</label>
            <select value={selLessonId} onChange={(e) => setSelLessonId(e.target.value)} disabled={!lessons.length} style={SELECT_STYLE}>
              <option value="">Tất cả Bài học</option>
              {lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Phần</label>
            <select value={selSectionId} onChange={(e) => setSelSectionId(e.target.value)} disabled={!sections.length} style={SELECT_STYLE}>
              <option value="">Tất cả Phần</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Loại câu hỏi</label>
            <select value={selType} onChange={(e) => setSelType(e.target.value)} style={SELECT_STYLE}>
              <option value="">Tất cả loại</option>
              <option value="CHOOSE">CHOOSE — Trắc nghiệm</option>
              <option value="FILL">FILL — Điền từ</option>
              <option value="MATCH">MATCH — Nối cặp</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <IconQuestion size={48} color="#94a3b8" />
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>Chưa có câu hỏi nào khớp với bộ lọc</p>
        </div>
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <th style={TH_STYLE}>ID</th>
                <th style={TH_STYLE}>Nội dung câu hỏi</th>
                <th style={TH_STYLE}>Loại</th>
                <th style={TH_STYLE}>Độ khó</th>
                <th style={TH_STYLE}>Phạm vi (Scope)</th>
                <th style={TH_STYLE}>Trạng thái</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => (
                <tr key={q.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...TD_STYLE, fontWeight: 700 }}>#{q.id}</td>
                  <td style={{ ...TD_STYLE, fontWeight: 600, color: '#0f172a', maxWidth: 320 }}>
                    <div>
                      <div dangerouslySetInnerHTML={{ __html: q.promptText }} style={{ maxHeight: 80, overflowY: 'auto' }} />
                      {q.document && (
                        <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 4 }}>
                          Trích dẫn: "{stripHtml(q.document).substring(0, 60)}..."
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={TD_STYLE}>
                    <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, fontWeight: 700, background: q.type === 'CHOOSE' ? '#eff6ff' : q.type === 'FILL' ? '#ecfdf5' : '#fff7ed', color: q.type === 'CHOOSE' ? '#1d4ed8' : q.type === 'FILL' ? '#047857' : '#c2410c' }}>
                      {q.type}
                    </span>
                  </td>
                  <td style={TD_STYLE}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <IconXP size={14} color="#eab308" /> {q.difficulty} / 4
                    </span>
                  </td>
                  <td style={TD_STYLE}>
                    <span style={{ fontWeight: 600, color: '#4f46e5', fontSize: 13 }}>
                      {getScopeBadgeLabel(q)}
                    </span>
                  </td>
                  <td style={TD_STYLE}>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 700,
                      background: q.isActive !== false ? '#ecfdf5' : '#fef2f2',
                      color: q.isActive !== false ? '#047857' : '#ef4444'
                    }}>
                      {q.isActive !== false ? 'Hoạt động' : 'Tạm ẩn'}
                    </span>
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(q)} style={{ padding: '6px 12px', fontSize: 13 }}>Sửa</Button>
                      <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(q)} style={{ padding: '6px 12px', fontSize: 13 }}>Xóa</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} title={editQuestion ? `Sửa câu hỏi: #${editQuestion.id}` : 'Thêm câu hỏi mới'} onClose={() => setModalOpen(false)} width={850}>
        
        {/* Scope Type Selection */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <Select label="Cấp độ phạm vi (Scope Level)" value={scopeState.scopeType} onChange={(e) => setScopeState(f => ({ ...f, scopeType: e.target.value as any }))}>
              <option value="NATIONAL">NATIONAL — Quốc gia</option>
              <option value="GRADE">GRADE — Khối lớp</option>
              <option value="TOPIC">TOPIC — Chủ đề</option>
              <option value="LESSON">LESSON — Bài học</option>
              <option value="SECTION">SECTION — Phần</option>
              <option value="NODE">NODE — Nút kiến thức</option>
            </Select>
          </div>
        </div>

        {/* Cascade selections depending on Scope Type */}
        {scopeState.scopeType !== 'NATIONAL' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
            <Select
              label="Khối"
              value={scopeState.gradeId}
              onChange={(e) => setScopeState(f => ({ ...f, gradeId: e.target.value, topicId: '', lessonId: '', sectionId: '', nodeId: '' }))}
            >
              <option value="">Chọn Khối</option>
              {grades.map(g => <option key={g.id} value={g.id}>Khối {g.id}</option>)}
            </Select>

            {['TOPIC', 'LESSON', 'SECTION', 'NODE'].includes(scopeState.scopeType) && (
              <Select
                label="Chủ đề"
                value={scopeState.topicId}
                onChange={(e) => setScopeState(f => ({ ...f, topicId: e.target.value, lessonId: '', sectionId: '', nodeId: '' }))}
                disabled={!formTopics.length}
              >
                <option value="">Chọn Chủ đề</option>
                {formTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            )}

            {['LESSON', 'SECTION', 'NODE'].includes(scopeState.scopeType) && (
              <Select
                label="Bài học"
                value={scopeState.lessonId}
                onChange={(e) => setScopeState(f => ({ ...f, lessonId: e.target.value, sectionId: '', nodeId: '' }))}
                disabled={!formLessons.length}
              >
                <option value="">Chọn Bài học</option>
                {formLessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            )}

            {['SECTION', 'NODE'].includes(scopeState.scopeType) && (
              <Select
                label="Phần"
                value={scopeState.sectionId}
                onChange={(e) => setScopeState(f => ({ ...f, sectionId: e.target.value, nodeId: '' }))}
                disabled={!formSections.length}
              >
                <option value="">Chọn Phần</option>
                {formSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}

            {scopeState.scopeType === 'NODE' && (
              <Select
                label="Nút kiến thức"
                value={scopeState.nodeId}
                onChange={(e) => setScopeState(f => ({ ...f, nodeId: e.target.value }))}
                disabled={!formNodes.length}
              >
                <option value="">Chọn Nút</option>
                {formNodes.map(n => <option key={n.id} value={n.id}>{n.header || `Nút #${n.id}`}</option>)}
              </Select>
            )}
          </div>
        )}

        {/* Questions list */}
        <div style={{ marginTop: 20 }}>
          {formQuestions.map((qItem, qIdx) => (
            <div
              key={qItem.key}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 24px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#334155' }}>
                  Câu hỏi {formQuestions.length > 1 ? `#${qIdx + 1}` : ''}
                </h4>
                {!editQuestion && formQuestions.length > 1 && (
                  <Button
                    variant="danger"
                    onClick={() => removeQuestionItem(qIdx)}
                    style={{ padding: '6px 12px', fontSize: 13 }}
                  >
                    Xóa câu hỏi này
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 200 }}>
                  <Select
                    label="Loại câu hỏi"
                    value={qItem.type}
                    onChange={(e) => {
                      updateQuestionField(qIdx, 'type', e.target.value as any);
                      // Reset answers list for this question
                      setFormQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, answers: [{ ...EMPTY_ANSWER }] } : q));
                    }}
                  >
                    <option value="CHOOSE">CHOOSE — Trắc nghiệm nhiều lựa chọn</option>
                    <option value="FILL">FILL — Điền vào chỗ trống</option>
                    <option value="MATCH">MATCH — Nối cặp tương ứng</option>
                  </Select>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <Select
                    label="Độ khó"
                    value={qItem.difficulty}
                    onChange={(e) => updateQuestionField(qIdx, 'difficulty', e.target.value)}
                  >
                    <option value="1">Lớp 1 (Nhận biết)</option>
                    <option value="2">Lớp 2 (Thông hiểu)</option>
                    <option value="3">Lớp 3 (Vận dụng)</option>
                    <option value="4">Lớp 4 (Vận dụng cao)</option>
                  </Select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={qItem.isActive}
                      onChange={(e) => updateQuestionField(qIdx, 'isActive', e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600, color: '#334155' }}>Đang hoạt động (Kích hoạt)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <RichTextEditor
                  label="Nội dung câu hỏi"
                  value={qItem.promptText}
                  onChange={(val) => updateQuestionField(qIdx, 'promptText', val)}
                  placeholder="Nhập câu hỏi lịch sử..."
                />
                <RichTextEditor
                  label="Tài liệu/Đoạn trích đi kèm (Tùy chọn)"
                  value={qItem.document}
                  onChange={(val) => updateQuestionField(qIdx, 'document', val)}
                  placeholder="Nhập đoạn văn trích dẫn lịch sử..."
                />
                <RichTextEditor
                  label="Giải thích đáp án (Tùy chọn)"
                  value={qItem.explanation}
                  onChange={(val) => updateQuestionField(qIdx, 'explanation', val)}
                  placeholder="Giải thích vì sao đáp án này chính xác..."
                />
              </div>

              {/* Answer list section inside card */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Danh sách đáp án</span>
                  <Button variant="secondary" icon={<IconPlus size={12} />} onClick={() => addAnswerField(qIdx)} style={{ padding: '4px 10px', fontSize: 12 }}>
                    Thêm trường đáp án
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                  {qItem.answers.map((ans, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {qItem.type === 'CHOOSE' && (
                        <>
                          <input
                            type="checkbox"
                            checked={ans.isCorrect}
                            onChange={(e) => updateAnswerField(qIdx, idx, 'isCorrect', e.target.checked)}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              placeholder="Nội dung đáp án lựa chọn..."
                              value={ans.content}
                              onChange={(e) => updateAnswerField(qIdx, idx, 'content', e.target.value)}
                              style={INPUT_STYLE}
                            />
                          </div>
                          {qItem.answers.length > 1 && (
                            <button onClick={() => removeAnswerField(qIdx, idx)} style={DEL_BTN_STYLE}>
                              <IconDelete size={16} />
                            </button>
                          )}
                        </>
                      )}

                      {qItem.type === 'FILL' && (
                        <>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              placeholder="Đáp án điền khuyết được chấp nhận (ví dụ: 'Bạch Đằng')..."
                              value={ans.content}
                              onChange={(e) => updateAnswerField(qIdx, idx, 'content', e.target.value)}
                              style={INPUT_STYLE}
                            />
                          </div>
                          {qItem.answers.length > 1 && (
                            <button onClick={() => removeAnswerField(qIdx, idx)} style={DEL_BTN_STYLE}>
                              <IconDelete size={16} />
                            </button>
                          )}
                        </>
                      )}

                      {qItem.type === 'MATCH' && (
                        <>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              placeholder="Vế bên trái (ví dụ: 'Lê Lợi')..."
                              value={ans.leftText}
                              onChange={(e) => updateAnswerField(qIdx, idx, 'leftText', e.target.value)}
                              style={INPUT_STYLE}
                            />
                          </div>
                          <span style={{ color: '#94a3b8' }}>➔</span>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              placeholder="Vế bên phải nối tương ứng (ví dụ: '1428')..."
                              value={ans.rightText}
                              onChange={(e) => updateAnswerField(qIdx, idx, 'rightText', e.target.value)}
                              style={INPUT_STYLE}
                            />
                          </div>
                          {qItem.answers.length > 1 && (
                            <button onClick={() => removeAnswerField(qIdx, idx)} style={DEL_BTN_STYLE}>
                              <IconDelete size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Another Question Button */}
        {!editQuestion && (
          <div style={{ marginBottom: 20 }}>
            <Button
              variant="secondary"
              icon={<IconPlus size={14} />}
              onClick={addQuestionItem}
              style={{ width: '100%', padding: '12px', borderStyle: 'dashed', borderRadius: 10, background: '#f8fafc', color: '#6366f1' }}
            >
              Thêm câu hỏi khác
            </Button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editQuestion ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa câu hỏi này?"
        message={`Bạn có chắc muốn xóa câu hỏi #${deleteTarget?.id}? Thay đổi này sẽ ảnh hưởng đến các đề thi liên quan.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 6
};

const SELECT_STYLE = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  outline: 'none',
  fontSize: 14,
  boxSizing: 'border-box' as const,
  background: '#ffffff'
};

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  outline: 'none',
  fontSize: 14,
  boxSizing: 'border-box' as const
};

const DEL_BTN_STYLE = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ef4444',
  padding: 4
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
