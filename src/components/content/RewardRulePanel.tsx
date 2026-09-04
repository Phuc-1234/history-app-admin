// src/components/content/RewardRulePanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type {
  RewardRuleDto,
  RewardTriggerType,
  ItemDefinitionDto,
  GradeDto,
  TopicDto,
  LessonDto,
  SectionDto,
  NodeDto,
  AdminTestDto,
  TierDto
} from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconXP, IconGold, IconSearch } from '../ui/Icons';
import { getDeleteErrorMessage } from '../../utils/deleteHelper';

interface RewardRulePanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

export interface SectionWithDepth extends SectionDto {
  depth: number;
}

function flattenSectionTree(treeSections: SectionDto[] = []): { flatSections: SectionWithDepth[]; flatNodes: NodeDto[] } {
  const flatSections: SectionWithDepth[] = [];
  const flatNodes: NodeDto[] = [];
  const traverse = (sList: SectionDto[], depth = 0) => {
    for (const s of sList) {
      flatSections.push({ ...s, depth });
      if (s.nodes) {
        flatNodes.push(...s.nodes);
      }
      if (s.children) {
        traverse(s.children, depth + 1);
      }
    }
  };
  traverse(treeSections, 0);
  return { flatSections, flatNodes };
}

const TRIGGER_TYPES: { value: RewardTriggerType; label: string; desc: string }[] = [
  { value: 'MANUAL_TEST_COMPLETE', label: 'Làm đề thi cụ thể', desc: 'Quy tắc áp dụng khi hoàn thành đề thi có ID cụ thể.' },
  { value: 'AUTO_NODE_TEST_COMPLETE', label: 'Đề không cố định (nút kiến thức)', desc: 'Áp dụng cho bài kiểm tra đề không cố định của Nút kiến thức (Node).' },
  { value: 'AUTO_SECTION_TEST_COMPLETE', label: 'Đề không cố định (phần học)', desc: 'Áp dụng cho bài kiểm tra đề không cố định của Phần học (Section).' },
  { value: 'AUTO_LESSON_TEST_COMPLETE', label: 'Đề không cố định (bài học)', desc: 'Áp dụng cho bài kiểm tra đề không cố định của Bài học (Lesson).' },
  { value: 'AUTO_TOPIC_TEST_COMPLETE', label: 'Đề không cố định (chủ đề)', desc: 'Áp dụng cho bài kiểm tra đề không cố định của Chủ đề (Topic).' },
  { value: 'AUTO_GRADE_TEST_COMPLETE', label: 'Đề không cố định (khối lớp)', desc: 'Áp dụng cho bài kiểm tra đề không cố định của Khối lớp (Grade).' },
  { value: 'AUTO_PERSONAL_PRACTICE_COMPLETE', label: 'Luyện tập cá nhân', desc: 'Áp dụng cho bài luyện tập cá nhân tự động (Personal Practice).' },
  { value: 'AUTO_WRONG_PRACTICE_COMPLETE', label: 'Luyện tập câu sai', desc: 'Áp dụng cho bài luyện tập các câu trả lời sai (Wrong Practice).' },
  { value: 'STREAK_REACHED', label: 'Đạt chuỗi ngày học', desc: 'Áp dụng khi người dùng đạt cột mốc chuỗi ngày học liên tục.' },
  { value: 'TIER_REACHED', label: 'Lên hạng danh hiệu', desc: 'Áp dụng khi người dùng đạt cột mốc chỉ mục danh hiệu nhất định.' }
];

const TRIGGER_LABELS: Record<RewardTriggerType, string> = {
  MANUAL_TEST_COMPLETE: 'Đề thi cụ thể',
  AUTO_NODE_TEST_COMPLETE: 'Đề không cố định (nút kiến thức)',
  AUTO_SECTION_TEST_COMPLETE: 'Đề không cố định (phần học)',
  AUTO_LESSON_TEST_COMPLETE: 'Đề không cố định (bài học)',
  AUTO_TOPIC_TEST_COMPLETE: 'Đề không cố định (chủ đề)',
  AUTO_GRADE_TEST_COMPLETE: 'Đề không cố định (khối lớp)',
  AUTO_PERSONAL_PRACTICE_COMPLETE: 'Luyện tập cá nhân',
  AUTO_WRONG_PRACTICE_COMPLETE: 'Luyện tập câu sai',
  STREAK_REACHED: 'Chuỗi ngày học',
  TIER_REACHED: 'Hạng danh hiệu',
};

