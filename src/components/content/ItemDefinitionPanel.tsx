import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { ItemDefinitionDto, ItemDefinitionType, BoostEffectType, EquipmentSlot } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconSearch, IconGold } from '../ui/Icons';

interface ItemDefinitionPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const ITEM_TYPES = [
  { value: 'SKIN', label: 'Trang phục / Skin (SKIN)' },
  { value: 'BOOST', label: 'Tăng cường / Boost (BOOST)' },
  { value: 'BADGE', label: 'Huy hiệu / Badge (BADGE)' }
];

const BOOST_EFFECT_TYPES = [
  { value: '', label: 'Không có hiệu ứng' },
  { value: 'XP_MULTIPLIER', label: 'Nhân điểm kinh nghiệm (XP_MULTIPLIER)' },
  { value: 'GOLD_MULTIPLIER', label: 'Nhân tiền vàng (GOLD_MULTIPLIER)' }
];

const EQUIPMENT_SLOTS = [
  { value: '', label: 'Không có vị trí trang bị' },
  { value: 'AVT_FRAME', label: 'Khung ảnh đại diện (AVT_FRAME)' },
  { value: 'BACKGROUND', label: 'Hình nền trang cá nhân (BACKGROUND)' }
];

const EMPTY_FORM = {
  name: '',
  description: '',
  imgUrl: '',
  type: 'SKIN' as ItemDefinitionType,
  price: '10',
  maxStackSize: '',
  isConsumable: false,
  shownInStore: true,
  effectType: '' as BoostEffectType | '',
  effectValue: '',
  equipmentSlot: '' as EquipmentSlot | '',
  durationMinutes: '',
  allowEffectStacking: true
};

