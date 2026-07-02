// src/components/content/VideoPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { AdminVideoDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Textarea } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconVideo } from '../ui/Icons';

interface VideoPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

const EMPTY_FORM = {
  title: '',
  position: '',
  summary: '',
  hlsUrl: '',
  lessonId: ''
};

export function VideoPanel({ onToast }: VideoPanelProps) {
  const [videos, setVideos] = useState<AdminVideoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<AdminVideoDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminVideoDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/admin/videos');
      setVideos(res.data.videos ?? []);
    } catch {
      onToast('Không tải được danh sách video bài học', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const openCreate = () => {
    setEditVideo(null);
    setForm({ ...EMPTY_FORM, position: '0' });
    setModalOpen(true);
  };

  const openEdit = (v: AdminVideoDto) => {
    setEditVideo(v);
    setForm({
      title: v.title,
      position: String(v.position ?? 0),
      summary: v.summary ?? '',
      hlsUrl: v.hlsUrl,
      lessonId: ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.hlsUrl) {
      onToast('Vui lòng điền đầy đủ tiêu đề và đường dẫn phát HLS', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        position: isNaN(Number(form.position)) ? 0 : Number(form.position),
        summary: form.summary || null,
        hlsUrl: form.hlsUrl,
        lessonId: form.lessonId ? Number(form.lessonId) : null
      };

      if (editVideo) {
        await client.patch(`/api/admin/videos/${editVideo.id}`, payload);
        onToast(`Đã cập nhật video ${form.title}`, 'success');
      } else {
        await client.post('/api/admin/videos', payload);
        onToast(`Đã tạo video ${form.title}`, 'success');
      }
      setModalOpen(false);
      fetchVideos();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu video', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/videos/${deleteTarget.id}`);
      onToast(`Đã xóa video ${deleteTarget.title}`, 'success');
      setDeleteTarget(null);
      fetchVideos();
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa video', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Video bài học</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{videos.length} video trong hệ thống</p>
        </div>
        <Button icon={<IconPlus size={16} />} onClick={openCreate}>Thêm Video</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <IconVideo size={48} color="#94a3b8" />
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>Chưa có video nào trong hệ thống</p>
        </div>
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))' }}>
                <th style={TH_STYLE}>Tiêu đề video</th>
                <th style={TH_STYLE}>Liên kết phát HLS (m3u8)</th>
                <th style={TH_STYLE}>Mô tả tóm tắt</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v, idx) => (
                <tr key={v.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...TD_STYLE, fontWeight: 600, color: '#0f172a' }}>{v.title}</td>
                  <td style={{ ...TD_STYLE, fontSize: 13, fontFamily: 'monospace', color: '#6c63ff', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.hlsUrl}
                  </td>
                  <td style={{ ...TD_STYLE, color: '#64748b', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.summary ?? '—'}
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="secondary" icon={<IconEdit size={14} />} onClick={() => openEdit(v)} style={{ padding: '6px 12px', fontSize: 13 }}>Sửa</Button>
                      <Button variant="danger" icon={<IconDelete size={14} />} onClick={() => setDeleteTarget(v)} style={{ padding: '6px 12px', fontSize: 13 }}>Xóa</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} title={editVideo ? `Sửa video: ${editVideo.title}` : 'Thêm video mới'} onClose={() => setModalOpen(false)}>
        <Input label="Tiêu đề video" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ví dụ: Đoạn trích trận đánh Rạch Gầm - Xoài Mút" />
        <Input label="Đường dẫn phát (HLS .m3u8)" value={form.hlsUrl} onChange={(e) => setForm((f) => ({ ...f, hlsUrl: e.target.value }))} placeholder="https://example.com/stream/video.m3u8" />
        <Textarea label="Tóm tắt nội dung video" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Mô tả tóm tắt nội dung video lịch sử..." />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editVideo ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
        </div>
      </Modal>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Xóa video bài học?`}
        message={`Bạn có chắc chắn muốn xóa video "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
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
