// src/components/content/TestPresetPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { TestPresetDto, ScopeTestPresetDefaultDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconClock, IconTarget, IconQuestion } from '../ui/Icons';

interface TestPresetPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const EMPTY_PRESET_FORM = {
  name: '',
  purposeType: 'PRACTICE' as 'EXAM' | 'PRACTICE',
  questionCount: '10',
  passThreshold: '80',
  timeLimit: '15',
  ratio1: '40',
  ratio2: '30',
  ratio3: '20',
  ratio4: '10'
};

const EMPTY_DEFAULT_FORM = {
  scopeType: 'GRADE' as 'GRADE' | 'TOPIC' | 'LESSON' | 'SECTION' | 'NODE' | 'NATIONAL',
  purposeType: 'PRACTICE' as 'EXAM' | 'PRACTICE',
  defaultTestPresetId: ''
};

export function TestPresetPanel({ onToast }: TestPresetPanelProps) {
  const [presets, setPresets] = useState<TestPresetDto[]>([]);
  const [defaults, setDefaults] = useState<ScopeTestPresetDefaultDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Preset CRUD states
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [editPreset, setEditPreset] = useState<TestPresetDto | null>(null);
  const [presetForm, setPresetForm] = useState(EMPTY_PRESET_FORM);
  const [presetSaving, setPresetSaving] = useState(false);
  const [presetDeleteTarget, setPresetDeleteTarget] = useState<TestPresetDto | null>(null);
  const [presetDeleting, setPresetDeleting] = useState(false);

  // Defaults management states
  const [defaultsModalOpen, setDefaultsModalOpen] = useState(false);
  const [defaultForm, setDefaultForm] = useState(EMPTY_DEFAULT_FORM);
  const [defaultSaving, setDefaultSaving] = useState(false);
  const [defaultsLoading, setDefaultsLoading] = useState(false);

  // 1. Fetch presets on mount
  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/admin/test-presets');
      setPresets(res.data.presets ?? []);
    } catch {
      onToast('Không tải được danh sách mẫu đề', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  const fetchDefaults = useCallback(async () => {
    try {
      setDefaultsLoading(true);
      const res = await client.get('/api/admin/scope-test-preset-defaults');
      setDefaults(res.data.defaults ?? []);
    } catch {
      onToast('Không tải được danh sách preset mặc định', 'error');
    } finally {
      setDefaultsLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const handleOpenDefaults = () => {
    fetchDefaults();
    setDefaultForm({ ...EMPTY_DEFAULT_FORM, defaultTestPresetId: presets[0]?.id ?? '' });
    setDefaultsModalOpen(true);
  };

  // CRUD handlers for Presets
  const openCreatePreset = () => {
    setEditPreset(null);
    setPresetForm(EMPTY_PRESET_FORM);
    setPresetModalOpen(true);
  };

  const openEditPreset = (p: TestPresetDto) => {
    setEditPreset(p);
    const r = p.difficultyRatioJson || {};
    setPresetForm({
      name: p.name,
      purposeType: p.purposeType,
      questionCount: p.questionCount !== null ? String(p.questionCount) : '',
      passThreshold: String(p.passThreshold),
      timeLimit: p.timeLimit !== null ? String(p.timeLimit) : '',
      ratio1: String(r['1'] ?? 40),
      ratio2: String(r['2'] ?? 30),
      ratio3: String(r['3'] ?? 20),
      ratio4: String(r['4'] ?? 10)
    });
    setPresetModalOpen(true);
  };

  const handleSavePreset = async () => {
    const qCount = presetForm.questionCount ? Number(presetForm.questionCount) : null;
    const limit = presetForm.timeLimit ? Number(presetForm.timeLimit) : null;
    const thresh = Number(presetForm.passThreshold);

    if (!presetForm.name || isNaN(thresh)) {
      onToast('Vui lòng điền thông tin hợp lệ', 'error');
      return;
    }

    const totalRatio = Number(presetForm.ratio1) + Number(presetForm.ratio2) + Number(presetForm.ratio3) + Number(presetForm.ratio4);
    if (totalRatio !== 100) {
      onToast(`Tổng tỷ lệ độ khó phải bằng 100% (Hiện tại: ${totalRatio}%)`, 'error');
      return;
    }

    try {
      setPresetSaving(true);
      const difficultyRatioJson = {
        '1': Number(presetForm.ratio1),
        '2': Number(presetForm.ratio2),
        '3': Number(presetForm.ratio3),
        '4': Number(presetForm.ratio4)
      };

      const payload = {
        name: presetForm.name,
        purposeType: presetForm.purposeType,
        questionCount: qCount,
        passThreshold: thresh,
        timeLimit: limit,
        difficultyRatioJson
      };

      if (editPreset) {
        await client.patch(`/api/admin/test-presets/${editPreset.id}`, payload);
        onToast(`Đã cập nhật mẫu đề ${presetForm.name}`, 'success');
      } else {
        await client.post('/api/admin/test-presets', payload);
        onToast(`Đã tạo mẫu đề ${presetForm.name}`, 'success');
      }
      setPresetModalOpen(false);
      fetchPresets();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu mẫu đề', 'error');
    } finally {
      setPresetSaving(false);
    }
  };

  const handleDeletePreset = async () => {
    if (!presetDeleteTarget) return;
    try {
      setPresetDeleting(true);
      await client.delete(`/api/admin/test-presets/${presetDeleteTarget.id}`);
      onToast(`Đã xóa mẫu đề ${presetDeleteTarget.name}`, 'success');
      setPresetDeleteTarget(null);
      fetchPresets();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa mẫu đề', 'error');
    } finally {
      setPresetDeleting(false);
    }
  };

  // Add/Remove Default preset mappings
  const handleSaveDefault = async () => {
    if (!defaultForm.defaultTestPresetId) {
      onToast('Vui lòng chọn mẫu đề', 'error');
      return;
    }
    try {
      setDefaultSaving(true);
      await client.post('/api/admin/scope-test-preset-defaults', defaultForm);
      onToast('Đã cấu hình preset mặc định thành công', 'success');
      fetchDefaults();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu preset mặc định', 'error');
    } finally {
      setDefaultSaving(false);
    }
  };

  const handleDeleteDefault = async (scopeType: string, purposeType: string) => {
    try {
      await client.delete(`/api/admin/scope-test-preset-defaults/${scopeType}/${purposeType}`);
      onToast('Đã xóa cấu hình mặc định', 'success');
      fetchDefaults();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa cấu hình mặc định', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Cấu hình Mẫu đề thi (Test Presets)</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Thiết kế cấu trúc câu hỏi, thời gian và độ khó mặc định</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" onClick={handleOpenDefaults}>Preset Mặc định theo Cấp</Button>
          <Button icon={<IconPlus size={16} />} onClick={openCreatePreset}>Tạo mẫu đề</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : presets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <IconQuestion size={48} color="#94a3b8" />
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>Chưa có cấu hình mẫu đề nào được tạo</p>
        </div>
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <th style={TH_STYLE}>Tên mẫu đề</th>
                <th style={TH_STYLE}>Mục đích</th>
                <th style={TH_STYLE}>Số câu hỏi</th>
                <th style={TH_STYLE}>Điểm đạt / Thời gian</th>
                <th style={TH_STYLE}>Tỷ lệ độ khó (Nhận biết ➔ VDC)</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {presets.map((p, idx) => {
                const r = p.difficultyRatioJson || {};
                return (
                  <tr key={p.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ ...TD_STYLE, fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                    <td style={TD_STYLE}>
                      <span style={{
                        fontSize: 11, padding: '4px 8px', borderRadius: 6, fontWeight: 700,
                        background: p.purposeType === 'EXAM' ? '#fee2e2' : '#ecfdf5',
                        color: p.purposeType === 'EXAM' ? '#ef4444' : '#047857'
                      }}>
                        {p.purposeType === 'EXAM' ? 'EXAM — Thi cử' : 'PRACTICE — Luyện tập'}
                      </span>
                    </td>
                    <td style={{ ...TD_STYLE, fontWeight: 600 }}>
                      {p.questionCount !== null ? `${p.questionCount} câu` : 'Lấy tất cả'}
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconTarget size={13} color="#10b981" /> Đạt: {p.passThreshold}%
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconClock size={13} color="#6366f1" /> {p.timeLimit ? `${p.timeLimit} phút` : 'Vô hạn'}
                        </span>
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ fontSize: 13, color: '#475569', display: 'flex', gap: 8 }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>L1: {r['1'] ?? 40}%</span>
                        <span style={{ background: '#e0e7ff', padding: '2px 6px', borderRadius: 4 }}>L2: {r['2'] ?? 30}%</span>
                        <span style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>L3: {r['3'] ?? 20}%</span>
                        <span style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>L4: {r['4'] ?? 10}%</span>
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEditPreset(p)} style={{ padding: '6px 12px', fontSize: 13 }}>Sửa</Button>
                        <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setPresetDeleteTarget(p)} style={{ padding: '6px 12px', fontSize: 13 }}>Xóa</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preset Create / Edit Modal */}
      <Modal open={presetModalOpen} title={editPreset ? `Sửa mẫu đề: ${editPreset.name}` : 'Tạo cấu hình mẫu đề mới'} onClose={() => setPresetModalOpen(false)}>
        <Input label="Tên cấu hình mẫu đề" value={presetForm.name} onChange={(e) => setPresetForm(f => ({ ...f, name: e.target.value }))} placeholder="Ví dụ: Đề thi 15 phút mặc định" />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Select label="Mục đích sử dụng" value={presetForm.purposeType} onChange={(e) => setPresetForm(f => ({ ...f, purposeType: e.target.value as any }))}>
            <option value="PRACTICE">Luyện tập (Practice)</option>
            <option value="EXAM">Thi cử (Exam)</option>
          </Select>
          <Input label="Số câu hỏi" type="number" value={presetForm.questionCount} onChange={(e) => setPresetForm(f => ({ ...f, questionCount: e.target.value }))} placeholder="Bỏ trống nếu lấy hết" />
          <Input label="Thời gian (phút)" type="number" value={presetForm.timeLimit} onChange={(e) => setPresetForm(f => ({ ...f, timeLimit: e.target.value }))} placeholder="Bỏ trống nếu vô hạn" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
          <Input label="Tỉ lệ điểm vượt qua (%)" type="number" value={presetForm.passThreshold} onChange={(e) => setPresetForm(f => ({ ...f, passThreshold: e.target.value }))} />
        </div>

        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 10 }}>Cấu trúc tỉ lệ độ khó câu hỏi (Tổng bằng 100%)</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <Input label="Lớp 1 (%)" type="number" value={presetForm.ratio1} onChange={(e) => setPresetForm(f => ({ ...f, ratio1: e.target.value }))} />
            <Input label="Lớp 2 (%)" type="number" value={presetForm.ratio2} onChange={(e) => setPresetForm(f => ({ ...f, ratio2: e.target.value }))} />
            <Input label="Lớp 3 (%)" type="number" value={presetForm.ratio3} onChange={(e) => setPresetForm(f => ({ ...f, ratio3: e.target.value }))} />
            <Input label="Lớp 4 (%)" type="number" value={presetForm.ratio4} onChange={(e) => setPresetForm(f => ({ ...f, ratio4: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="ghost" onClick={() => setPresetModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSavePreset} loading={presetSaving}>{editPreset ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      {/* Preset Delete Confirm */}
      <ConfirmDialog
        open={!!presetDeleteTarget}
        title="Xóa cấu hình mẫu đề?"
        message={`Bạn có chắc chắn muốn xóa cấu hình mẫu đề "${presetDeleteTarget?.name}"?`}
        onConfirm={handleDeletePreset}
        onCancel={() => setPresetDeleteTarget(null)}
        loading={presetDeleting}
      />

      {/* Defaults Modal */}
      <Modal open={defaultsModalOpen} title="Cài đặt Preset mặc định theo cấp (Scope Defaults)" onClose={() => setDefaultsModalOpen(false)}>
        
        {/* Form to link a default */}
        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 10 }}>Thêm hoặc cập nhật Preset mặc định</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, alignItems: 'flex-end' }}>
            <Select label="Cấp độ (Scope Type)" value={defaultForm.scopeType} onChange={(e) => setDefaultForm(f => ({ ...f, scopeType: e.target.value as any }))}>
              <option value="NATIONAL">Quốc gia</option>
              <option value="GRADE">Khối lớp</option>
              <option value="TOPIC">Chủ đề</option>
              <option value="LESSON">Bài học</option>
              <option value="SECTION">Phần</option>
              <option value="NODE">Nút kiến thức</option>
            </Select>

            <Select label="Mục đích" value={defaultForm.purposeType} onChange={(e) => setDefaultForm(f => ({ ...f, purposeType: e.target.value as any }))}>
              <option value="PRACTICE">Luyện tập (Practice)</option>
              <option value="EXAM">Thi cử (Exam)</option>
            </Select>

            <Select label="Mẫu cấu hình mặc định" value={defaultForm.defaultTestPresetId} onChange={(e) => setDefaultForm(f => ({ ...f, defaultTestPresetId: e.target.value }))}>
              {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button onClick={handleSaveDefault} loading={defaultSaving} style={{ padding: '6px 16px', fontSize: 13 }}>
              Áp dụng mặc định
            </Button>
          </div>
        </div>

        {/* List of current defaults */}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>Danh sách mặc định hiện tại</span>
        {defaultsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size={24} /></div>
        ) : defaults.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, padding: '10px 0' }}>Chưa có cấu hình mặc định nào</p>
        ) : (
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ ...TH_STYLE, padding: '8px 12px' }}>Cấp độ</th>
                  <th style={{ ...TH_STYLE, padding: '8px 12px' }}>Mục đích</th>
                  <th style={{ ...TH_STYLE, padding: '8px 12px' }}>Mẫu mặc định</th>
                  <th style={{ ...TH_STYLE, padding: '8px 12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {defaults.map((d) => (
                  <tr key={`${d.scopeType}-${d.purposeType}`} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ ...TD_STYLE, padding: '8px 12px', fontWeight: 600 }}>{d.scopeType}</td>
                    <td style={{ ...TD_STYLE, padding: '8px 12px' }}>{d.purposeType}</td>
                    <td style={{ ...TD_STYLE, padding: '8px 12px', color: '#6366f1', fontWeight: 600 }}>{d.presetName ?? d.defaultTestPresetId}</td>
                    <td style={{ ...TD_STYLE, padding: '8px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteDefault(d.scopeType, d.purposeType)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="ghost" onClick={() => setDefaultsModalOpen(false)}>Đóng</Button>
        </div>
      </Modal>
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
