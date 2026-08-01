import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { GoldPackageDto, ProPackageDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconGold, IconSparkles } from '../ui/Icons';

interface PackagePricingPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const formatVND = (val: number | string) => {
  const num = Number(val);
  if (isNaN(num) || num < 0) return '0đ';
  return num.toLocaleString('vi-VN') + 'đ';
};

// ─── Toggle Switch Component ──────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (val: boolean) => void; disabled?: boolean }) {
  return (
    <label style={{
      position: 'relative',
      display: 'inline-block',
      width: 44,
      height: 24,
      flexShrink: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
    }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
      />
      <span style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: checked ? '#10b981' : '#cbd5e1',
        borderRadius: 24,
        transition: 'background-color 0.2s ease',
      }}>
        <span style={{
          position: 'absolute',
          content: '""',
          height: 18,
          width: 18,
          left: checked ? 23 : 3,
          bottom: 3,
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </span>
    </label>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function PackagePricingPanel({ onToast }: PackagePricingPanelProps) {
  const [activeTab, setActiveTab] = useState<'gold' | 'pro'>('gold');

  // Gold Packages state
  const [goldList, setGoldList] = useState<GoldPackageDto[]>([]);
  const [goldLoading, setGoldLoading] = useState(false);
  const [goldModalOpen, setGoldModalOpen] = useState(false);
  const [editGold, setEditGold] = useState<GoldPackageDto | null>(null);
  const [goldForm, setGoldForm] = useState({
    name: '',
    goldAmount: '10',
    bonusGold: '0',
    priceVnd: '20000',
    isActive: true,
    displayOrder: '0',
  });
  const [goldSaving, setGoldSaving] = useState(false);
  const [deleteGoldTarget, setDeleteGoldTarget] = useState<GoldPackageDto | null>(null);
  const [deletingGold, setDeletingGold] = useState(false);

  // Pro Packages state
  const [proList, setProList] = useState<ProPackageDto[]>([]);
  const [proLoading, setProLoading] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [editPro, setEditPro] = useState<ProPackageDto | null>(null);
  const [proForm, setProForm] = useState({
    name: '',
    durationDays: '30',
    priceVnd: '50000',
    originalPriceVnd: '',
    description: '',
    isRecommended: false,
    isActive: true,
    displayOrder: '0',
  });
  const [proSaving, setProSaving] = useState(false);
  const [deleteProTarget, setDeleteProTarget] = useState<ProPackageDto | null>(null);
  const [deletingPro, setDeletingPro] = useState(false);

  // Fetch Gold Packages
  const fetchGoldPackages = useCallback(async () => {
    try {
      setGoldLoading(true);
      const res = await client.get('/api/admin/packages/gold');
      setGoldList(res.data ?? []);
    } catch {
      onToast('Không thể tải danh sách gói vàng', 'error');
    } finally {
      setGoldLoading(false);
    }
  }, [onToast]);

  // Fetch Pro Packages
  const fetchProPackages = useCallback(async () => {
    try {
      setProLoading(true);
      const res = await client.get('/api/admin/packages/pro');
      setProList(res.data ?? []);
    } catch {
      onToast('Không thể tải danh sách gói Pro', 'error');
    } finally {
      setProLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchGoldPackages();
    fetchProPackages();
  }, [fetchGoldPackages, fetchProPackages]);

  // ─── GOLD HANDLERS ──────────────────────────────────────────────────────────
  const openCreateGold = () => {
    setEditGold(null);
    setGoldForm({
      name: '',
      goldAmount: '10',
      bonusGold: '0',
      priceVnd: '20000',
      isActive: true,
      displayOrder: String(goldList.length),
    });
    setGoldModalOpen(true);
  };

  const openEditGold = (pkg: GoldPackageDto) => {
    setEditGold(pkg);
    setGoldForm({
      name: pkg.name,
      goldAmount: String(pkg.goldAmount),
      bonusGold: String(pkg.bonusGold),
      priceVnd: String(pkg.priceVnd),
      isActive: pkg.isActive,
      displayOrder: String(pkg.displayOrder),
    });
    setGoldModalOpen(true);
  };

  const handleSaveGold = async () => {
    if (!goldForm.name.trim()) {
      onToast('Vui lòng nhập tên gói vàng', 'error');
      return;
    }
    const gAmt = Number(goldForm.goldAmount);
    const bAmt = Number(goldForm.bonusGold || 0);
    const pVnd = Number(goldForm.priceVnd);

    if (isNaN(gAmt) || gAmt <= 0) {
      onToast('Số vàng nhận được phải lớn hơn 0', 'error');
      return;
    }
    if (isNaN(pVnd) || pVnd <= 0) {
      onToast('Giá tiền VNĐ phải lớn hơn 0', 'error');
      return;
    }

    try {
      setGoldSaving(true);
      const payload = {
        name: goldForm.name.trim(),
        goldAmount: gAmt,
        bonusGold: isNaN(bAmt) ? 0 : bAmt,
        priceVnd: pVnd,
        isActive: goldForm.isActive,
        displayOrder: Number(goldForm.displayOrder) || 0,
      };

      if (editGold) {
        await client.put(`/api/admin/packages/gold/${editGold.id}`, payload);
        onToast('Đã cập nhật gói vàng thành công', 'success');
      } else {
        await client.post('/api/admin/packages/gold', payload);
        onToast('Đã tạo gói vàng mới thành công', 'success');
      }
      setGoldModalOpen(false);
      fetchGoldPackages();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu gói vàng', 'error');
    } finally {
      setGoldSaving(false);
    }
  };

  const handleToggleGoldActive = async (pkg: GoldPackageDto) => {
    try {
      await client.put(`/api/admin/packages/gold/${pkg.id}`, { isActive: !pkg.isActive });
      onToast(`Đã ${!pkg.isActive ? 'bật' : 'tắt'} gói vàng "${pkg.name}"`, 'success');
      fetchGoldPackages();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi cập nhật trạng thái', 'error');
    }
  };

  const handleDeleteGold = async () => {
    if (!deleteGoldTarget) return;
    try {
      setDeletingGold(true);
      await client.delete(`/api/admin/packages/gold/${deleteGoldTarget.id}`);
      onToast(`Đã xóa gói vàng "${deleteGoldTarget.name}"`, 'success');
      setDeleteGoldTarget(null);
      fetchGoldPackages();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa gói vàng', 'error');
    } finally {
      setDeletingGold(false);
    }
  };

  // ─── PRO HANDLERS ───────────────────────────────────────────────────────────
  const openCreatePro = () => {
    setEditPro(null);
    setProForm({
      name: '',
      durationDays: '30',
      priceVnd: '50000',
      originalPriceVnd: '',
      description: '',
      isRecommended: false,
      isActive: true,
      displayOrder: String(proList.length),
    });
    setProModalOpen(true);
  };

  const openEditPro = (pkg: ProPackageDto) => {
    setEditPro(pkg);
    setProForm({
      name: pkg.name,
      durationDays: String(pkg.durationDays),
      priceVnd: String(pkg.priceVnd),
      originalPriceVnd: pkg.originalPriceVnd !== null ? String(pkg.originalPriceVnd) : '',
      description: pkg.description ?? '',
      isRecommended: pkg.isRecommended,
      isActive: pkg.isActive,
      displayOrder: String(pkg.displayOrder),
    });
    setProModalOpen(true);
  };

  const handleSavePro = async () => {
    if (!proForm.name.trim()) {
      onToast('Vui lòng nhập tên gói Pro', 'error');
      return;
    }
    const days = Number(proForm.durationDays);
    const pVnd = Number(proForm.priceVnd);
    const oVnd = proForm.originalPriceVnd ? Number(proForm.originalPriceVnd) : null;

    if (isNaN(days) || days <= 0) {
      onToast('Thời hạn gói (số ngày) phải lớn hơn 0', 'error');
      return;
    }
    if (isNaN(pVnd) || pVnd <= 0) {
      onToast('Giá bán VNĐ phải lớn hơn 0', 'error');
      return;
    }

    try {
      setProSaving(true);
      const payload = {
        name: proForm.name.trim(),
        durationDays: days,
        priceVnd: pVnd,
        originalPriceVnd: oVnd,
        description: proForm.description.trim() || null,
        isRecommended: proForm.isRecommended,
        isActive: proForm.isActive,
        displayOrder: Number(proForm.displayOrder) || 0,
      };

      if (editPro) {
        await client.put(`/api/admin/packages/pro/${editPro.id}`, payload);
        onToast('Đã cập nhật gói Pro thành công', 'success');
      } else {
        await client.post('/api/admin/packages/pro', payload);
        onToast('Đã tạo gói Pro mới thành công', 'success');
      }
      setProModalOpen(false);
      fetchProPackages();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu gói Pro', 'error');
    } finally {
      setProSaving(false);
    }
  };

  const handleToggleProActive = async (pkg: ProPackageDto) => {
    try {
      await client.put(`/api/admin/packages/pro/${pkg.id}`, { isActive: !pkg.isActive });
      onToast(`Đã ${!pkg.isActive ? 'bật' : 'tắt'} gói Pro "${pkg.name}"`, 'success');
      fetchProPackages();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi cập nhật trạng thái', 'error');
    }
  };

  const handleDeletePro = async () => {
    if (!deleteProTarget) return;
    try {
      setDeletingPro(true);
      await client.delete(`/api/admin/packages/pro/${deleteProTarget.id}`);
      onToast(`Đã xóa gói Pro "${deleteProTarget.name}"`, 'success');
      setDeleteProTarget(null);
      fetchProPackages();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa gói Pro', 'error');
    } finally {
      setDeletingPro(false);
    }
  };

  return (
    <div>
      {/* Top Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            Quản lý Bảng giá & Gói nạp
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Cấu hình danh sách gói nạp Vàng và các gói Đăng ký Pro dùng cho App.
          </p>
        </div>
        {activeTab === 'gold' ? (
          <Button variant="primary" icon={<IconPlus size={18} />} onClick={openCreateGold}>
            Thêm gói Vàng mới
          </Button>
        ) : (
          <Button variant="primary" icon={<IconPlus size={18} />} onClick={openCreatePro}>
            Thêm gói Pro mới
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab('gold')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeTab === 'gold' ? '#6c63ff' : '#ffffff',
            color: activeTab === 'gold' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === 'gold' ? '0 4px 14px rgba(108,99,255,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s',
          }}
        >
          <IconGold size={18} color={activeTab === 'gold' ? '#ffffff' : '#f59e0b'} />
          Gói Nạp Vàng ({goldList.length})
        </button>

        <button
          onClick={() => setActiveTab('pro')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeTab === 'pro' ? '#6c63ff' : '#ffffff',
            color: activeTab === 'pro' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === 'pro' ? '0 4px 14px rgba(108,99,255,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s',
          }}
        >
          <IconSparkles size={18} color={activeTab === 'pro' ? '#ffffff' : '#d97706'} />
          Gói Đăng ký Pro ({proList.length})
        </button>
      </div>

      {/* ─── TAB 1: GOLD PACKAGES ────────────────────────────────────────────── */}
      {activeTab === 'gold' && (
        <>
          {goldLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
          ) : goldList.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px', background: '#ffffff',
              borderRadius: 20, border: '1px solid #e2e8f0', color: '#64748b'
            }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Chưa có gói nạp Vàng nào</h3>
              <p style={{ margin: 0, fontSize: 14 }}>Nhấp vào nút "Thêm gói Vàng mới" để bắt đầu cấu hình.</p>
            </div>
          ) : (
            <div style={{
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20,
              boxShadow: '0 4px 20px rgba(15,23,42,0.03)', overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 80 }}>Thứ tự</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Tên gói</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Vàng gốc</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Vàng thưởng</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Tổng Vàng</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Giá VNĐ</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 140 }}>Trạng thái</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 100, textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {goldList.map(pkg => (
                    <tr key={pkg.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: pkg.isActive ? 1 : 0.65, transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#64748b' }}>#{pkg.displayOrder}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0f172a' }}>{pkg.name}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#f59e0b' }}>
                        {pkg.goldAmount}
                      </td>
                      <td style={{ padding: '16px 20px', color: pkg.bonusGold > 0 ? '#10b981' : '#94a3b8', fontWeight: pkg.bonusGold > 0 ? 700 : 400 }}>
                        {pkg.bonusGold > 0 ? `+${pkg.bonusGold}` : '0'}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: '#d97706' }}>
                        {pkg.goldAmount + pkg.bonusGold} Gold
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: '#10b981' }}>
                        {formatVND(pkg.priceVnd)}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                          <ToggleSwitch checked={pkg.isActive} onChange={() => handleToggleGoldActive(pkg)} />
                          <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 12,
                            background: pkg.isActive ? '#ecfdf5' : '#f1f5f9',
                            color: pkg.isActive ? '#059669' : '#64748b',
                            whiteSpace: 'nowrap'
                          }}>
                            {pkg.isActive ? 'Đang bật' : 'Đã ẩn'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditGold(pkg)}
                            title="Chỉnh sửa"
                            style={{
                              background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                              width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <IconEdit size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteGoldTarget(pkg)}
                            title="Xóa"
                            style={{
                              background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444',
                              width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <IconDelete size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: PRO PACKAGES ─────────────────────────────────────────────── */}
      {activeTab === 'pro' && (
        <>
          {proLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
          ) : proList.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px', background: '#ffffff',
              borderRadius: 20, border: '1px solid #e2e8f0', color: '#64748b'
            }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Chưa có gói Đăng ký Pro nào</h3>
              <p style={{ margin: 0, fontSize: 14 }}>Nhấp vào nút "Thêm gói Pro mới" để bắt đầu cấu hình.</p>
            </div>
          ) : (
            <div style={{
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20,
              boxShadow: '0 4px 20px rgba(15,23,42,0.03)', overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 80 }}>Thứ tự</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Tên gói Pro</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Thời hạn</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Giá bán VNĐ</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Giá gốc</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>Đặc điểm</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 140 }}>Trạng thái</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', width: 100, textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {proList.map(pkg => (
                    <tr key={pkg.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: pkg.isActive ? 1 : 0.65, transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#64748b' }}>#{pkg.displayOrder}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{pkg.name}</span>
                          {pkg.isRecommended && (
                            <span style={{
                              background: 'linear-gradient(90deg, #ff79c6, #bd93f9)',
                              color: '#ffffff',
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 10,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              HOT
                            </span>
                          )}
                        </div>
                        {pkg.description && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{pkg.description}</div>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#6c63ff' }}>
                        {pkg.durationDays} Ngày
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: '#10b981' }}>
                        {formatVND(pkg.priceVnd)}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#94a3b8', textDecoration: 'line-through', fontSize: 13 }}>
                        {pkg.originalPriceVnd ? formatVND(pkg.originalPriceVnd) : '—'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          background: pkg.isRecommended ? '#fef3c7' : '#f1f5f9',
                          color: pkg.isRecommended ? '#d97706' : '#64748b',
                        }}>
                          {pkg.isRecommended ? 'Được gợi ý' : 'Thường'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                          <ToggleSwitch checked={pkg.isActive} onChange={() => handleToggleProActive(pkg)} />
                          <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 12,
                            background: pkg.isActive ? '#ecfdf5' : '#f1f5f9',
                            color: pkg.isActive ? '#059669' : '#64748b',
                            whiteSpace: 'nowrap'
                          }}>
                            {pkg.isActive ? 'Đang bật' : 'Đã ẩn'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditPro(pkg)}
                            title="Chỉnh sửa"
                            style={{
                              background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                              width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <IconEdit size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteProTarget(pkg)}
                            title="Xóa"
                            style={{
                              background: '#fef2f2', border: '1px solid #fee2e8', color: '#ef4444',
                              width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <IconDelete size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── MODAL GOLD PACKAGE ─────────────────────────────────────────────── */}
      <Modal
        open={goldModalOpen}
        title={editGold ? `Chỉnh sửa gói Vàng "${editGold.name}"` : 'Thêm gói Nạp Vàng mới'}
        onClose={() => setGoldModalOpen(false)}
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Tên gói Vàng"
            value={goldForm.name}
            onChange={(e) => setGoldForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ví dụ: Túi Vàng Nhỏ, Rương Vàng..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Số Vàng gốc nhận được"
              type="number"
              min="1"
              value={goldForm.goldAmount}
              onChange={(e) => setGoldForm(prev => ({ ...prev, goldAmount: e.target.value }))}
            />
            <Input
              label="Vàng thưởng thêm (Bonus)"
              type="number"
              min="0"
              value={goldForm.bonusGold}
              onChange={(e) => setGoldForm(prev => ({ ...prev, bonusGold: e.target.value }))}
            />
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569' }}>
            Tổng số Vàng người dùng nhận: <strong>{(Number(goldForm.goldAmount) || 0) + (Number(goldForm.bonusGold) || 0)} Gold</strong>
          </div>

          <div>
            <Input
              label="Giá bán tiền mặt (VNĐ)"
              type="number"
              min="1000"
              step="1000"
              value={goldForm.priceVnd}
              onChange={(e) => setGoldForm(prev => ({ ...prev, priceVnd: e.target.value }))}
              placeholder="Ví dụ: 20000"
            />
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
              Định dạng tiền tệ: {formatVND(goldForm.priceVnd)}
            </div>
          </div>

          <Input
            label="Thứ tự hiển thị (displayOrder)"
            type="number"
            value={goldForm.displayOrder}
            onChange={(e) => setGoldForm(prev => ({ ...prev, displayOrder: e.target.value }))}
          />

          <div style={{ display: 'flex', gap: 24, padding: '4px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#475569' }}>
              <input
                type="checkbox"
                checked={goldForm.isActive}
                onChange={(e) => setGoldForm(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              Kích hoạt gói này (Hiển thị cho người dùng mua)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setGoldModalOpen(false)} disabled={goldSaving}>Hủy</Button>
            <Button variant="primary" loading={goldSaving} onClick={handleSaveGold}>
              {editGold ? 'Lưu thay đổi' : 'Tạo gói Vàng'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL PRO PACKAGE ──────────────────────────────────────────────── */}
      <Modal
        open={proModalOpen}
        title={editPro ? `Chỉnh sửa gói Pro "${editPro.name}"` : 'Thêm gói Đăng ký Pro mới'}
        onClose={() => setProModalOpen(false)}
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Tên gói Pro"
            value={proForm.name}
            onChange={(e) => setProForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ví dụ: Gói Pro 1 Tháng, Gói Pro 1 Năm..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Thời hạn (Số ngày)"
              type="number"
              min="1"
              value={proForm.durationDays}
              onChange={(e) => setProForm(prev => ({ ...prev, durationDays: e.target.value }))}
              placeholder="30"
            />
            <Input
              label="Thứ tự hiển thị"
              type="number"
              value={proForm.displayOrder}
              onChange={(e) => setProForm(prev => ({ ...prev, displayOrder: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Input
                label="Giá bán thực tế (VNĐ)"
                type="number"
                min="1000"
                step="1000"
                value={proForm.priceVnd}
                onChange={(e) => setProForm(prev => ({ ...prev, priceVnd: e.target.value }))}
                placeholder="50000"
              />
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                Hiển thị: {formatVND(proForm.priceVnd)}
              </div>
            </div>
            <div>
              <Input
                label="Giá gốc gạch chân (VNĐ)"
                type="number"
                min="0"
                step="1000"
                value={proForm.originalPriceVnd}
                onChange={(e) => setProForm(prev => ({ ...prev, originalPriceVnd: e.target.value }))}
                placeholder="100000 (Tùy chọn)"
              />
              {proForm.originalPriceVnd && (
                <div style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'line-through', marginTop: 4 }}>
                  Gạch chân: {formatVND(proForm.originalPriceVnd)}
                </div>
              )}
            </div>
          </div>

          <Input
            label="Mô tả ưu đãi / Ghi chú"
            value={proForm.description}
            onChange={(e) => setProForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Ví dụ: Tiết kiệm 50%, tặng kèm huy hiệu đặc biệt..."
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#0f172a', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={proForm.isRecommended}
                onChange={(e) => setProForm(prev => ({ ...prev, isRecommended: e.target.checked }))}
              />
              Đánh dấu gói Gợi ý / HOT (Hiển thị nổi bật)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#475569' }}>
              <input
                type="checkbox"
                checked={proForm.isActive}
                onChange={(e) => setProForm(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              Kích hoạt gói này (Bật cho người dùng đăng ký)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setProModalOpen(false)} disabled={proSaving}>Hủy</Button>
            <Button variant="primary" loading={proSaving} onClick={handleSavePro}>
              {editPro ? 'Lưu thay đổi' : 'Tạo gói Pro'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Gold Confirmation */}
      <ConfirmDialog
        open={deleteGoldTarget !== null}
        title="Xóa gói nạp Vàng"
        message={`Bạn có chắc chắn muốn xóa gói nạp Vàng "${deleteGoldTarget?.name}" không?`}
        onConfirm={handleDeleteGold}
        onCancel={() => setDeleteGoldTarget(null)}
        loading={deletingGold}
      />

      {/* Delete Pro Confirmation */}
      <ConfirmDialog
        open={deleteProTarget !== null}
        title="Xóa gói Đăng ký Pro"
        message={`Bạn có chắc chắn muốn xóa gói Đăng ký Pro "${deleteProTarget?.name}" không?`}
        onConfirm={handleDeletePro}
        onCancel={() => setDeleteProTarget(null)}
        loading={deletingPro}
      />
    </div>
  );
}
