// src/components/content/TestPanel.tsx
import { useState, useEffect, useCallback } from 'react';
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

  const fetchQuestionsPool = useCallback(async () => {
    try {
      const res = await client.get('/api/admin/questions');
      setQuestions(res.data.questions ?? []);
    } catch {
      // ignore silently
    }
  }, []);

  useEffect(() => {
    fetchTests();
    fetchPresets();
    fetchQuestionsPool();
    client.get('/api/content/grades').then((r) => {
      setGrades(r.data.grades ?? []);
    }).catch(() => onToast('Không tải được danh sách khối lớp', 'error'));
  }, [fetchTests, fetchPresets, fetchQuestionsPool, onToast]);

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
    setModalOpen(true);
  };

  const openEdit = (t: AdminTestDto) => {
    setEditTest(t);

    const scopeTypeVal = (t.scopeType as any) || 'GRADE';
    const scopeIdVal = t.scopeId;

    let gradeId = '';
    let topicId = '';
    let lessonId = '';
    let sectionId = '';

    if (scopeTypeVal === 'GRADE' && scopeIdVal) gradeId = String(scopeIdVal);
    else if (scopeTypeVal === 'TOPIC' && scopeIdVal) {
      topicId = String(scopeIdVal);
      gradeId = String(t.gradeId ?? '');
    } else if (scopeTypeVal === 'LESSON' && scopeIdVal) {
      lessonId = String(scopeIdVal);
      topicId = String(t.topicId ?? '');
      gradeId = String(t.gradeId ?? '');
    } else if (scopeTypeVal === 'SECTION' && scopeIdVal) {
      sectionId = String(scopeIdVal);
      lessonId = String(t.lessonId ?? '');
      topicId = String(t.topicId ?? '');
      gradeId = String(t.gradeId ?? '');
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
    setModalOpen(true);
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
      const payload = {
        title: form.title,
        summary: form.summary || null,
        presetId: form.presetId,
        scopeType: form.scopeType,
        scopeId,
        isNationalTest: form.isNationalTest,
        isPro: form.isPro,
        imgUrl: form.imgUrl.trim() || null,
        questionIds: selectedQIds,
        // legacy backups
        gradeId: form.gradeId ? Number(form.gradeId) : null,
        topicId: form.topicId ? Number(form.topicId) : null,
        lessonId: form.lessonId ? Number(form.lessonId) : null,
        sectionId: form.sectionId ? Number(form.sectionId) : null
      };

      if (editTest) {
        await client.patch(`/api/admin/tests/${editTest.id}`, payload);
        onToast(`Đã cập nhật đề thi ${form.title}`, 'success');
      } else {
        await client.post('/api/admin/tests', payload);
        onToast(`Đã tạo đề thi ${form.title}`, 'success');
      }
      setModalOpen(false);
      fetchTests();
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
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa đề thi', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getScopeBadgeLabel = (t: AdminTestDto) => {
    if (t.scopeType === 'NATIONAL') return 'Quốc gia';
    if (t.scopeType === 'GRADE') return `Khối ${t.scopeId}`;
    if (t.scopeType === 'TOPIC') return `Chủ đề #${t.scopeId}`;
    if (t.scopeType === 'LESSON') return `Bài #${t.scopeId}`;
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
                <th style={TH_STYLE}>Mẫu cấu hình (Preset)</th>
                <th style={TH_STYLE}>Thông tinPreset</th>
                <th style={TH_STYLE}>Phạm vi liên kết</th>
                <th style={TH_STYLE}>Số câu hỏi gán</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t, idx) => {
                const stats = getPresetStats(t.presetId);
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
                      <span style={{ fontWeight: 600, color: '#090d16' }}>
                        {getPresetName(t.presetId)}
                      </span>
                    </td>
                    <td style={TD_STYLE}>
                      {stats ? (
                        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconClock size={13} color="#64748b" /> {stats.timeLimit ? `${stats.timeLimit} phút` : 'Vô hạn'}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconTarget size={13} color="#64748b" /> Vượt qua: {stats.passThreshold}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#c37938' }}>
                          {getScopeBadgeLabel(t)}
                        </span>
                        {t.isNationalTest && (
                          <span style={{ marginLeft: 6, padding: '2px 6px', background: '#fee2e2', color: '#ef4444', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                            Quốc gia
                          </span>
                        )}
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
      <Modal open={modalOpen} title={editTest ? `Sửa đề thi: ${editTest.title}` : 'Tạo đề thi mới'} onClose={() => setModalOpen(false)}>

        {/* Scope Type & Test Preset */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Select label="Mẫu cấu hình đề thi (Preset)" value={form.presetId} onChange={(e) => setForm(f => ({ ...f, presetId: e.target.value }))}>
            <option value="">Chọn một mẫu cấu hình</option>
            {presets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.purposeType === 'EXAM' ? 'Thi' : 'Luyện tập'})</option>)}
          </Select>

          <Select label="Cấp độ phạm vi (Scope Level)" value={form.scopeType} onChange={(e) => setForm(f => ({ ...f, scopeType: e.target.value as any }))}>
            <option value="NATIONAL">NATIONAL — Quốc gia</option>
            <option value="GRADE">GRADE — Khối lớp</option>
            <option value="TOPIC">TOPIC — Chủ đề</option>
            <option value="LESSON">LESSON — Bài học</option>
            <option value="SECTION">SECTION — Phần</option>
          </Select>
        </div>

        {/* Cascade selections depending on Scope Type */}
        {form.scopeType !== 'NATIONAL' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
            <Select
              label="Khối lớp"
              value={form.gradeId}
              onChange={(e) => setForm(f => ({ ...f, gradeId: e.target.value, topicId: '', lessonId: '', sectionId: '' }))}
            >
              <option value="">Chọn Khối</option>
              {grades.map(g => <option key={g.id} value={g.id}>Khối {g.id}</option>)}
            </Select>

            {['TOPIC', 'LESSON', 'SECTION'].includes(form.scopeType) && (
              <Select
                label="Chủ đề"
                value={form.topicId}
                onChange={(e) => setForm(f => ({ ...f, topicId: e.target.value, lessonId: '', sectionId: '' }))}
                disabled={!formTopics.length}
              >
                <option value="">Chọn Chủ đề</option>
                {formTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            )}

            {['LESSON', 'SECTION'].includes(form.scopeType) && (
              <Select
                label="Bài học"
                value={form.lessonId}
                onChange={(e) => setForm(f => ({ ...f, lessonId: e.target.value, sectionId: '' }))}
                disabled={!formLessons.length}
              >
                <option value="">Chọn Bài học</option>
                {formLessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            )}

            {form.scopeType === 'SECTION' && (
              <Select
                label="Phần"
                value={form.sectionId}
                onChange={(e) => setForm(f => ({ ...f, sectionId: e.target.value }))}
                disabled={!formSections.length}
              >
                <option value="">Chọn Phần</option>
                {formSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
          </div>
        )}

        <Input label="Tiêu đề đề thi" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ví dụ: Đề thi thử học kỳ II lớp 10" />
        <Input label="Mô tả tóm tắt" value={form.summary} onChange={(e) => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Mô tả ngắn gọn..." />
        <ImageUploadInput label="Hình ảnh đề thi" value={form.imgUrl} onChange={(val) => setForm(f => ({ ...f, imgUrl: val }))} placeholder="Đường dẫn ảnh hoặc tải lên..." />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Select label="Đề thi quốc gia" value={form.isNationalTest ? 'true' : 'false'} onChange={(e) => setForm(f => ({ ...f, isNationalTest: e.target.value === 'true' }))}>
            <option value="false">Không</option>
            <option value="true">Đúng (National Test)</option>
          </Select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
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

        {/* Question mapper */}
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            Gán câu hỏi tĩnh từ Ngân hàng ({selectedQIds.length} đã chọn)
          </label>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, height: 160, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {questions.map((q) => {
              const isChecked = selectedQIds.includes(q.id);
              return (
                <label key={q.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, background: isChecked ? '#f5f3ff' : 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleQuestionSelection(q.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: '#64748b', fontWeight: 600 }}>#{q.id}</span>
                  <span style={{ background: '#f1f5f9', fontSize: 10, padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>{q.type}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, color: '#334155' }}>
                    {stripHtml(q.promptText)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editTest ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

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
