// src/components/content/TestPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { AdminTestDto, AdminQuestionDto, GradeDto, TopicDto, LessonDto, SectionDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import {
  IconPlus,
  IconEdit,
  IconDelete,
  IconTest,
  IconClock,
  IconTarget,
  IconXP,
  IconGold,
  IconGrade,
  IconLesson,
  IconChevronRight
} from '../ui/Icons';

interface TestPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const EMPTY_FORM = {
  title: '',
  summary: '',
  isManual: false,
  isNationalTest: false,
  questionNumber: '10',
  timeLimit: '45',
  xpReward: '100',
  goldReward: '50',
  passThreshold: '70',
  gradeId: '',
  topicId: '',
  lessonId: '',
  sectionId: ''
};

export function TestPanel({ onToast }: TestPanelProps) {
  const [tests, setTests] = useState<AdminTestDto[]>([]);
  const [questions, setQuestions] = useState<AdminQuestionDto[]>([]);
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

  // 1. Fetch grades and tests on mount
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
    fetchQuestionsPool();
    client.get('/api/content/grades').then((r) => {
      setGrades(r.data.grades ?? []);
    }).catch(() => onToast('Không tải được danh sách khối lớp', 'error'));
  }, [fetchTests, fetchQuestionsPool, onToast]);

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
    setForm({
      title: t.title,
      summary: t.summary ?? '',
      isManual: t.isManual,
      isNationalTest: t.isNationalTest,
      questionNumber: String(t.questionNumber),
      timeLimit: String(t.timeLimit ?? ''),
      xpReward: String(t.xpReward),
      goldReward: String(t.goldReward),
      passThreshold: String(t.passThreshold),
      gradeId: String(t.gradeId ?? ''),
      topicId: String(t.topicId ?? ''),
      lessonId: String(t.lessonId ?? ''),
      sectionId: String(t.sectionId ?? '')
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
    const qNum = Number(form.questionNumber);
    const limit = form.timeLimit ? Number(form.timeLimit) : null;
    const xp = Number(form.xpReward);
    const gold = Number(form.goldReward);
    const threshold = Number(form.passThreshold);

    if (!form.title || isNaN(qNum) || isNaN(xp) || isNaN(gold) || isNaN(threshold)) {
      onToast('Vui lòng điền thông tin hợp lệ', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        summary: form.summary || null,
        isManual: form.isManual,
        isNationalTest: form.isNationalTest,
        questionNumber: qNum,
        timeLimit: limit,
        xpReward: xp,
        goldReward: gold,
        passThreshold: threshold,
        gradeId: form.gradeId ? Number(form.gradeId) : null,
        topicId: form.topicId ? Number(form.topicId) : null,
        lessonId: form.lessonId ? Number(form.lessonId) : null,
        sectionId: form.sectionId ? Number(form.sectionId) : null,
        questionIds: selectedQIds
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Quản lý đề thi</h2>
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
                <th style={TH_STYLE}>Thông tin thi</th>
                <th style={TH_STYLE}>Liên kết cấp</th>
                <th style={TH_STYLE}>Phần thưởng</th>
                <th style={TH_STYLE}>Số câu hỏi</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t, idx) => (
                <tr key={t.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                  <td style={TD_STYLE}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.summary ?? 'Không có tóm tắt'}</div>
                    </div>
                  </td>
                  <td style={TD_STYLE}>
                    <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconClock size={13} color="#64748b" /> {t.timeLimit ? `${t.timeLimit} phút` : 'Không giới hạn'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconTarget size={13} color="#64748b" /> Đạt từ: {t.passThreshold}%
                      </span>
                    </div>
                  </td>
                  <td style={TD_STYLE}>
                    <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {t.gradeId && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconGrade size={13} color="#6c63ff" /> Khối {t.gradeId}
                        </span>
                      )}
                      {t.lessonId && (
                        <>
                          <IconChevronRight size={10} color="#cbd5e1" />
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconLesson size={13} color="#16a34a" /> Bài {t.lessonId}
                          </span>
                        </>
                      )}
                      {t.isNationalTest && (
                        <span style={{ marginLeft: 6, padding: '2px 6px', background: '#fee2e2', color: '#ef4444', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                          Quốc gia
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={TD_STYLE}>
                    <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2563eb', fontWeight: 600 }}>
                        <IconXP size={13} color="#2563eb" /> {t.xpReward} XP
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#d97706', fontWeight: 600 }}>
                        <IconGold size={13} color="#d97706" /> {t.goldReward} Vàng
                      </span>
                    </div>
                  </td>
                  <td style={TD_STYLE}>
                    <span style={{ fontWeight: 700, color: '#6c63ff' }}>{t.questionIds.length}</span> / {t.questionNumber} câu
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(t)} style={{ padding: '6px 12px', fontSize: 13 }}>Sửa</Button>
                      <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(t)} style={{ padding: '6px 12px', fontSize: 13 }}>Xóa</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} title={editTest ? `Sửa đề thi: ${editTest.title}` : 'Tạo đề thi mới'} onClose={() => setModalOpen(false)}>
        {/* Cascade selections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          <Select label="Khối lớp" value={form.gradeId} onChange={(e) => setForm(f => ({ ...f, gradeId: e.target.value }))}>
            <option value="">Chọn Khối</option>
            {grades.map(g => <option key={g.id} value={g.id}>Khối {g.id}</option>)}
          </Select>
          <Select label="Chủ đề" value={form.topicId} onChange={(e) => setForm(f => ({ ...f, topicId: e.target.value }))} disabled={!formTopics.length}>
            <option value="">Chọn Chủ đề</option>
            {formTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select label="Bài học" value={form.lessonId} onChange={(e) => setForm(f => ({ ...f, lessonId: e.target.value }))} disabled={!formLessons.length}>
            <option value="">Chọn Bài học</option>
            {formLessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select label="Phần" value={form.sectionId} onChange={(e) => setForm(f => ({ ...f, sectionId: e.target.value }))} disabled={!formSections.length}>
            <option value="">Chọn Phần</option>
            {formSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>

        <Input label="Tiêu đề đề thi" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ví dụ: Đề thi khảo sát kỳ I lớp 12" />
        <Input label="Mô tả tóm tắt" value={form.summary} onChange={(e) => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Mô tả ngắn gọn về đề thi..." />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <Input label="Số câu hỏi" type="number" value={form.questionNumber} onChange={(e) => setForm(f => ({ ...f, questionNumber: e.target.value }))} />
          <Input label="Thời gian (phút)" type="number" value={form.timeLimit} onChange={(e) => setForm(f => ({ ...f, timeLimit: e.target.value }))} placeholder="Bỏ trống nếu vô hạn" />
          <Input label="XP thưởng" type="number" value={form.xpReward} onChange={(e) => setForm(f => ({ ...f, xpReward: e.target.value }))} />
          <Input label="Vàng thưởng" type="number" value={form.goldReward} onChange={(e) => setForm(f => ({ ...f, goldReward: e.target.value }))} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Input label="Điểm đạt (%)" type="number" value={form.passThreshold} onChange={(e) => setForm(f => ({ ...f, passThreshold: e.target.value }))} />
          <Select label="Tự thiết kế câu hỏi" value={form.isManual ? 'true' : 'false'} onChange={(e) => setForm(f => ({ ...f, isManual: e.target.value === 'true' }))}>
            <option value="false">Không (Dùng hệ thống)</option>
            <option value="true">Có (Tự nhập tay)</option>
          </Select>
          <Select label="Đề thi quốc gia" value={form.isNationalTest ? 'true' : 'false'} onChange={(e) => setForm(f => ({ ...f, isNationalTest: e.target.value === 'true' }))}>
            <option value="false">Không</option>
            <option value="true">Đúng (National Test)</option>
          </Select>
        </div>

        {/* Question mapper */}
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            Gán câu hỏi từ Ngân hàng ({selectedQIds.length} đã chọn)
          </label>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, height: 140, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                    {q.promptText}
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
        message={`Bạn có chắc chắn muốn xóa đề thi "${deleteTarget?.title}"? Mối liên kết tới các câu hỏi sẽ bị xóa, nhưng câu hỏi gốc vẫn được bảo toàn trong ngân hàng.`}
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
