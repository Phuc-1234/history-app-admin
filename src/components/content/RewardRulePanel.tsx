// src/components/content/RewardRulePanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { RewardRuleDto, RewardTriggerType, ItemDefinitionDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconXP, IconGold, IconSearch } from '../ui/Icons';

interface RewardRulePanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const TRIGGER_TYPES: { value: RewardTriggerType; label: string; desc: string }[] = [
  { value: 'MANUAL_TEST_COMPLETE', label: 'Làm đề thi cụ thể', desc: 'Quy tắc áp dụng khi hoàn thành đề thi có ID cụ thể.' },
  { value: 'AUTO_NODE_TEST_COMPLETE', label: 'Tự động (Thẻ kiến thức)', desc: 'Áp dụng cho bài kiểm tra tự động của Thẻ kiến thức (Node).' },
  { value: 'AUTO_SECTION_TEST_COMPLETE', label: 'Tự động (Phần học)', desc: 'Áp dụng cho bài kiểm tra tự động của Phần học (Section).' },
  { value: 'AUTO_LESSON_TEST_COMPLETE', label: 'Tự động (Bài học)', desc: 'Áp dụng cho bài kiểm tra tự động của Bài học (Lesson).' },
  { value: 'AUTO_TOPIC_TEST_COMPLETE', label: 'Tự động (Chủ đề)', desc: 'Áp dụng cho bài kiểm tra tự động của Chủ đề (Topic).' },
  { value: 'AUTO_GRADE_TEST_COMPLETE', label: 'Tự động (Khối lớp)', desc: 'Áp dụng cho bài kiểm tra tự động của Khối lớp (Grade).' },
  { value: 'AUTO_PERSONAL_PRACTICE_COMPLETE', label: 'Luyện tập cá nhân', desc: 'Áp dụng cho bài luyện tập cá nhân tự động (Personal Practice).' },
  { value: 'AUTO_WRONG_PRACTICE_COMPLETE', label: 'Luyện tập câu sai', desc: 'Áp dụng cho bài luyện tập các câu trả lời sai (Wrong Practice).' },
  { value: 'STREAK_REACHED', label: 'Đạt chuỗi ngày học', desc: 'Áp dụng khi người dùng đạt cột mốc chuỗi ngày học liên tục.' },
  { value: 'TIER_REACHED', label: 'Lên hạng danh hiệu', desc: 'Áp dụng khi người dùng đạt cột mốc chỉ mục danh hiệu nhất định.' }
];

