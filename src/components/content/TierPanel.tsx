// src/components/content/TierPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { TierDto, ItemDefinitionDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconXP, IconGold, IconSearch, IconUpload } from '../ui/Icons';

interface TierPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const EMPTY_FORM = {
  index: '',
  name: '',
  badgeImgUrl: '',
  description: '',
  xpThreshold: '0',
  xpReward: '0',
  goldReward: '0',
  items: [] as { itemDefinitionId: number; quantity: number }[]
};

export function TierPanel({ onToast }: TierPanelProps) {
  const [tiers, setTiers] = useState<TierDto[]>([]);
  const [itemDefs, setItemDefs] = useState<ItemDefinitionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & Edit states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTier, setEditTier] = useState<TierDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TierDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTiers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/admin/tiers');
      setTiers(res.data.tiers ?? []);
    } catch {
      onToast('Không tải được danh sách danh hiệu (Tier)', 'error');
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
    fetchTiers();
    fetchItemDefs();
  }, [fetchTiers, fetchItemDefs]);

  const openCreate = () => {
    setEditTier(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (tier: TierDto) => {
    setEditTier(tier);
    setForm({
      index: String(tier.index),
      name: tier.name,
      badgeImgUrl: tier.badgeImgUrl ?? '',
      description: tier.description ?? '',
      xpThreshold: String(tier.xpThreshold),
      xpReward: String(tier.rewardRule?.xp ?? 0),
      goldReward: String(tier.rewardRule?.gold ?? 0),
      items: (tier.rewardRule?.rewardRuleItems || []).map(ri => ({
        itemDefinitionId: ri.itemDefinitionId,
        quantity: ri.quantity
      }))
    });
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      const res = await client.post('/api/admin/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(prev => ({ ...prev, badgeImgUrl: res.data.url }));
      onToast('Tải ảnh huy hiệu thành công', 'success');
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi tải ảnh lên', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    const indexVal = Number(form.index);
    const xpThreshVal = Number(form.xpThreshold);
    const xpRewardVal = Number(form.xpReward);
    const goldRewardVal = Number(form.goldReward);

    if (isNaN(indexVal) || indexVal < 0) {
      onToast('Chỉ mục (Index) danh hiệu phải là số nguyên không âm', 'error');
      return;
    }

    if (!form.name.trim()) {
      onToast('Vui lòng nhập tên danh hiệu', 'error');
      return;
    }

    if (isNaN(xpThreshVal) || xpThreshVal < 0) {
      onToast('Ngưỡng XP phải là số không âm', 'error');
      return;
    }

    if (isNaN(xpRewardVal) || xpRewardVal < 0 || isNaN(goldRewardVal) || goldRewardVal < 0) {
      onToast('Phần thưởng XP và Vàng phải là số không âm', 'error');
      return;
    }

    for (const item of form.items) {
      if (!item.itemDefinitionId) {
        onToast('Vui lòng chọn vật phẩm thưởng', 'error');
        return;
      }
      if (isNaN(item.quantity) || item.quantity < 1) {
        onToast('Số lượng vật phẩm phải lớn hơn hoặc bằng 1', 'error');
        return;
      }
    }

    try {
      setSaving(true);
      if (editTier) {
        const payload = {
          name: form.name.trim(),
          badgeImgUrl: form.badgeImgUrl.trim() || null,
          description: form.description.trim() || null,
          xpThreshold: xpThreshVal,
          xpReward: xpRewardVal,
          goldReward: goldRewardVal,
          rewardRuleItems: form.items
        };
        await client.patch(`/api/admin/tiers/${editTier.index}`, payload);
        onToast('Cập nhật danh hiệu thành công', 'success');
      } else {
        const payload = {
          index: indexVal,
          name: form.name.trim(),
          badgeImgUrl: form.badgeImgUrl.trim() || null,
          description: form.description.trim() || null,
          xpThreshold: xpThreshVal,
          xpReward: xpRewardVal,
          goldReward: goldRewardVal,
          rewardRuleItems: form.items
        };
        await client.post('/api/admin/tiers', payload);
        onToast('Tạo danh hiệu mới thành công', 'success');
      }
      setModalOpen(false);
      fetchTiers();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu danh hiệu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/tiers/${deleteTarget.index}`);
      onToast('Xóa danh hiệu thành công', 'success');
      setDeleteTarget(null);
      fetchTiers();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa danh hiệu', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredTiers = tiers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(t.index).includes(searchTerm)
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            Quản lý Danh hiệu & Hạng (Tiers)
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Quản lý các cấp độ danh hiệu người dùng đạt được dựa trên tổng XP, và thiết lập phần thưởng khi đạt hạng.
          </p>
        </div>
        <Button variant="primary" icon={<IconPlus size={18} />} onClick={openCreate}>
          Thêm danh hiệu mới
        </Button>
      </div>

      {/* Search */}
      <div style={{
        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16,
        padding: '16px 20px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <IconSearch size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm danh hiệu theo tên hoặc chỉ mục..."
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
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : filteredTiers.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', background: '#ffffff',
          borderRadius: 20, border: '1px solid #e2e8f0', color: '#64748b'
        }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Chưa có danh hiệu nào</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Hãy tạo danh hiệu đầu tiên để bắt đầu hệ thống hạng.</p>
        </div>
      ) : (
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20,
          boxShadow: '0 4px 20px rgba(15,23,42,0.03)', overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 70 }}>Index</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 70 }}>Huy hiệu</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Tên & Mô tả</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 130 }}>Yêu cầu XP</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 180 }}>Phần thưởng đạt hạng</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 100, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTiers.map((tier) => {
                const rule = tier.rewardRule;
                return (
                  <tr key={tier.index} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Index */}
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#4f46e5' }}>
                      #{tier.index}
                    </td>

                    {/* Badge Image */}
                    <td style={{ padding: '16px 20px' }}>
                      {tier.badgeImgUrl ? (
                        <img
                          src={tier.badgeImgUrl}
                          alt={tier.name}
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 8, background: '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#94a3b8'
                        }}>
                          —
                        </div>
                      )}
                    </td>

                    {/* Name & Description */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{tier.name}</div>
                      {tier.description && (
                        <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{tier.description}</div>
                      )}
                    </td>

                    {/* XP Threshold */}
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#059669' }}>
                      {tier.xpThreshold.toLocaleString()} XP
                    </td>

                    {/* Reward Rule */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {rule && rule.xp > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4f46e5', fontWeight: 600, fontSize: 13 }}>
                            <IconXP size={14} color="#6c63ff" />
                            <span>+{rule.xp} XP</span>
                          </div>
                        )}
                        {rule && rule.gold > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontWeight: 600, fontSize: 13 }}>
                            <IconGold size={14} color="#f59e0b" />
                            <span>+{rule.gold} vàng</span>
                          </div>
                        )}
                        {rule && rule.rewardRuleItems && rule.rewardRuleItems.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                            {rule.rewardRuleItems.map((ri) => (
                              <div key={ri.id} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0d9488', fontWeight: 600, fontSize: 12 }}>
                                <span>{ri.itemDefinition?.name || `Vật phẩm #${ri.itemDefinitionId}`} x{ri.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(!rule || (rule.xp === 0 && rule.gold === 0 && (!rule.rewardRuleItems || rule.rewardRuleItems.length === 0))) && (
                          <span style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Chưa có phần thưởng</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEdit(tier)}
                          style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                          }}
                          title="Chỉnh sửa"
                        >
                          <IconEdit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tier)}
                          style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
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
        title={editTier ? `Chỉnh sửa Danh hiệu #${editTier.index}` : 'Tạo Danh hiệu mới'}
        onClose={() => setModalOpen(false)}
        width={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Index & Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <Input
              label="Chỉ mục (Index)"
              type="number"
              min="0"
              placeholder="Ví dụ: 1, 2, 3"
              value={form.index}
              onChange={(e) => setForm(prev => ({ ...prev, index: e.target.value }))}
              disabled={editTier !== null}
              hint="ID độc nhất của Tier"
            />
            <Input
              label="Tên danh hiệu"
              placeholder="Ví dụ: Sử Học Sinh, Trạng Nguyên..."
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* XP Threshold */}
          <Input
            label="Ngưỡng XP yêu cầu"
            type="number"
            min="0"
            placeholder="0"
            value={form.xpThreshold}
            onChange={(e) => setForm(prev => ({ ...prev, xpThreshold: e.target.value }))}
            hint="Số điểm XP tối thiểu để người dùng đạt danh hiệu này"
          />

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Mô tả danh hiệu
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả danh hiệu hoặc điều kiện đạt được..."
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              style={{
                width: '100%', padding: '10px 14px',
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                fontSize: 14, color: '#0f172a', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Badge Image URL / Upload */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Ảnh Huy hiệu (Badge Image)
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="https://... hoặc tải ảnh lên"
                  value={form.badgeImgUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, badgeImgUrl: e.target.value }))}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#0f172a',
                    fontSize: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#6c63ff';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <label style={{
                padding: '10px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                borderRadius: 10, cursor: uploadingImage ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
                color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}>
                <IconUpload size={16} />
                {uploadingImage ? 'Đang tải...' : 'Tải ảnh'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {form.badgeImgUrl && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={form.badgeImgUrl}
                  alt="Badge preview"
                  style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                />
                <span style={{ fontSize: 12, color: '#64748b' }}>Xem trước huy hiệu</span>
              </div>
            )}
          </div>

          {/* Embedded Tier Reward Section */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Phần thưởng khi đạt Danh hiệu này
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Input
                label="Phần thưởng XP"
                type="number"
                min="0"
                value={form.xpReward}
                onChange={(e) => setForm(prev => ({ ...prev, xpReward: e.target.value }))}
              />
              <Input
                label="Phần thưởng Vàng"
                type="number"
                min="0"
                value={form.goldReward}
                onChange={(e) => setForm(prev => ({ ...prev, goldReward: e.target.value }))}
              />
            </div>

            {/* Items list */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Vật phẩm thưởng</span>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    items: [...prev.items, { itemDefinitionId: itemDefs[0]?.id || 0, quantity: 1 }]
                  }))}
                  disabled={itemDefs.length === 0}
                  style={{
                    padding: '4px 10px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                    borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 4
                  }}
                >
                  <IconPlus size={12} /> Thêm vật phẩm
                </button>
              </div>

              {form.items.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                  Không có vật phẩm thưởng.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
                      <div style={{ width: 90 }}>
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
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editTier ? 'Lưu thay đổi' : 'Tạo danh hiệu'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xóa danh hiệu"
        message={`Bạn có chắc chắn muốn xóa danh hiệu "${deleteTarget?.name}" (#${deleteTarget?.index}) không? Phần thưởng liên quan cũng sẽ bị xóa.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
