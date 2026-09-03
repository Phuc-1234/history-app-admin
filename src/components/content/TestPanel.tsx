import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../../api/client';
import type { AdminTestDto, AdminQuestionDto, GradeDto, TopicDto, LessonDto, SectionDto, TestPresetDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { ImageUploadInput } from '../ui/ImageUploadInput';
import { Spinner } from '../ui/Spinner';
import { stripHtml } from '../../utils/html';
import {
  IconPlus,
  IconEdit,
  IconDelete,
  IconTest,
  IconClock,
  IconTarget
} from '../ui/Icons';
import { getDeleteErrorMessage } from '../../utils/deleteHelper';
import { QuestionBatchModal, type FormQuestionItem } from './QuestionBatchModal';

interface TestPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const EMPTY_FORM = {
  title: '',
  summary: '',
  presetId: '',
  scopeType: 'GRADE' as 'GRADE' | 'TOPIC' | 'LESSON' | 'SECTION' | 'NODE' | 'NATIONAL',
  gradeId: '',
  topicId: '',
  lessonId: '',
  sectionId: '',
  isNationalTest: false,
  isPro: false,
  imgUrl: ''
};

const EXAM_TOOLTIP = 'Có thể di chuyển đến bất kỳ câu hỏi nào. Chỉ biết kết quả sau khi nộp bài';
const PRACTICE_TOOLTIP = 'Làm lần lượt từng câu hỏi và biết kết quả ngay sau mỗi câu.';

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#f8fafc',
            padding: '7px 11px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.4,
            whiteSpace: 'normal',
            width: 'max-content',
            maxWidth: 260,
            textAlign: 'left',
            zIndex: 9999,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
          }}
        >
          {text}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: 5,
              borderStyle: 'solid',
              borderColor: '#1e293b transparent transparent transparent',
            }}
          />
        </span>
      )}
    </span>
  );
}