export function ItemDefinitionPanel({ onToast }: ItemDefinitionPanelProps) {
  const [items, setItems] = useState<ItemDefinitionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & Edit states
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemDefinitionDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Deletion states
  const [deleteTarget, setDeleteTarget] = useState<ItemDefinitionDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/admin/item-definitions');
      setItems(res.data.items ?? []);
    } catch {
      onToast('Không tải được danh sách vật phẩm', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: ItemDefinitionDto) => {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description ?? '',
      imgUrl: item.imgUrl ?? '',
      type: item.type,
      price: String(item.price),
      maxStackSize: item.maxStackSize !== null ? String(item.maxStackSize) : '',
      isConsumable: item.isConsumable,
      shownInStore: item.shownInStore,
      effectType: item.effectType ?? '',
      effectValue: item.effectValue !== null ? String(item.effectValue) : '',
      equipmentSlot: item.equipmentSlot ?? '',
      durationMinutes: item.durationMinutes !== null ? String(item.durationMinutes) : '',
      allowEffectStacking: item.allowEffectStacking
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      onToast('Tên vật phẩm không được để trống', 'error');
      return;
    }

    const priceVal = Number(form.price);
    const maxStack = form.maxStackSize ? Number(form.maxStackSize) : null;
    const effectVal = form.effectValue ? Number(form.effectValue) : null;
    const durMin = form.durationMinutes ? Number(form.durationMinutes) : null;

    if (isNaN(priceVal) || priceVal < 0) {
      onToast('Giá vật phẩm phải là số không âm', 'error');
      return;
    }

    if (maxStack !== null && (isNaN(maxStack) || maxStack < 1)) {
      onToast('Kích thước ngăn chứa tối đa phải lớn hơn hoặc bằng 1', 'error');
      return;
    }

    if (effectVal !== null && isNaN(effectVal)) {
      onToast('Giá trị hiệu ứng phải là số', 'error');
      return;
    }

    if (durMin !== null && (isNaN(durMin) || durMin < 1)) {
      onToast('Thời gian hiệu lực phải là số phút dương', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imgUrl: form.imgUrl.trim() || null,
        type: form.type,
        price: priceVal,
        maxStackSize: maxStack,
        isConsumable: form.isConsumable,
        shownInStore: form.shownInStore,
        effectType: form.type === 'BOOST' && form.effectType ? form.effectType : null,
        effectValue: form.type === 'BOOST' ? effectVal : null,
        equipmentSlot: form.type === 'SKIN' && form.equipmentSlot ? form.equipmentSlot : null,
        durationMinutes: form.type === 'BOOST' ? durMin : null,
        allowEffectStacking: form.allowEffectStacking
      };

      if (editItem) {
        await client.patch(`/api/admin/item-definitions/${editItem.id}`, payload);
        onToast('Đã cập nhật vật phẩm thành công', 'success');
      } else {
        await client.post('/api/admin/item-definitions', payload);
        onToast('Đã tạo vật phẩm thành công', 'success');
      }
      setModalOpen(false);
      fetchItems();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu vật phẩm', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/item-definitions/${deleteTarget.id}`);
      onToast('Đã xóa vật phẩm thành công', 'success');
      setDeleteTarget(null);
      fetchItems();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa vật phẩm', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            Danh mục vật phẩm (Item Definitions)
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Quản lý các loại vật phẩm trong hệ thống (Trang phục/Skin, Tăng cường/Boost, Huy hiệu/Badge).
          </p>
        </div>
        <Button variant="primary" icon={<IconPlus size={18} />} onClick={openCreate}>
          Thêm vật phẩm mới
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
            placeholder="Tìm kiếm vật phẩm theo tên hoặc mô tả..."
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

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', background: '#ffffff',
          borderRadius: 20, border: '1px solid #e2e8f0', color: '#64748b'
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Không có vật phẩm nào</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Nhấp vào nút để thêm vật phẩm định nghĩa mới.</p>
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
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 80 }}>Hình ảnh</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Tên</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Mô tả / Chi tiết cấu hình</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 150 }}>Loại</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 120 }}>Giá bán</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 120 }}>Ngăn chứa tối đa</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 100, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#64748b' }}>{item.id}</td>
                  <td style={{ padding: '16px 20px' }}>
                    {item.imgUrl ? (
                      <img src={item.imgUrl} alt={item.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                  <td style={{ padding: '16px 20px', color: '#475569' }}>
                    <div>
                      <div>{item.description ?? 'Không có mô tả'}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {item.type === 'BOOST' && item.effectType && (
                          <span>Hiệu ứng: {item.effectType} (x{item.effectValue}) | {item.durationMinutes} phút</span>
                        )}
                        {item.type === 'SKIN' && item.equipmentSlot && (
                          <span>Vị trí: {item.equipmentSlot}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, width: 'fit-content',
                        background: item.type === 'SKIN' ? '#dbeafe' : item.type === 'BOOST' ? '#fef9c3' : '#fee2e2',
                        color: item.type === 'SKIN' ? '#3b82f6' : item.type === 'BOOST' ? '#eab308' : '#ef4444'
                      }}>
                        {item.type}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {item.isConsumable ? 'Tiêu thụ được' : 'Không tiêu thụ'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#d97706' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconGold size={14} color="#f59e0b" />
                      <span>{item.price}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#475569' }}>{item.maxStackSize ?? 'Vô hạn'}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openEdit(item)}
                        style={{
                          background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                          width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <IconEdit size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        style={{
                          background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                          width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <IconDelete size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal create/edit */}
      <Modal
        open={modalOpen}
        title={editItem ? `Chỉnh sửa vật phẩm #${editItem.id}` : 'Thêm vật phẩm mới'}
        onClose={() => setModalOpen(false)}
        width={550}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Tên vật phẩm"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ví dụ: Tăng tốc 2X XP..."
          />
          <Input
            label="Mô tả"
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Mô tả tác dụng của vật phẩm..."
          />
          <Input
            label="Đường dẫn hình ảnh (imgUrl)"
            value={form.imgUrl}
            onChange={(e) => setForm(prev => ({ ...prev, imgUrl: e.target.value }))}
            placeholder="http://example.com/item.png"
          />
          
          <Select
            label="Loại vật phẩm"
            value={form.type}
            onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as ItemDefinitionType }))}
          >
            {ITEM_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>

          {/* isConsumable & shownInStore Booleans */}
          <div style={{ display: 'flex', gap: 24, padding: '4px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#475569' }}>
              <input
                type="checkbox"
                checked={form.isConsumable}
                onChange={(e) => setForm(prev => ({ ...prev, isConsumable: e.target.checked }))}
              />
              Vật phẩm tiêu thụ (isConsumable)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#475569' }}>
              <input
                type="checkbox"
                checked={form.shownInStore}
                onChange={(e) => setForm(prev => ({ ...prev, shownInStore: e.target.checked }))}
              />
              Hiển thị trong Cửa hàng (shownInStore)
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Giá bán (Vàng)"
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
            />
            <Input
              label="Ngăn chứa tối đa (maxStackSize)"
              type="number"
              min="1"
              value={form.maxStackSize}
              onChange={(e) => setForm(prev => ({ ...prev, maxStackSize: e.target.value }))}
              placeholder="Vô hạn (để trống)"
            />
          </div>

          {/* Conditional properties based on type */}
          {form.type === 'BOOST' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Cấu hình hiệu ứng Boost</h4>
              <Select
                label="Loại hiệu ứng"
                value={form.effectType}
                onChange={(e) => setForm(prev => ({ ...prev, effectType: e.target.value as BoostEffectType }))}
              >
                {BOOST_EFFECT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Input
                  label="Giá trị hiệu ứng (ví dụ: 1.5)"
                  type="number"
                  step="0.1"
                  value={form.effectValue}
                  onChange={(e) => setForm(prev => ({ ...prev, effectValue: e.target.value }))}
                />
                <Input
                  label="Thời lượng (phút)"
                  type="number"
                  min="1"
                  value={form.durationMinutes}
                  onChange={(e) => setForm(prev => ({ ...prev, durationMinutes: e.target.value }))}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={form.allowEffectStacking}
                  onChange={(e) => setForm(prev => ({ ...prev, allowEffectStacking: e.target.checked }))}
                />
                Cho phép cộng dồn thời gian hiệu ứng
              </label>
            </div>
          )}

          {form.type === 'SKIN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Cấu hình Trang phục / Skin</h4>
              <Select
                label="Vị trí trang bị"
                value={form.equipmentSlot}
                onChange={(e) => setForm(prev => ({ ...prev, equipmentSlot: e.target.value as EquipmentSlot }))}
              >
                {EQUIPMENT_SLOTS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editItem ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xóa vật phẩm định nghĩa"
        message={`Bạn có chắc chắn muốn xóa vật phẩm "${deleteTarget?.name}" không? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