const TRIGGER_LABELS: Record<RewardTriggerType, string> = {
  MANUAL_TEST_COMPLETE: 'Đề thi cụ thể',
  AUTO_NODE_TEST_COMPLETE: 'Tự động (Thẻ kiến thức)',
  AUTO_SECTION_TEST_COMPLETE: 'Tự động (Phần học)',
  AUTO_LESSON_TEST_COMPLETE: 'Tự động (Bài học)',
  AUTO_TOPIC_TEST_COMPLETE: 'Tự động (Chủ đề)',
  AUTO_GRADE_TEST_COMPLETE: 'Tự động (Khối lớp)',
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

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal & Edit states
  const [modalOpen, setModalOpen] = useState(false);
  const [editRule, setEditRule] = useState<RewardRuleDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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
  }, [fetchRules, fetchItemDefs]);

  // Handlers
  const openCreate = () => {
    setEditRule(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (rule: RewardRuleDto) => {
    setEditRule(rule);
    setForm({
      triggerType: rule.triggerType,
      triggerTargetId: rule.triggerTargetId ?? '',
      triggerTimeMin: String(rule.triggerTimeMin),
      triggerTimeMax: rule.triggerTimeMax !== null ? String(rule.triggerTimeMax) : '',
      xp: String(rule.xp),
      gold: String(rule.gold),
      items: (rule.rewardRuleItems || []).map(ri => ({
        itemDefinitionId: ri.itemDefinitionId,
        quantity: ri.quantity
      }))
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const minTime = Number(form.triggerTimeMin);
    const maxTime = form.triggerTimeMax ? Number(form.triggerTimeMax) : null;
    const xpVal = Number(form.xp);
    const goldVal = Number(form.gold);

    if (isNaN(minTime) || minTime < 1) {
      onToast('Lượt thực hiện tối thiểu phải lớn hơn hoặc bằng 1', 'error');
      return;
    }

    if (maxTime !== null && (isNaN(maxTime) || maxTime < minTime)) {
      onToast('Lượt thực hiện tối đa phải lớn hơn hoặc bằng lượt tối thiểu', 'error');
      return;
    }

    if (isNaN(xpVal) || xpVal < 0 || isNaN(goldVal) || goldVal < 0) {
      onToast('Điểm XP và Vàng phải là số không âm', 'error');
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
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa quy tắc phần thưởng', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Helper text depending on selected trigger type in form
  const getTargetHelper = (type: RewardTriggerType) => {
    switch (type) {
      case 'MANUAL_TEST_COMPLETE':
        return 'Nhập UUID của đề thi (hoặc để trống nếu áp dụng cho mọi đề thi tự do).';
      case 'AUTO_NODE_TEST_COMPLETE':
        return 'Nhập ID (Số) của Thẻ kiến thức (Node) hoặc để trống làm mặc định.';
      case 'AUTO_SECTION_TEST_COMPLETE':
        return 'Nhập ID (Số) của Phần học (Section) hoặc để trống làm mặc định.';
      case 'AUTO_LESSON_TEST_COMPLETE':
        return 'Nhập ID (Số) của Bài học (Lesson) hoặc để trống làm mặc định.';
      case 'AUTO_TOPIC_TEST_COMPLETE':
        return 'Nhập ID (Số) của Chủ đề (Topic) hoặc để trống làm mặc định.';
      case 'AUTO_GRADE_TEST_COMPLETE':
        return 'Nhập ID (Số) của Khối lớp (Grade) hoặc để trống làm mặc định.';
      case 'AUTO_PERSONAL_PRACTICE_COMPLETE':
      case 'AUTO_WRONG_PRACTICE_COMPLETE':
        return 'Không áp dụng cho loại hoạt động này (bắt buộc để trống).';
      case 'STREAK_REACHED':
        return 'BẮT BUỘC: Nhập số ngày đạt chuỗi làm mục tiêu (ví dụ: "7", "30").';
      case 'TIER_REACHED':
        return 'BẮT BUỘC: Nhập chỉ mục của hạng danh hiệu mới đạt được (ví dụ: "2", "3").';
      default:
        return '';
    }
  };

  // Filters logic
  const filteredRules = rules.filter(r => {
    const matchesSearch = r.triggerTargetId
      ? r.triggerTargetId.toLowerCase().includes(searchTerm.toLowerCase())
      : searchTerm === '';
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
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <IconSearch size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo Target ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 40px',
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
              fontSize: 14, color: '#0f172a', outline: 'none', transition: 'all 0.2s',
              fontFamily: 'inherit', boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#6c63ff';
              e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Filter Type */}
        <div style={{ width: 240 }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px',
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
              fontSize: 14, color: '#0f172a', outline: 'none', transition: 'all 0.2s',
              fontFamily: 'inherit', cursor: 'pointer'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#6c63ff';
              e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
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
          <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
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
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 60 }}>ID</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Loại hoạt động</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Mục tiêu (Target ID)</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 140 }}>Lượt áp dụng</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 120 }}>Phần thưởng</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 100, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => {
                const colorConfig = TRIGGER_COLORS[rule.triggerType] ?? { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
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

                    {/* Target ID */}
                    <td style={{ padding: '16px 20px', fontFamily: rule.triggerTargetId ? 'monospace' : 'inherit' }}>
                      {rule.triggerTargetId ? (
                        <span style={{
                          background: '#f1f5f9', padding: '2px 6px', borderRadius: 6, fontSize: 13, color: '#334155'
                        }}>
                          {rule.triggerTargetId}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4f46e5', fontWeight: 600, fontSize: 13 }}>
                            <IconXP size={14} color="#6c63ff" />
                            <span>+{rule.xp} XP</span>
                          </div>
                        )}
                        {rule.gold > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontWeight: 600, fontSize: 13 }}>
                            <IconGold size={14} color="#f59e0b" />
                            <span>+{rule.gold} vàng</span>
                          </div>
                        )}
                        {rule.rewardRuleItems && rule.rewardRuleItems.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                            {rule.rewardRuleItems.map((ri: any) => (
                              <div key={ri.id} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0d9488', fontWeight: 600, fontSize: 12 }}>
                                <span>📦</span>
                                <span>{ri.itemDefinition?.name || `Vật phẩm #${ri.itemDefinitionId}`} x{ri.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {rule.xp === 0 && rule.gold === 0 && (!rule.rewardRuleItems || rule.rewardRuleItems.length === 0) && (
                          <span style={{ color: '#94a3b8', fontSize: 13 }}>Không có</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEdit(rule)}
                          style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#e0e7ff';
                            e.currentTarget.style.borderColor = '#c7d2fe';
                            e.currentTarget.style.color = '#4f46e5';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.color = '#475569';
                          }}
                          title="Chỉnh sửa"
                        >
                          <IconEdit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rule)}
                          style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.borderColor = '#fecaca';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.color = '#475569';
                          }}
                          title="Xóa"
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

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        title={editRule ? `Cập nhật quy tắc #${editRule.id}` : 'Tạo quy tắc phần thưởng mới'}
        onClose={() => setModalOpen(false)}
        width={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Trigger Type Select */}
          <Select
            label="Loại hoạt động kích hoạt"
            value={form.triggerType}
            onChange={(e) => setForm(prev => ({ ...prev, triggerType: e.target.value as RewardTriggerType }))}
          >
            {TRIGGER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>

          {/* Trigger Target ID Input */}
          <Input
            label="Mục tiêu (Target ID)"
            placeholder={
              form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'
                ? 'Không áp dụng'
                : 'Nhập ID, UUID hoặc để trống...'
            }
            value={
              form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'
                ? ''
                : form.triggerTargetId
            }
            onChange={(e) => setForm(prev => ({ ...prev, triggerTargetId: e.target.value }))}
            disabled={form.triggerType === 'AUTO_PERSONAL_PRACTICE_COMPLETE' || form.triggerType === 'AUTO_WRONG_PRACTICE_COMPLETE'}
            hint={getTargetHelper(form.triggerType)}
          />

          {/* Apply Times range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Lượt thực hiện tối thiểu"
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
              label="Lượt thực hiện tối đa"
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
                  ? 'Không áp dụng giới hạn lượt'
                  : 'Bỏ trống nếu áp dụng mãi mãi'
              }
            />
          </div>

          {/* XP & Gold value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Phần thưởng điểm XP"
              type="number"
              min="0"
              value={form.xp}
              onChange={(e) => setForm(prev => ({ ...prev, xp: e.target.value }))}
            />
            <Input
              label="Phần thưởng Vàng"
              type="number"
              min="0"
              value={form.gold}
              onChange={(e) => setForm(prev => ({ ...prev, gold: e.target.value }))}
            />
          </div>

          {/* Items reward section */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Vật phẩm thưởng thêm</span>
              <button
                type="button"
                onClick={() => setForm(prev => ({
                  ...prev,
                  items: [...prev.items, { itemDefinitionId: itemDefs[0]?.id || 0, quantity: 1 }]
                }))}
                disabled={itemDefs.length === 0}
                style={{
                  padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 4
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
                      onClick={() => setForm(prev => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== idx)
                      }))}
                      style={{
                        background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444',
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

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editRule ? 'Lưu thay đổi' : 'Tạo quy tắc'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xóa quy tắc phần thưởng"
        message={`Bạn có chắc chắn muốn xóa quy tắc phần thưởng này (ID: ${deleteTarget?.id}) không? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