const TRIGGER_COLORS: Record<RewardTriggerType, { bg: string; color: string; border: string }> = {
  MANUAL_TEST_COMPLETE: { bg: 'rgba(99,102,241,0.08)', color: '#4f46e5', border: 'rgba(99,102,241,0.2)' },
  AUTO_NODE_TEST_COMPLETE: { bg: 'rgba(16,185,129,0.08)', color: '#059669', border: 'rgba(16,185,129,0.2)' },
  AUTO_SECTION_TEST_COMPLETE: { bg: 'rgba(16,185,129,0.08)', color: '#059669', border: 'rgba(16,185,129,0.2)' },
  AUTO_LESSON_TEST_COMPLETE: { bg: 'rgba(16,185,129,0.08)', color: '#059669', border: 'rgba(16,185,129,0.2)' },
  AUTO_TOPIC_TEST_COMPLETE: { bg: 'rgba(16,185,129,0.08)', color: '#059669', border: 'rgba(16,185,129,0.2)' },
  AUTO_GRADE_TEST_COMPLETE: { bg: 'rgba(16,185,129,0.08)', color: '#059669', border: 'rgba(16,185,129,0.2)' },
  AUTO_PERSONAL_PRACTICE_COMPLETE: { bg: 'rgba(2,132,199,0.08)', color: '#0284c7', border: 'rgba(2,132,199,0.2)' },
  AUTO_WRONG_PRACTICE_COMPLETE: { bg: 'rgba(239,68,68,0.08)', color: '#dc2626', border: 'rgba(239,68,68,0.2)' },
  STREAK_REACHED: { bg: 'rgba(245,158,11,0.08)', color: '#d97706', border: 'rgba(245,158,11,0.2)' },
  TIER_REACHED: { bg: 'rgba(236,72,153,0.08)', color: '#db2777', border: 'rgba(236,72,153,0.2)' },
};

const EMPTY_FORM = {
  triggerType: 'MANUAL_TEST_COMPLETE' as RewardTriggerType,
  triggerTargetId: '',
  triggerTimeMin: '1',
  triggerTimeMax: '',
  xp: '10',
  gold: '5',
  items: [] as { itemDefinitionId: number; quantity: number }[]
};