export function TestPanel({ onToast }: TestPanelProps) {
  const [tests, setTests] = useState<AdminTestDto[]>([]);
  const [questions, setQuestions] = useState<AdminQuestionDto[]>([]);
  const [presets, setPresets] = useState<TestPresetDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Hierarchy selections for scopes
  const [grades, setGrades] = useState<GradeDto[]>([]);

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTest, setEditTest] = useState<AdminTestDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedQIds, setSelectedQIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminTestDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedQIds, setExpandedQIds] = useState<Set<number>>(new Set());

  // Tabs and search states for questions inside Modal
  const [questionTab, setQuestionTab] = useState<'BANK' | 'LOCAL'>('BANK');
  const [questionSearch, setQuestionSearch] = useState('');
  const [debouncedQuestionSearch, setDebouncedQuestionSearch] = useState('');
  const [poolPage, setPoolPage] = useState(1);
  const [poolTotalPages, setPoolTotalPages] = useState(1);
  const [poolTotal, setPoolTotal] = useState(0);
  const [poolJumpPage, setPoolJumpPage] = useState('1');
  const [poolLoading, setPoolLoading] = useState(false);
  const prioritizeQIdsRef = useRef<number[]>([]);
  const [localQuestions, setLocalQuestions] = useState<FormQuestionItem[]>([]);
  const [localModalOpen, setLocalModalOpen] = useState(false);

  // Cascading dropdowns inside Form Modal
  const [formTopics, setFormTopics] = useState<TopicDto[]>([]);
  const [formLessons, setFormLessons] = useState<LessonDto[]>([]);
  const [formSections, setFormSections] = useState<SectionDto[]>([]);

  // Fetch tests, presets and questions
  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/admin/tests');
      setTests(res.data.tests ?? []);
    } catch {
      onToast('Không tải được danh sách đề thi', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  const fetchPresets = useCallback(async () => {
    try {
      const res = await client.get('/api/admin/test-presets');
      setPresets(res.data.presets ?? []);
    } catch {
      // ignore silently
    }
  }, []);

  const fetchQuestionsPool = useCallback(async (
    pageToFetch: number = poolPage,
    searchVal: string = debouncedQuestionSearch,
    prioritizeList?: number[]
  ) => {
    try {
      setPoolLoading(true);
      const pList = prioritizeList !== undefined ? prioritizeList : prioritizeQIdsRef.current;
      const params: any = {
        page: pageToFetch,
        limit: 50,
      };
      if (searchVal && searchVal.trim()) {
        params.search = searchVal.trim();
      }
      if (pList && pList.length > 0) {
        params.prioritizeIds = pList.join(',');
      }

      const res = await client.get('/api/admin/questions', { params });
      setQuestions(res.data.questions ?? []);
      setPoolTotal(res.data.total ?? (res.data.questions ?? []).length);
      setPoolTotalPages(res.data.totalPages ?? 1);
    } catch {
      // ignore silently
    } finally {
      setPoolLoading(false);
    }
  }, [poolPage, debouncedQuestionSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuestionSearch(questionSearch);
      setPoolPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [questionSearch]);

  useEffect(() => {
    setPoolJumpPage(String(poolPage));
  }, [poolPage]);

  useEffect(() => {
    if (modalOpen) {
      fetchQuestionsPool(poolPage, debouncedQuestionSearch);
    }
  }, [modalOpen, poolPage, debouncedQuestionSearch, fetchQuestionsPool]);

  useEffect(() => {
    fetchTests();
    fetchPresets();
    client.get('/api/content/grades').then((r) => {
      setGrades(r.data.grades ?? []);
    }).catch(() => onToast('Không tải được danh sách khối lớp', 'error'));
  }, [fetchTests, fetchPresets, onToast]);

  // Cascade loads for form Modal
  useEffect(() => {
    if (!form.gradeId) { setFormTopics([]); setFormLessons([]); setFormSections([]); return; }
    client.get(`/api/content/grades/${form.gradeId}/topics`).then(r => setFormTopics(r.data.topics ?? []));
  }, [form.gradeId]);

  useEffect(() => {
    if (!form.topicId) { setFormLessons([]); setFormSections([]); return; }
    client.get(`/api/content/topics/${form.topicId}/lessons`).then(r => setFormLessons(r.data.lessons ?? []));
  }, [form.topicId]);

  useEffect(() => {
    if (!form.lessonId) { setFormSections([]); return; }
    client.get(`/api/content/lessons/${form.lessonId}/sections`).then(r => setFormSections(r.data.sections ?? []));
  }, [form.lessonId]);

  const openCreate = () => {
    setEditTest(null);
    setForm(EMPTY_FORM);
    setSelectedQIds([]);
    prioritizeQIdsRef.current = [];
    setExpandedQIds(new Set());
    setQuestionTab('BANK');
    setQuestionSearch('');
    setDebouncedQuestionSearch('');
    setPoolPage(1);
    setPoolJumpPage('1');
    setLocalQuestions([]);
    setLocalModalOpen(false);
    setModalOpen(true);
  };

  const openEdit = async (t: AdminTestDto) => {
    const initSelected = t.questionIds ?? [];
    setEditTest(t);
    setQuestionTab('BANK');
    setQuestionSearch('');
    setDebouncedQuestionSearch('');
    setPoolPage(1);
    setPoolJumpPage('1');
    setSelectedQIds(initSelected);
    prioritizeQIdsRef.current = initSelected;
    setLocalQuestions([]);
    setLocalModalOpen(false);

    const scopeTypeVal = (t.scopeType as any) || 'GRADE';
    const scopeIdVal = t.scopeId;

    let gradeId = '';
    let topicId = '';
    let lessonId = '';
    let sectionId = '';

    if (scopeTypeVal === 'GRADE' && scopeIdVal) {
      gradeId = String(scopeIdVal);
    } else if (scopeIdVal && scopeTypeVal !== 'NATIONAL') {
      try {
        const lineageRes = await client.get('/api/content/scope-lineage', {
          params: { scopeType: scopeTypeVal, scopeId: scopeIdVal },
        });
        const lineage = lineageRes.data || {};
        if (lineage.gradeId) gradeId = String(lineage.gradeId);
        if (lineage.topicId) topicId = String(lineage.topicId);
        if (lineage.lessonId) lessonId = String(lineage.lessonId);
        if (lineage.sectionId) sectionId = String(lineage.sectionId);
      } catch {
        if (scopeTypeVal === 'TOPIC') topicId = String(scopeIdVal);
        else if (scopeTypeVal === 'LESSON') lessonId = String(scopeIdVal);
        else if (scopeTypeVal === 'SECTION') sectionId = String(scopeIdVal);
      }
    }

    setForm({
      title: t.title,
      summary: t.summary ?? '',
      presetId: t.presetId ?? '',
      scopeType: scopeTypeVal,
      gradeId,
      topicId,
      lessonId,
      sectionId,
      isNationalTest: t.isNationalTest !== false,
      isPro: !!t.isPro,
      imgUrl: t.imgUrl ?? ''
    });
    setSelectedQIds(t.questionIds ?? []);
    setExpandedQIds(new Set());
    setModalOpen(true);
  };

  const toggleQuestionExpand = (qid: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedQIds(prev => {
      const next = new Set(prev);
      if (next.has(qid)) {
        next.delete(qid);
      } else {
        next.add(qid);
      }
      return next;
    });
  };

  const toggleQuestionSelection = (qid: number) => {
    setSelectedQIds(prev =>
      prev.includes(qid) ? prev.filter(id => id !== qid) : [...prev, qid]
    );
  };

  const handleSave = async () => {
    if (!form.title || !form.presetId) {
      onToast('Vui lòng nhập tiêu đề và chọn mẫu đề thi', 'error');
      return;
    }

    // Resolve scopeId
    let scopeId: number | null = null;
    if (form.scopeType === 'GRADE') {
      if (!form.gradeId) return onToast('Vui lòng chọn Khối lớp', 'error');
      scopeId = Number(form.gradeId);
    } else if (form.scopeType === 'TOPIC') {
      if (!form.topicId) return onToast('Vui lòng chọn Chủ đề', 'error');
      scopeId = Number(form.topicId);
    } else if (form.scopeType === 'LESSON') {
      if (!form.lessonId) return onToast('Vui lòng chọn Bài học', 'error');
      scopeId = Number(form.lessonId);
    } else if (form.scopeType === 'SECTION') {
      if (!form.sectionId) return onToast('Vui lòng chọn Phần', 'error');
      scopeId = Number(form.sectionId);
    }

    try {
      setSaving(true);

      // 1. Create staged local questions on backend, inheriting the test's scope
      const createdQIds: number[] = [];
      if (localQuestions.length > 0) {
        for (const qItem of localQuestions) {
          const diff = Number(qItem.difficulty) || 1;
          let answerDataJson: any = null;
          if (qItem.type === 'CHOOSE') {
            const options = qItem.answers.map(a => a.content.trim()).filter(Boolean);
            const correctOption = qItem.answers
              .map((a, i) => (a.isCorrect ? i : -1))
              .filter(i => i !== -1);
            answerDataJson = { options, correctOption };
          } else if (qItem.type === 'FILL') {
            const acceptedAnswers = qItem.answers.map(a => a.content.trim()).filter(Boolean);
            answerDataJson = { acceptedAnswers };
          } else if (qItem.type === 'MATCH') {
            const pairs = qItem.answers
              .filter(a => a.leftText.trim() && a.rightText.trim())
              .map(a => ({ [a.leftText.trim()]: a.rightText.trim() }));
            answerDataJson = { pairs };
          }

          const qPayload = {
            type: qItem.type,
            difficulty: diff,
            promptText: qItem.promptText.trim(),
            document: qItem.document.trim() || null,
            explanation: qItem.explanation.trim() || null,
            isActive: qItem.isActive !== false,
            scopeType: form.scopeType,
            scopeId: scopeId,
            answerDataJson,
            gradeId: form.gradeId ? Number(form.gradeId) : null,
            topicId: form.topicId ? Number(form.topicId) : null,
            lessonId: form.lessonId ? Number(form.lessonId) : null,
            sectionId: form.sectionId ? Number(form.sectionId) : null,
            nodeId: null,
          };

          const qRes = await client.post('/api/admin/questions', qPayload);
          const createdId = qRes.data?.id ?? qRes.data?.question?.id;
          if (createdId) {
            createdQIds.push(createdId);
          }
        }
      }

      const finalQuestionIds = Array.from(new Set([...selectedQIds, ...createdQIds]));

      const payload = {
        title: form.title,
        summary: form.summary || null,
        presetId: form.presetId,
        scopeType: form.scopeType,
        scopeId,
        isNationalTest: form.scopeType === 'NATIONAL',
        isPro: form.isPro,
        imgUrl: form.imgUrl.trim() || null,
        questionIds: finalQuestionIds,
      };

      if (editTest) {
        await client.patch(`/api/admin/tests/${editTest.id}`, payload);
        onToast(`Đã cập nhật đề thi ${form.title}`, 'success');
      } else {
        await client.post('/api/admin/tests', payload);
        onToast(`Đã tạo đề thi ${form.title}`, 'success');
      }
      setLocalQuestions([]);
      setModalOpen(false);
      fetchTests();
      fetchQuestionsPool();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu đề thi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/tests/${deleteTarget.id}`);
      onToast(`Đã xóa đề thi ${deleteTarget.title}`, 'success');
      setDeleteTarget(null);
      fetchTests();
    } catch (err: any) {
      onToast(getDeleteErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getScopeBadgeLabel = (t: AdminTestDto) => {
    if (t.scopeType === 'NATIONAL') return 'Quốc gia';
    if (t.scopeType === 'GRADE') return `Khối ${t.scopeId}`;
    if (t.scopeType === 'TOPIC') return `Chủ đề #${t.scopeId}`;
    if (t.scopeType === 'LESSON') {
      if (t.lesson) {
        const truncatedName = t.lesson.name.length > 25 ? `${t.lesson.name.substring(0, 25)}...` : t.lesson.name;
        return `Bài ${t.lesson.position}: ${truncatedName}`;
      }
      return `Bài #${t.scopeId}`;
    }
    if (t.scopeType === 'SECTION') return `Phần #${t.scopeId}`;
    return 'Chưa xác định';
  };

  const getPresetName = (presetId: string | null) => {
    if (!presetId) return 'N/A';
    const p = presets.find(pr => pr.id === presetId);
    return p ? p.name : `Mẫu #${presetId.substring(0, 6)}`;
  };

  const getPresetStats = (presetId: string | null) => {
    if (!presetId) return null;
    const p = presets.find(pr => pr.id === presetId);
    return p;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Quản lý đề thi (Thủ công)</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{tests.length} đề thi hiển thị</p>
        </div>
        <Button icon={<IconPlus size={16} />} onClick={openCreate}>Tạo đề thi</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : tests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <IconTest size={48} color="#94a3b8" />
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>Chưa có đề thi nào được tạo</p>
        </div>
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <th style={TH_STYLE}>Đề thi</th>
                <th style={TH_STYLE}>Mẫu đề</th>
                <th style={TH_STYLE}>Phạm vi liên kết</th>
                <th style={TH_STYLE}>Số câu hỏi gán</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t, idx) => {
                const stats = getPresetStats(t.presetId);
                const isExam = stats?.purposeType === 'EXAM';
                return (
                  <tr key={t.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {t.imgUrl && (
                          <img src={t.imgUrl} alt={t.title} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{t.title}</div>
                            {t.isPro && (
                              <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 800, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#ffffff', borderRadius: 6, textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(245,158,11,0.3)' }}>PRO</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.summary ?? 'Không có tóm tắt'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                      {stats ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
                              {stats.name}
                            </span>
                            <Tooltip text={isExam ? EXAM_TOOLTIP : PRACTICE_TOOLTIP}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  padding: '2px 7px',
                                  borderRadius: 6,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: isExam ? '#fee2e2' : '#ecfdf5',
                                  color: isExam ? '#ef4444' : '#047857',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <span>{isExam ? 'Kiểm tra' : 'Thử thách'}</span>
                                <span style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background: isExam ? '#fca5a5' : '#a7f3d0',
                                  color: isExam ? '#7f1d1d' : '#064e3b',
                                  fontSize: 8.5,
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: 1
                                }}>?</span>
                              </span>
                            </Tooltip>
                          </div>

                          <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#64748b' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <IconClock size={12} color="#64748b" /> {stats.timeLimit ? `${stats.timeLimit} phút` : 'Vô hạn'}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <IconTarget size={12} color="#64748b" /> Đạt: {stats.passThreshold}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 13 }}>{getPresetName(t.presetId)}</span>
                      )}
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#c37938' }} title={t.lesson?.name || undefined}>
                          {getScopeBadgeLabel(t)}
                        </span>
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                       <span style={{ fontWeight: 700, color: '#c37938' }}>{t.questionIds?.length ?? 0}</span> câu
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(t)} style={{ padding: '6px 12px', fontSize: 13 }}>Sửa</Button>
                        <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(t)} style={{ padding: '6px 12px', fontSize: 13 }}>Xóa</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} title={editTest ? `Sửa đề thi: ${editTest.title}` : 'Tạo đề thi mới'} onClose={() => setModalOpen(false)} width={1100}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>
          {/* Left Column: Form Fields */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 400 }}>
            {/* Scope Type & Test Preset */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select label="Mẫu cấu hình đề thi (Preset)" value={form.presetId} onChange={(e) => setForm(f => ({ ...f, presetId: e.target.value }))}>
                <option value="">Chọn một mẫu cấu hình</option>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.purposeType === 'EXAM' ? 'Kiểm tra' : 'Thử thách'})</option>)}
              </Select>

              <Select label="Cấp độ phạm vi (Scope Level)" value={form.scopeType} onChange={(e) => setForm(f => ({ ...f, scopeType: e.target.value as any }))}>
                <option value="NATIONAL">NATIONAL — Quốc gia</option>
                <option value="GRADE">GRADE — Khối lớp</option>
                <option value="LESSON">LESSON — Bài học</option>
              </Select>
            </div>

            {/* Selected Preset Info Card */}
            {(() => {
              const selectedPreset = presets.find(p => p.id === form.presetId);
              if (!selectedPreset) return null;
              const isExam = selectedPreset.purposeType === 'EXAM';
              const r = selectedPreset.difficultyRatioJson || {};
              return (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 12.5,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: '#334155' }}>Loại:</span>
                      <Tooltip text={isExam ? EXAM_TOOLTIP : PRACTICE_TOOLTIP}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: isExam ? '#fee2e2' : '#ecfdf5',
                            color: isExam ? '#ef4444' : '#047857',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <span>{isExam ? 'Kiểm tra' : 'Thử thách'}</span>
                          <span style={{
                            width: 13,
                            height: 13,
                            borderRadius: '50%',
                            background: isExam ? '#fca5a5' : '#a7f3d0',
                            color: isExam ? '#7f1d1d' : '#064e3b',
                            fontSize: 9,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1
                          }}>?</span>
                        </span>
                      </Tooltip>
                    </div>

                    <div style={{ display: 'flex', gap: 10, color: '#475569', fontSize: 12 }}>
                      <span><strong>Số câu:</strong> {selectedPreset.questionCount !== null ? `${selectedPreset.questionCount} câu` : 'Lấy tất cả'}</span>
                      <span><strong>Thời gian:</strong> {selectedPreset.timeLimit ? `${selectedPreset.timeLimit} phút` : 'Vô hạn'}</span>
                      <span><strong>Điểm đạt:</strong> {selectedPreset.passThreshold}%</span>
                    </div>
                  </div>

                  {/* Difficulty ratio distribution */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748b', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>Tỷ lệ độ khó:</span>
                    <span style={{ background: '#ecfdf5', color: '#047857', padding: '1px 6px', borderRadius: 4 }}>Mức 1: {r['1'] ?? 40}%</span>
                    <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: 4 }}>Mức 2: {r['2'] ?? 30}%</span>
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4 }}>Mức 3: {r['3'] ?? 20}%</span>
                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: 4 }}>Mức 4: {r['4'] ?? 10}%</span>
                  </div>
                </div>
              );
            })()}

            {/* Cascade selections depending on Scope Type */}
            {form.scopeType !== 'NATIONAL' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Select
                  label="Khối lớp"
                  value={form.gradeId}
                  onChange={(e) => setForm(f => ({ ...f, gradeId: e.target.value, topicId: '', lessonId: '', sectionId: '' }))}
                >
                  <option value="">Chọn Khối</option>
                  {grades.map(g => <option key={g.id} value={g.id}>Khối {g.id}</option>)}
                </Select>

                {form.scopeType === 'LESSON' && (
                  <>
                    <Select
                      label="Chủ đề"
                      value={form.topicId}
                      onChange={(e) => setForm(f => ({ ...f, topicId: e.target.value, lessonId: '', sectionId: '' }))}
                      disabled={!formTopics.length}
                    >
                      <option value="">Chọn Chủ đề</option>
                      {formTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>

                    <Select
                      label="Bài học"
                      value={form.lessonId}
                      onChange={(e) => setForm(f => ({ ...f, lessonId: e.target.value, sectionId: '' }))}
                      disabled={!formLessons.length}
                    >
                      <option value="">Chọn Bài học</option>
                      {formLessons.map(l => (
                        <option key={l.id} value={l.id}>
                          Bài {l.position ?? l.id}: {l.name}
                        </option>
                      ))}
                    </Select>
                  </>
                )}
              </div>
            )}

            <Input label="Tiêu đề đề thi" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ví dụ: Đề thi thử học kỳ II lớp 10" />
            <Input label="Mô tả tóm tắt" value={form.summary} onChange={(e) => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Mô tả ngắn gọn..." />
            <ImageUploadInput label="Hình ảnh đề thi" value={form.imgUrl} onChange={(val) => setForm(f => ({ ...f, imgUrl: val }))} placeholder="Đường dẫn ảnh hoặc tải lên..." />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input
                type="checkbox"
                id="test-is-pro"
                checked={form.isPro}
                onChange={(e) => setForm(f => ({ ...f, isPro: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="test-is-pro" style={{ fontSize: 14, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                Chỉ dành cho tài khoản PRO
              </label>
            </div>
          </div>

          {/* Vertical Divider */}
          <div style={{ width: 1, background: '#e2e8f0', alignSelf: 'stretch' }} />

          {/* Right Column: Question Selection & Creation */}
          <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', minWidth: 500 }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
              <button
                type="button"
                onClick={() => setQuestionTab('BANK')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 30,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: questionTab === 'BANK' ? '#4f46e5' : '#f1f5f9',
                  color: questionTab === 'BANK' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>Ngân hàng câu hỏi</span>
                <span style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 12,
                  background: questionTab === 'BANK' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: questionTab === 'BANK' ? '#ffffff' : '#475569',
                }}>
                  {selectedQIds.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQuestionTab('LOCAL')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 30,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: questionTab === 'LOCAL' ? '#4f46e5' : '#f1f5f9',
                  color: questionTab === 'LOCAL' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>Thêm câu hỏi mới</span>
                {localQuestions.length > 0 && (
                  <span style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 12,
                    background: questionTab === 'LOCAL' ? 'rgba(255,255,255,0.25)' : '#10b981',
                    color: '#ffffff',
                    fontWeight: 700
                  }}>
                    {localQuestions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: Bank Questions */}
            {questionTab === 'BANK' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo ID hoặc nội dung câu hỏi..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                  {questionSearch && (
                    <Button variant="ghost" onClick={() => setQuestionSearch('')} style={{ fontSize: 12, padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      Xóa lọc
                    </Button>
                  )}
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', maxHeight: '50vh' }}>
                  {poolLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <Spinner size={28} />
                    </div>
                  ) : questions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: 13 }}>
                      Không tìm thấy câu hỏi nào trong ngân hàng
                    </div>
                  ) : (
                    questions.map((q) => {
                      const isChecked = selectedQIds.includes(q.id);
                      const isExpanded = expandedQIds.has(q.id);
                      return (
                        <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', borderRadius: 8, background: isChecked ? '#f5f3ff' : '#ffffff', border: isChecked ? '1px solid #ddd6fe' : '1px solid #e2e8f0', transition: 'all 0.15s ease' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleQuestionSelection(q.id)}
                              style={{ cursor: 'pointer', marginTop: 3 }}
                            />
                            <div
                              onClick={(e) => toggleQuestionExpand(q.id, e)}
                              style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, cursor: 'pointer' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <span style={{ color: '#64748b', fontWeight: 600, fontSize: 12.5 }}>#{q.id}</span>
                                  <span style={{ background: '#e2e8f0', fontSize: 9.5, padding: '1px 5px', borderRadius: 4, fontWeight: 700, color: '#475569' }}>{q.type}</span>
                                </div>
                                <span style={{ fontSize: 11, color: '#c37938', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600 }}>
                                  {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    style={{
                                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s ease',
                                    }}
                                  >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                </span>
                              </div>

                              {!isExpanded && (
                                <div style={{
                                  color: '#334155',
                                  fontSize: 13,
                                  lineHeight: 1.4,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}>
                                  {stripHtml(q.promptText)}
                                </div>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 6, marginLeft: 22, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {/* Full prompt text */}
                              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 12.5, lineHeight: 1.4 }}>
                                {stripHtml(q.promptText)}
                              </div>

                              {/* Document if exists */}
                              {q.document && (
                                <div style={{ background: '#f1f5f9', padding: 8, borderRadius: 6, fontSize: 11.5, color: '#475569', borderLeft: '3px solid #cbd5e1' }}>
                                  <strong>Tài liệu:</strong> {stripHtml(q.document)}
                                </div>
                              )}

                              {/* Answer Choices */}
                              {q.answers && q.answers.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
                                  {q.answers.map((ans) => {
                                    let isAnsCorrect = ans.isCorrect;
                                    let answerText = ans.content;
                                    if (q.type === 'MATCH') {
                                      answerText = `${ans.leftText} ➔ ${ans.rightText}`;
                                      isAnsCorrect = true;
                                    } else if (q.type === 'FILL') {
                                      answerText = ans.correctAnswer || ans.content;
                                      isAnsCorrect = true;
                                    }
                                    return (
                                      <div key={ans.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: isAnsCorrect ? '#16a34a' : '#475569', fontWeight: isAnsCorrect ? 600 : 400 }}>
                                        <span style={{ fontSize: 13, lineHeight: 1 }}>{isAnsCorrect ? '✓' : '◦'}</span>
                                        <span style={{ flex: 1 }}>{stripHtml(answerText || '')}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Explanation */}
                              {q.explanation && (
                                <div style={{ fontSize: 11, color: '#a66228', padding: '6px 8px', background: '#fffbeb', borderRadius: 6, borderLeft: '3px solid #fbbf24' }}>
                                  <strong>Giải thích:</strong> {stripHtml(q.explanation)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination Controls for Question Pool */}
                {poolTotalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#ffffff',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: 8,
                    fontSize: 12,
                  }}>
                    <div style={{ color: '#64748b' }}>
                      <strong>{questions.length > 0 ? (poolPage - 1) * 50 + 1 : 0}</strong>–<strong>{Math.min(poolPage * 50, poolTotal)}</strong> / <strong>{poolTotal}</strong> câu
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Button
                        variant="secondary"
                        disabled={poolPage <= 1 || poolLoading}
                        onClick={() => setPoolPage(p => Math.max(1, p - 1))}
                        style={{ padding: '4px 8px', fontSize: 12 }}
                      >
                        Trước
                      </Button>

                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {Array.from({ length: poolTotalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === poolTotalPages || (p >= poolPage - 1 && p <= poolPage + 1))
                          .reduce<(number | string)[]>((acc, p, idx, arr) => {
                            if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                              acc.push('...');
                            }
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, pIdx) => {
                            if (typeof p === 'string') {
                              return <span key={`ellipsis-${pIdx}`} style={{ padding: '0 2px', color: '#94a3b8' }}>...</span>;
                            }
                            const isCurrent = p === poolPage;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setPoolPage(p)}
                                disabled={poolLoading}
                                style={{
                                  minWidth: 26,
                                  height: 26,
                                  padding: '0 4px',
                                  borderRadius: 6,
                                  border: isCurrent ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                                  background: isCurrent ? '#4f46e5' : '#ffffff',
                                  color: isCurrent ? '#ffffff' : '#334155',
                                  fontWeight: isCurrent ? 700 : 500,
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {p}
                              </button>
                            );
                          })}
                      </div>

                      <Button
                        variant="secondary"
                        disabled={poolPage >= poolTotalPages || poolLoading}
                        onClick={() => setPoolPage(p => Math.min(poolTotalPages, p + 1))}
                        style={{ padding: '4px 8px', fontSize: 12 }}
                      >
                        Sau
                      </Button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', marginLeft: 4 }}>
                        <span>Đến trang:</span>
                        <input
                          type="number"
                          min={1}
                          max={poolTotalPages}
                          value={poolJumpPage}
                          onChange={(e) => setPoolJumpPage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt(poolJumpPage, 10);
                              if (!isNaN(val) && val >= 1 && val <= poolTotalPages) {
                                setPoolPage(val);
                              }
                            }
                          }}
                          onBlur={() => {
                            const val = parseInt(poolJumpPage, 10);
                            if (!isNaN(val) && val >= 1 && val <= poolTotalPages) {
                              setPoolPage(val);
                            } else {
                              setPoolJumpPage(String(poolPage));
                            }
                          }}
                          style={{
                            width: 46,
                            height: 26,
                            padding: '0 2px',
                            textAlign: 'center',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Local Staged Questions */}
            {questionTab === 'LOCAL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                    {localQuestions.length === 0 ? 'Chưa có câu hỏi tự tạo nào' : `${localQuestions.length} câu hỏi mới thêm`}
                  </span>
                  <Button
                    icon={localQuestions.length > 0 ? <IconEdit size={14} /> : <IconPlus size={14} />}
                    onClick={() => setLocalModalOpen(true)}
                    style={{ padding: '6px 12px', fontSize: 13 }}
                  >
                    {localQuestions.length > 0 ? 'Chỉnh sửa câu hỏi mới thêm' : 'Thêm câu hỏi mới'}
                  </Button>
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', maxHeight: '50vh' }}>
                  {localQuestions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600 }}>Chưa có câu hỏi tự tạo nào cho đề thi này.</span>
                      <span style={{ fontSize: 12, color: '#64748b', maxWidth: 360 }}>
                        Nhấn nút <strong>"Thêm câu hỏi mới"</strong> ở trên để soạn câu hỏi trực tiếp hoặc nhập từ file Excel. Khi lưu đề thi, các câu hỏi này sẽ tự động được gán phạm vi tương ứng của đề thi.
                      </span>
                    </div>
                  ) : (
                    localQuestions.map((q, idx) => (
                      <div key={q.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#4f46e5' }}>#{idx + 1}</span>
                            <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{q.type}</span>
                            <span style={{ background: '#fef3c7', color: '#b45309', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Mức {q.difficulty}</span>
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>({q.answers.length} đáp án)</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Button variant="ghost" onClick={() => setLocalModalOpen(true)} style={{ padding: '2px 8px', fontSize: 12, color: '#64748b' }}>Sửa</Button>
                            <Button variant="danger" onClick={() => setLocalQuestions(prev => prev.filter((_, i) => i !== idx))} style={{ padding: '2px 8px', fontSize: 12 }}>Xóa</Button>
                          </div>
                        </div>
                        <div style={{ color: '#1e293b', fontSize: 13, lineHeight: 1.4, maxHeight: 60, overflowY: 'auto' }}>
                          {stripHtml(q.promptText)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editTest ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      {/* Sub-modal for creating / editing local staged questions */}
      <QuestionBatchModal
        open={localModalOpen}
        title={localQuestions.length > 0 ? 'Chỉnh sửa danh sách câu hỏi mới' : 'Thêm câu hỏi mới vào đề thi'}
        initialQuestions={localQuestions}
        onClose={() => setLocalModalOpen(false)}
        onSave={(qs) => {
          setLocalQuestions(qs);
          onToast(`Đã lưu ${qs.length} câu hỏi vào danh sách đề thi`, 'success');
        }}
        onToast={onToast}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa đề thi?"
        message={`Bạn có chắc chắn muốn xóa đề thi "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

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