export function RewardRulePanel({ onToast }: RewardRulePanelProps) {
  const [rules, setRules] = useState<RewardRuleDto[]>([]);
  const [itemDefs, setItemDefs] = useState<ItemDefinitionDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Additional data for scope and direct selection
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [tests, setTests] = useState<AdminTestDto[]>([]);
  const [tiers, setTiers] = useState<TierDto[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal & Edit states
  const [modalOpen, setModalOpen] = useState(false);
  const [editRule, setEditRule] = useState<RewardRuleDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Cascading scope states inside modal form
  const [scopeGradeId, setScopeGradeId] = useState('');
  const [scopeTopicId, setScopeTopicId] = useState('');
  const [scopeLessonId, setScopeLessonId] = useState('');
  const [scopeSectionId, setScopeSectionId] = useState('');
  const [scopeNodeId, setScopeNodeId] = useState('');

  // Cascading options lists
  const [formTopics, setFormTopics] = useState<TopicDto[]>([]);
  const [formLessons, setFormLessons] = useState<LessonDto[]>([]);
  const [formSections, setFormSections] = useState<SectionWithDepth[]>([]);
  const [formNodes, setFormNodes] = useState<NodeDto[]>([]);

  // Deletion states
  const [deleteTarget, setDeleteTarget] = useState<RewardRuleDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Rules & Item Definitions
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/admin/reward-rules');
      setRules(res.data.rules ?? []);
    } catch {
      onToast('Không tải được danh sách quy tắc phần thưởng', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  const fetchItemDefs = useCallback(async () => {
    try {
      const res = await client.get('/api/admin/item-definitions');
      setItemDefs(res.data.items ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchItemDefs();
    client.get('/api/content/grades').then(r => setGrades(r.data.grades ?? [])).catch(() => {});
    client.get('/api/admin/tests').then(r => setTests(r.data.tests ?? [])).catch(() => {});
    client.get('/api/admin/tiers').then(r => setTiers(r.data.tiers ?? [])).catch(() => {});
  }, [fetchRules, fetchItemDefs]);

  // Cascade loads for form Modal
  useEffect(() => {
    if (!scopeGradeId) {
      setFormTopics([]);
      setFormLessons([]);
      setFormSections([]);
      setFormNodes([]);
      return;
    }
    client.get(`/api/content/grades/${scopeGradeId}/topics`).then(r => setFormTopics(r.data.topics ?? [])).catch(() => setFormTopics([]));
  }, [scopeGradeId]);

  useEffect(() => {
    if (!scopeTopicId) {
      setFormLessons([]);
      setFormSections([]);
      setFormNodes([]);
      return;
    }
    client.get(`/api/content/topics/${scopeTopicId}/lessons`).then(r => setFormLessons(r.data.lessons ?? [])).catch(() => setFormLessons([]));
  }, [scopeTopicId]);

  useEffect(() => {
    if (!scopeLessonId) {
      setFormSections([]);
      setFormNodes([]);
      return;
    }
    client.get(`/api/content/lessons/${scopeLessonId}/tree`).then(r => {
      const { flatSections, flatNodes } = flattenSectionTree(r.data?.sections ?? []);
      setFormSections(flatSections);
      setFormNodes(flatNodes);
    }).catch(() => {
      setFormSections([]);
      setFormNodes([]);
    });
  }, [scopeLessonId]);

  useEffect(() => {
    if (!scopeSectionId) {
      setFormNodes([]);
      return;
    }
    client.get(`/api/content/sections/${scopeSectionId}/nodes`).then(r => setFormNodes(r.data.nodes ?? [])).catch(() => setFormNodes([]));
  }, [scopeSectionId]);

  // Handlers
  const openCreate = () => {
    setEditRule(null);
    setForm(EMPTY_FORM);
    setScopeGradeId('');
    setScopeTopicId('');
    setScopeLessonId('');
    setScopeSectionId('');
    setScopeNodeId('');
    setModalOpen(true);
  };

  const openEdit = async (rule: RewardRuleDto) => {
    setEditRule(rule);
    const targetId = rule.triggerTargetId ?? '';
    setForm({
      triggerType: rule.triggerType,
      triggerTargetId: targetId,
      triggerTimeMin: String(rule.triggerTimeMin),
      triggerTimeMax: rule.triggerTimeMax !== null ? String(rule.triggerTimeMax) : '',
      xp: String(rule.xp),
      gold: String(rule.gold),
      items: (rule.rewardRuleItems || []).map(ri => ({
        itemDefinitionId: ri.itemDefinitionId,
        quantity: ri.quantity
      }))
    });

    setScopeGradeId('');
    setScopeTopicId('');
    setScopeLessonId('');
    setScopeSectionId('');
    setScopeNodeId('');

    if (rule.triggerType === 'AUTO_GRADE_TEST_COMPLETE') {
      setScopeGradeId(targetId);
    } else if (targetId && ['AUTO_TOPIC_TEST_COMPLETE', 'AUTO_LESSON_TEST_COMPLETE', 'AUTO_SECTION_TEST_COMPLETE', 'AUTO_NODE_TEST_COMPLETE'].includes(rule.triggerType)) {
      const scopeTypeMap: Record<string, string> = {
        AUTO_TOPIC_TEST_COMPLETE: 'TOPIC',
        AUTO_LESSON_TEST_COMPLETE: 'LESSON',
        AUTO_SECTION_TEST_COMPLETE: 'SECTION',
        AUTO_NODE_TEST_COMPLETE: 'NODE',
      };
      const sType = scopeTypeMap[rule.triggerType];
      if (sType) {
        try {
          const lineageRes = await client.get('/api/content/scope-lineage', {
            params: { scopeType: sType, scopeId: targetId }
          });
          const lineage = lineageRes.data || {};
          if (lineage.gradeId) setScopeGradeId(String(lineage.gradeId));
          if (lineage.topicId) setScopeTopicId(String(lineage.topicId));
          if (lineage.lessonId) setScopeLessonId(String(lineage.lessonId));
          if (lineage.sectionId) setScopeSectionId(String(lineage.sectionId));
          if (lineage.nodeId) setScopeNodeId(String(lineage.nodeId));
        } catch {
          if (sType === 'TOPIC') setScopeTopicId(targetId);
          else if (sType === 'LESSON') setScopeLessonId(targetId);
          else if (sType === 'SECTION') setScopeSectionId(targetId);
          else if (sType === 'NODE') setScopeNodeId(targetId);
        }
      }
    }

    setModalOpen(true);
  };

  const handleTriggerTypeChange = (nextType: RewardTriggerType) => {
    setForm(prev => ({
      ...prev,
      triggerType: nextType,
      triggerTargetId: ''
    }));
    setScopeGradeId('');
    setScopeTopicId('');
    setScopeLessonId('');
    setScopeSectionId('');
    setScopeNodeId('');
  };

  const handleSave = async () => {
    const minTime = Number(form.triggerTimeMin);
    const maxTime = form.triggerTimeMax ? Number(form.triggerTimeMax) : null;
    const xpVal = Number(form.xp);
    const goldVal = Number(form.gold);

    if (isNaN(minTime) || minTime < 1) {
      onToast('lần kích hoạt tối thiểu phải lớn hơn hoặc bằng 1', 'error');
      return;
    }

    if (maxTime !== null && (isNaN(maxTime) || maxTime < minTime)) {
      onToast('lần kích hoạt tối đa phải lớn hơn hoặc bằng lượt tối thiểu', 'error');
      return;
    }

    if (isNaN(xpVal) || xpVal < 0 || isNaN(goldVal) || goldVal < 0) {
      onToast('Điểm XP và Vàng phải là số không âm', 'error');
      return;
    }

    if (form.triggerType === 'STREAK_REACHED' && !form.triggerTargetId.trim()) {
      onToast('Vui lòng nhập mốc chuỗi ngày học', 'error');
      return;
    }

    if (form.triggerType === 'TIER_REACHED' && !form.triggerTargetId.trim()) {
      onToast('Vui lòng chọn hạng danh hiệu', 'error');
      return;
    }

    // Validate form items
    for (const item of form.items) {
      if (!item.itemDefinitionId) {
        onToast('Vui lòng chọn vật phẩm', 'error');
        return;
      }
      if (isNaN(item.quantity) || item.quantity < 1) {
        onToast('Số lượng vật phẩm phải lớn hơn hoặc bằng 1', 'error');
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        triggerType: form.triggerType,
        triggerTargetId:
          form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'
            ? null
            : form.triggerTargetId.trim() || null,
        triggerTimeMin: minTime,
        triggerTimeMax: maxTime,
        xp: xpVal,
        gold: goldVal,
        rewardRuleItems: form.items
      };

      if (editRule) {
        await client.patch(`/api/admin/reward-rules/${editRule.id}`, payload);
        onToast('Đã cập nhật quy tắc phần thưởng thành công', 'success');
      } else {
        await client.post('/api/admin/reward-rules', payload);
        onToast('Đã tạo quy tắc phần thưởng thành công', 'success');
      }
      setModalOpen(false);
      fetchRules();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu quy tắc phần thưởng', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/reward-rules/${deleteTarget.id}`);
      onToast('Đã xóa quy tắc phần thưởng thành công', 'success');
      setDeleteTarget(null);
      fetchRules();
    } catch (err: any) {
      onToast(getDeleteErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const renderTargetDisplay = (rule: RewardRuleDto) => {
    if (!rule.triggerTargetId) return 'Mặc định (Tất cả)';
    if (rule.triggerType === 'MANUAL_TEST_COMPLETE') {
      const t = tests.find(x => x.id === rule.triggerTargetId);
      return t ? t.title : 'Đề thi cụ thể';
    }
    if (rule.triggerType === 'TIER_REACHED') {
      const tier = tiers.find(x => String(x.index) === rule.triggerTargetId);
      return tier ? `${tier.name} (Hạng #${tier.index})` : `Hạng #${rule.triggerTargetId}`;
    }
    if (rule.triggerType === 'STREAK_REACHED') {
      return `Mốc ${rule.triggerTargetId} ngày`;
    }
    if (rule.triggerType === 'AUTO_GRADE_TEST_COMPLETE') {
      return `Khối ${rule.triggerTargetId}`;
    }
    return `ID: ${rule.triggerTargetId}`;
  };

  const renderTargetSelector = () => {
    switch (form.triggerType) {
      case 'MANUAL_TEST_COMPLETE':
        return (
          <Select
            label="Chọn đề thi cụ thể"
            value={form.triggerTargetId}
            onChange={(e) => setForm(prev => ({ ...prev, triggerTargetId: e.target.value }))}
            hint="Chọn một đề thi cụ thể hoặc để 'Tất cả đề thi' làm mặc định."
          >
            <option value="">-- Tất cả đề thi (Mặc định) --</option>
            {tests.map(t => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        );

      case 'TIER_REACHED':
        return (
          <Select
            label="Chọn hạng danh hiệu"
            value={form.triggerTargetId}
            onChange={(e) => setForm(prev => ({ ...prev, triggerTargetId: e.target.value }))}
            hint="Chọn hạng danh hiệu người dùng đạt tới để nhận thưởng."
          >
            <option value="">-- Chọn hạng danh hiệu --</option>
            {tiers.map(t => (
              <option key={t.index} value={String(t.index)}>
                {t.name} (Hạng #{t.index} — Yêu cầu {t.xpThreshold} XP)
              </option>
            ))}
          </Select>
        );

      case 'STREAK_REACHED':
        return (
          <Input
            label="Mốc chuỗi (Số ngày liên tục)"
            type="number"
            min="1"
            placeholder="Ví dụ: 7, 30..."
            value={form.triggerTargetId}
            onChange={(e) => setForm(prev => ({ ...prev, triggerTargetId: e.target.value }))}
            hint="BẮT BUỘC: Nhập số ngày đạt chuỗi làm mục tiêu (ví dụ: 7, 30)."
          />
        );

      case 'AUTO_GRADE_TEST_COMPLETE':
        return (
          <Select
            label="Chọn khối lớp"
            value={scopeGradeId}
            onChange={(e) => {
              const val = e.target.value;
              setScopeGradeId(val);
              setForm(prev => ({ ...prev, triggerTargetId: val }));
            }}
            hint="Chọn khối lớp cụ thể hoặc để 'Tất cả khối lớp' làm mặc định."
          >
            <option value="">-- Tất cả khối lớp (Mặc định) --</option>
            {grades.map(g => (
              <option key={g.id} value={String(g.id)}>
                Khối {g.id}
              </option>
            ))}
          </Select>
        );

      case 'AUTO_TOPIC_TEST_COMPLETE':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <Select
              label="Khối lớp"
              value={scopeGradeId}
              onChange={(e) => {
                const val = e.target.value;
                setScopeGradeId(val);
                setScopeTopicId('');
                setForm(prev => ({ ...prev, triggerTargetId: '' }));
              }}
            >
              <option value="">-- Chọn khối lớp --</option>
              {grades.map(g => (
                <option key={g.id} value={String(g.id)}>
                  Khối {g.id}
                </option>
              ))}
            </Select>

            <Select
              label="Chọn chủ đề (Mục tiêu áp dụng)"
              value={scopeTopicId}
              disabled={!scopeGradeId}
              onChange={(e) => {
                const val = e.target.value;
                setScopeTopicId(val);
                setForm(prev => ({ ...prev, triggerTargetId: val }));
              }}
              hint="Chọn chủ đề hoặc để 'Tất cả chủ đề' làm mặc định."
            >
              <option value="">-- Tất cả chủ đề (Mặc định) --</option>
              {formTopics.map(t => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        );

      case 'AUTO_LESSON_TEST_COMPLETE':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
              <Select
                label="Khối lớp"
                value={scopeGradeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeGradeId(val);
                  setScopeTopicId('');
                  setScopeLessonId('');
                  setForm(prev => ({ ...prev, triggerTargetId: '' }));
                }}
              >
                <option value="">-- Chọn khối --</option>
                {grades.map(g => (
                  <option key={g.id} value={String(g.id)}>
                    Khối {g.id}
                  </option>
                ))}
              </Select>

              <Select
                label="Chủ đề"
                value={scopeTopicId}
                disabled={!scopeGradeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeTopicId(val);
                  setScopeLessonId('');
                  setForm(prev => ({ ...prev, triggerTargetId: '' }));
                }}
              >
                <option value="">-- Chọn chủ đề --</option>
                {formTopics.map(t => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            <Select
              label="Chọn bài học (Mục tiêu áp dụng)"
              value={scopeLessonId}
              disabled={!scopeTopicId}
              onChange={(e) => {
                const val = e.target.value;
                setScopeLessonId(val);
                setForm(prev => ({ ...prev, triggerTargetId: val }));
              }}
              hint="Chọn bài học hoặc để 'Tất cả bài học' làm mặc định."
            >
              <option value="">-- Tất cả bài học trong chủ đề (Mặc định) --</option>
              {formLessons.map(l => (
                <option key={l.id} value={String(l.id)}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
        );

      case 'AUTO_SECTION_TEST_COMPLETE':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
              <Select
                label="Khối lớp"
                value={scopeGradeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeGradeId(val);
                  setScopeTopicId('');
                  setScopeLessonId('');
                  setScopeSectionId('');
                  setForm(prev => ({ ...prev, triggerTargetId: '' }));
                }}
              >
                <option value="">-- Chọn khối --</option>
                {grades.map(g => (
                  <option key={g.id} value={String(g.id)}>
                    Khối {g.id}
                  </option>
                ))}
              </Select>

              <Select
                label="Chủ đề"
                value={scopeTopicId}
                disabled={!scopeGradeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeTopicId(val);
                  setScopeLessonId('');
                  setScopeSectionId('');
                  setForm(prev => ({ ...prev, triggerTargetId: '' }));
                }}
              >
                <option value="">-- Chọn chủ đề --</option>
                {formTopics.map(t => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Select
                label="Bài học"
                value={scopeLessonId}
                disabled={!scopeTopicId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeLessonId(val);
                  setScopeSectionId('');
                  setForm(prev => ({ ...prev, triggerTargetId: '' }));
                }}
              >
                <option value="">-- Chọn bài học --</option>
                {formLessons.map(l => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Chọn phần học (Mục tiêu áp dụng)"
                value={scopeSectionId}
                disabled={!scopeLessonId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeSectionId(val);
                  setForm(prev => ({ ...prev, triggerTargetId: val }));
                }}
                hint="Chọn phần hoặc để 'Tất cả phần học' làm mặc định."
              >
                <option value="">-- Tất cả phần học (Mặc định) --</option>
                {formSections.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {'\u00A0\u00A0'.repeat(s.depth)}{s.depth > 0 ? '↳ ' : ''}{s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        );

      case 'AUTO_NODE_TEST_COMPLETE':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
              <Select
                label="Khối lớp"
                value={scopeGradeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeGradeId(val);
                  setScopeTopicId('');
                  setScopeLessonId('');
                  setScopeSectionId('');
                  setScopeNodeId('');
                  setForm(prev => ({ ...prev, triggerTargetId: '' }));
                }}
              >
                <option value="">-- Chọn khối --</option>
                {grades.map(g => (
                  <option key={g.id} value={String(g.id)}>
                    Khối {g.id}
                  </option>
                ))}
              </Select>

              <Select
                label="Chủ đề"
                value={scopeTopicId}
                disabled={!scopeGradeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeTopicId(val);
                  setScopeLessonId('');
                  setScopeSectionId('');
                  setScopeNodeId('');
                  setForm(prev => ({ ...prev, triggerTargetId: '' }));
                }}
              >
                <option value="">-- Chọn chủ đề --</option>
                {formTopics.map(t => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Select
                label="Bài học"
                value={scopeLessonId}
                disabled={!scopeTopicId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeLessonId(val);
                  setScopeSectionId('');
                  setScopeNodeId('');
                  setForm(prev => ({ ...prev, triggerTargetId: '' }));
                }}
              >
                <option value="">-- Chọn bài học --</option>
                {formLessons.map(l => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Phần học"
                value={scopeSectionId}
                disabled={!scopeLessonId}
                onChange={(e) => {
                  const val = e.target.value;
                  setScopeSectionId(val);
                  setScopeNodeId('');
                  setForm(prev => ({ ...prev, triggerTargetId: '' }));
                }}
              >
                <option value="">-- Chọn phần học --</option>
                {formSections.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {'\u00A0\u00A0'.repeat(s.depth)}{s.depth > 0 ? '↳ ' : ''}{s.name}
                  </option>
                ))}
              </Select>
            </div>

            <Select
              label="Chọn nút kiến thức (Mục tiêu áp dụng)"
              value={scopeNodeId}
              disabled={!scopeSectionId}
              onChange={(e) => {
                const val = e.target.value;
                setScopeNodeId(val);
                setForm(prev => ({ ...prev, triggerTargetId: val }));
              }}
              hint="Chọn nút hoặc để 'Tất cả nút' làm mặc định."
            >
              <option value="">-- Tất cả nút trong phần (Mặc định) --</option>
              {formNodes.map(n => (
                <option key={n.id} value={String(n.id)}>
                  {n.header || `Nút #${n.id}`}
                </option>
              ))}
            </Select>
          </div>
        );

      case 'AUTO_PERSONAL_PRACTICE_COMPLETE':
      case 'AUTO_WRONG_PRACTICE_COMPLETE':
      default:
        return (
          <Input
            label="Mục tiêu"
            value=""
            disabled
            placeholder="Không áp dụng"
            hint="Không áp dụng cho loại hoạt động này (bắt buộc để trống)."
          />
        );
    }
  };

  // Filters logic
  const filteredRules = rules.filter(r => {
    const targetDisplay = renderTargetDisplay(r);
    const matchesSearch =
      (r.triggerTargetId && r.triggerTargetId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      targetDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (TRIGGER_LABELS[r.triggerType] && TRIGGER_LABELS[r.triggerType].toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || r.triggerType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            Cơ chế phần thưởng (Reward Rules)
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Quản lý phần thưởng XP và vàng được thưởng tự động khi người dùng hoàn thành hoạt động hoặc đạt cột mốc.
          </p>
        </div>
        <Button variant="primary" icon={<IconPlus size={18} />} onClick={openCreate}>
          Thêm quy tắc mới
        </Button>
      </div>

      {/* Filters bar */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16,
        padding: '16px 20px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <IconSearch size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo mục tiêu, tên hoạt động hoặc ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 40px',
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
              fontSize: 14, color: '#0f172a', outline: 'none', transition: 'all 0.2s',
              fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ width: 260 }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px',
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
              fontSize: 14, color: '#0f172a', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          >
            <option value="ALL">Tất cả loại hoạt động</option>
            {TRIGGER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : filteredRules.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', background: '#ffffff',
          borderRadius: 20, border: '1px solid #e2e8f0', color: '#64748b'
        }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Không tìm thấy quy tắc nào</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Hãy thử thay đổi bộ lọc hoặc thêm một quy tắc phần thưởng mới.</p>
        </div>
      ) : (
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20,
          boxShadow: '0 4px 20px rgba(15,23,42,0.03)', overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 60, whiteSpace: 'nowrap' }}>ID</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Loại hoạt động</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Mục tiêu áp dụng</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 140, whiteSpace: 'nowrap' }}>Lượt áp dụng</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 180, whiteSpace: 'nowrap' }}>Phần thưởng</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 100, textAlign: 'right', whiteSpace: 'nowrap' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map(rule => {
                const colorConfig = TRIGGER_COLORS[rule.triggerType] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

                return (
                  <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* ID */}
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#64748b' }}>
                      {rule.id}
                    </td>

                    {/* Trigger Type */}
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20,
                        fontSize: 12, fontWeight: 600, background: colorConfig.bg, color: colorConfig.color,
                        border: `1px solid ${colorConfig.border}`
                      }}>
                        {TRIGGER_LABELS[rule.triggerType] ?? rule.triggerType}
                      </span>
                    </td>

                    {/* Target */}
                    <td style={{ padding: '16px 20px' }}>
                      {rule.triggerTargetId ? (
                        <span style={{
                          background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, fontSize: 13, color: '#334155', fontWeight: 500
                        }}>
                          {renderTargetDisplay(rule)}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Mặc định (Tất cả)</span>
                      )}
                    </td>

                    {/* Attempt sequence */}
                    <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 500 }}>
                      Lần {rule.triggerTimeMin}
                      {rule.triggerTimeMax ? ` - ${rule.triggerTimeMax}` : ' trở đi'}
                    </td>

                    {/* Reward XP & Gold & Items */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {rule.xp > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a66228', fontWeight: 600, fontSize: 13 }}>
                            <IconXP size={14} color="#c37938" />
                            <span>+{rule.xp} XP</span>
                          </div>
                        )}
                        {rule.gold > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 600, fontSize: 13 }}>
                            <IconGold size={14} color="#f59e0b" />
                            <span>+{rule.gold} Vàng</span>
                          </div>
                        )}
                        {rule.rewardRuleItems && rule.rewardRuleItems.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                            {rule.rewardRuleItems.map(item => (
                              <span key={item.id} style={{
                                background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                                padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600
                              }}>
                                🎁 {item.itemDefinition?.name || `Vật phẩm #${item.itemDefinitionId}`} x{item.quantity}
                              </span>
                            ))}
                          </div>
                        )}
                        {rule.xp === 0 && rule.gold === 0 && (!rule.rewardRuleItems || rule.rewardRuleItems.length === 0) && (
                          <span style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Không có quà</span>
                        )}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEdit(rule)}
                          style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                        >
                          <IconEdit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rule)}
                          style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                        >
                          <IconDelete size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Rule Modal */}
      <Modal
        open={modalOpen}
        title={editRule ? `Chỉnh sửa quy tắc #${editRule.id}` : 'Thêm quy tắc phần thưởng mới'}
        onClose={() => setModalOpen(false)}
        width={720}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Trigger Type Select */}
          <Select
            label="Loại hoạt động kích hoạt"
            value={form.triggerType}
            onChange={(e) => handleTriggerTypeChange(e.target.value as RewardTriggerType)}
          >
            {TRIGGER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>

          {/* Trigger Target Selector / Input */}
          {renderTargetSelector()}

          {/* Apply Times range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="lần kích hoạt tối thiểu"
              type="number"
              min="1"
              value={
                form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'
                  ? '1'
                  : form.triggerTimeMin
              }
              onChange={(e) => setForm(prev => ({ ...prev, triggerTimeMin: e.target.value }))}
              disabled={form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'}
              hint={
                form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'
                  ? 'Tự động bỏ qua lượt (áp dụng cho mọi lần thực hiện)'
                  : 'Lượt áp dụng tối thiểu (ví dụ: 1)'
              }
            />
            <Input
              label="lần kích hoạt tối đa"
              type="number"
              min="1"
              placeholder={
                form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'
                  ? 'Không giới hạn'
                  : 'Vô hạn (để trống)'
              }
              value={
                form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'
                  ? ''
                  : form.triggerTimeMax
              }
              onChange={(e) => setForm(prev => ({ ...prev, triggerTimeMax: e.target.value }))}
              disabled={form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'}
              hint={
                form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'
                  ? 'Tự động không giới hạn số lần nhận thưởng'
                  : 'Bỏ trống nếu không giới hạn lần tối đa'
              }
            />
          </div>

          {/* XP and Gold inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Thưởng XP"
              type="number"
              min="0"
              value={form.xp}
              onChange={(e) => setForm(prev => ({ ...prev, xp: e.target.value }))}
            />
            <Input
              label="Thưởng Vàng"
              type="number"
              min="0"
              value={form.gold}
              onChange={(e) => setForm(prev => ({ ...prev, gold: e.target.value }))}
            />
          </div>

          {/* Reward Items Configuration */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '16px', display: 'flex', flexDirection: 'column', gap: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                Vật phẩm đính kèm thưởng (Tùy chọn)
              </label>
              <button
                type="button"
                onClick={() => {
                  const firstDefId = itemDefs[0]?.id || 1;
                  setForm(prev => ({
                    ...prev,
                    items: [...prev.items, { itemDefinitionId: firstDefId, quantity: 1 }]
                  }));
                }}
                style={{
                  background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155',
                  padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <IconPlus size={12} /> Thêm vật phẩm
              </button>
            </div>
            {form.items.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                Chưa có vật phẩm thưởng nào được liên kết.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <select
                        value={item.itemDefinitionId}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setForm(prev => {
                            const newItems = [...prev.items];
                            newItems[idx].itemDefinitionId = val;
                            return { ...prev, items: newItems };
                          });
                        }}
                        style={{
                          width: '100%', padding: '8px 10px',
                          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                          fontSize: 13, color: '#0f172a', outline: 'none'
                        }}
                      >
                        {itemDefs.map(def => (
                          <option key={def.id} value={def.id}>{def.name} (ID: {def.id})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 100 }}>
                      <input
                        type="number"
                        min="1"
                        placeholder="SL"
                        value={item.quantity}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setForm(prev => {
                            const newItems = [...prev.items];
                            newItems[idx].quantity = val;
                            return { ...prev, items: newItems };
                          });
                        }}
                        style={{
                          width: '100%', padding: '8px 10px',
                          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                          fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          items: prev.items.filter((_, i) => i !== idx)
                        }));
                      }}
                      style={{
                        background: '#fee2e2', border: 'none', color: '#ef4444',
                        width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <IconDelete size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editRule ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xóa quy tắc phần thưởng"
        message={`Bạn có chắc chắn muốn xóa quy tắc phần thưởng #${deleteTarget?.id} không? Thao tác này không thể hoàn tác.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
