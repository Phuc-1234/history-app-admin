// src/components/content/VideoPanel.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../../api/client';
import type { AdminVideoDto, GradeDto, TopicDto, LessonDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Textarea, Select } from '../ui/FormField';
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

  // States phục vụ việc Upload video file
  const [uploadType, setUploadType] = useState<'url' | 'file'>('file');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States phục vụ chọn Bài học cho Video mới
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');

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

  // Polling tự động làm mới khi có video đang xử lý (5 giây một lần)
  useEffect(() => {
    const hasProcessing = videos.some(v => v.status === 'PROCESSING' || v.status === 'PENDING');
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const res = await client.get('/api/admin/videos');
        setVideos(res.data.videos ?? []);
      } catch {
        // bỏ qua lỗi khi cập nhật ngầm
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [videos]);

  // Tải phân cấp Khối lớp - Chủ đề - Bài học
  const loadHierarchy = async (targetLessonId?: number | null) => {
    try {
      const res = await client.get('/api/content/grades');
      const gs: GradeDto[] = res.data.grades ?? [];
      setGrades(gs);
      if (gs.length === 0) {
        setTopics([]);
        setLessons([]);
        setSelectedGradeId('');
        setSelectedTopicId('');
        return;
      }

      if (targetLessonId) {
        // Tìm nhanh Khối lớp và Chủ đề chứa targetLessonId
        const topicPromises = gs.map(async (g) => {
          const tRes = await client.get(`/api/content/grades/${g.id}/topics`);
          const ts: TopicDto[] = tRes.data.topics ?? [];
          const lessonPromises = ts.map(async (t) => {
            const lRes = await client.get(`/api/content/topics/${t.id}/lessons`);
            const ls: LessonDto[] = lRes.data.lessons ?? [];
            return { topic: t, lessons: ls, hasTarget: ls.some(l => l.id === targetLessonId) };
          });
          const topicResults = await Promise.all(lessonPromises);
          const matched = topicResults.find(r => r.hasTarget);
          return {
            grade: g,
            topics: ts,
            matchedTopicResult: matched,
          };
        });

        const gradeResults = await Promise.all(topicPromises);
        const matchedGrade = gradeResults.find(r => r.matchedTopicResult);

        if (matchedGrade && matchedGrade.matchedTopicResult) {
          setSelectedGradeId(String(matchedGrade.grade.id));
          setTopics(matchedGrade.topics);
          setSelectedTopicId(String(matchedGrade.matchedTopicResult.topic.id));
          setLessons(matchedGrade.matchedTopicResult.lessons);
          setForm(f => ({ ...f, lessonId: String(targetLessonId) }));
          return;
        }
      }

      // Mặc định chọn khối lớp & chủ đề đầu tiên nếu chưa liên kết bài học
      const firstGradeId = String(gs[0].id);
      setSelectedGradeId(firstGradeId);
      const tRes = await client.get(`/api/content/grades/${firstGradeId}/topics`);
      const ts: TopicDto[] = tRes.data.topics ?? [];
      setTopics(ts);
      if (ts.length > 0) {
        const firstTopicId = String(ts[0].id);
        setSelectedTopicId(firstTopicId);
        const lRes = await client.get(`/api/content/topics/${firstTopicId}/lessons`);
        const ls: LessonDto[] = lRes.data.lessons ?? [];
        setLessons(ls);
        if (targetLessonId === undefined && ls.length > 0) {
          setForm(f => ({ ...f, lessonId: String(ls[0].id) }));
        }
      } else {
        setSelectedTopicId('');
        setLessons([]);
      }
    } catch {
      onToast('Không tải được danh mục phân cấp bài học', 'error');
    }
  };

  const loadTopicsData = async (gradeId: string) => {
    if (!gradeId) return;
    try {
      const res = await client.get(`/api/content/grades/${gradeId}/topics`);
      const ts = res.data.topics ?? [];
      setTopics(ts);
      if (ts.length > 0) {
        const firstTopicId = String(ts[0].id);
        setSelectedTopicId(firstTopicId);
        await loadLessonsData(firstTopicId);
      } else {
        setSelectedTopicId('');
        setLessons([]);
        setForm(f => ({ ...f, lessonId: '' }));
      }
    } catch {
      onToast('Không tải được danh sách chủ đề', 'error');
    }
  };

  const loadLessonsData = async (topicId: string) => {
    if (!topicId) return;
    try {
      const res = await client.get(`/api/content/topics/${topicId}/lessons`);
      const ls = res.data.lessons ?? [];
      setLessons(ls);
      if (ls.length > 0) {
        setForm(f => ({ ...f, lessonId: String(ls[0].id) }));
      } else {
        setForm(f => ({ ...f, lessonId: '' }));
      }
    } catch {
      onToast('Không tải được danh sách bài học', 'error');
    }
  };

  const handleGradeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedGradeId(val);
    await loadTopicsData(val);
  };

  const handleTopicChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTopicId(val);
    await loadLessonsData(val);
  };

  const openCreate = () => {
    setEditVideo(null);
    setForm({ ...EMPTY_FORM, position: String(videos.length + 1) });
    setUploadType('file');
    setVideoFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
    loadHierarchy();
  };

  const openEdit = (v: AdminVideoDto) => {
    setEditVideo(v);
    setForm({
      title: v.title,
      position: String(v.position ?? 0),
      summary: v.summary ?? '',
      hlsUrl: v.hlsUrl,
      lessonId: v.lessonId ? String(v.lessonId) : ''
    });
    setUploadType('url');
    setVideoFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
    loadHierarchy(v.lessonId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      onToast('Vui lòng nhập tiêu đề video', 'error');
      return;
    }

    if (uploadType === 'url' && !form.hlsUrl.trim()) {
      onToast('Vui lòng nhập đường dẫn phát HLS (.m3u8)', 'error');
      return;
    }

    if (uploadType === 'file' && !editVideo && !videoFile) {
      onToast('Vui lòng chọn tệp tin video .mp4 để tải lên', 'error');
      return;
    }

    try {
      setSaving(true);
      const positionNum = isNaN(Number(form.position)) ? 0 : Number(form.position);
      const lessonIdNum = form.lessonId ? Number(form.lessonId) : null;

      if (editVideo) {
        // Thực hiện Cập nhật thông tin (Update)
        if (uploadType === 'file' && videoFile) {
          // Có tải video mới để thay thế -> Dùng FormData gửi PATCH
          const formData = new FormData();
          formData.append('title', form.title.trim());
          formData.append('position', String(positionNum));
          formData.append('summary', form.summary.trim());
          formData.append('lessonId', lessonIdNum !== null ? String(lessonIdNum) : '');
          formData.append('video', videoFile);

          await client.patch(`/api/admin/videos/${editVideo.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const total = progressEvent.total ?? 1;
              const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
              setUploadProgress(percentCompleted);
            }
          });

          onToast(`Đang tải lên video thay thế cho ${form.title}. Video sẽ được xử lý ngầm dưới background.`, 'success');
          setModalOpen(false);
          fetchVideos();
        } else {
          // Cập nhật thông tin bình thường (không thay thế video hoặc dùng URL HLS mới)
          const payload = {
            title: form.title.trim(),
            position: positionNum,
            summary: form.summary.trim() || null,
            hlsUrl: form.hlsUrl.trim(),
            lessonId: lessonIdNum
          };
          await client.patch(`/api/admin/videos/${editVideo.id}`, payload);
          onToast(`Đã cập nhật thông tin video: ${form.title}`, 'success');
          setModalOpen(false);
          fetchVideos();
        }
      } else {
        // Tạo video mới (Create)
        if (uploadType === 'file') {
          // Gửi Multipart Form để tải file MP4 và transcode ngầm
          const formData = new FormData();
          formData.append('title', form.title.trim());
          formData.append('position', String(positionNum));
          formData.append('summary', form.summary.trim());
          if (lessonIdNum !== null) formData.append('lessonId', String(lessonIdNum));
          if (videoFile) formData.append('video', videoFile);

          await client.post('/api/admin/videos/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const total = progressEvent.total ?? 1;
              const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
              setUploadProgress(percentCompleted);
            }
          });

          onToast(`Đang tải lên video ${form.title}. Video sẽ được xử lý ngầm dưới background.`, 'success');
          setModalOpen(false);
          fetchVideos();
        } else {
          // Tạo bình thường bằng cách cung cấp Link URL phát HLS trực tiếp
          const payload = {
            title: form.title.trim(),
            position: positionNum,
            summary: form.summary.trim() || null,
            hlsUrl: form.hlsUrl.trim(),
            lessonId: lessonIdNum
          };
          await client.post('/api/admin/videos', payload);
          onToast(`Đã tạo video bài học: ${form.title}`, 'success');
          setModalOpen(false);
          fetchVideos();
        }
      }
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
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner-mini {
          animation: spin 1s linear infinite;
        }
        .tab-btn {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #c37938;
          color: #ffffff;
          border-color: #c37938;
        }
        .tab-btn:first-child {
          border-top-left-radius: 8px;
          border-bottom-left-radius: 8px;
          border-right: none;
        }
        .tab-btn:last-child {
          border-top-right-radius: 8px;
          border-bottom-right-radius: 8px;
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Video bài học</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{videos.length} video trong hệ thống</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={fetchVideos}>Làm mới</Button>
          <Button icon={<IconPlus size={16} />} onClick={openCreate}>Thêm Video</Button>
        </div>
      </div>

      {loading && videos.length === 0 ? (
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
                <th style={TH_STYLE}>Trạng thái</th>
                <th style={TH_STYLE}>Liên kết phát HLS (m3u8)</th>
                <th style={TH_STYLE}>Mô tả tóm tắt</th>
                <th style={{ ...TH_STYLE, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v, idx) => (
                <tr key={v.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...TD_STYLE, fontWeight: 600, color: '#0f172a' }}>{v.title}</td>
                  <td style={TD_STYLE}>
                    {v.status === 'READY' && (
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>Sẵn sàng</span>
                    )}
                    {v.status === 'PROCESSING' && (
                      <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span className="spinner-mini" style={{ width: 10, height: 10, border: '2px solid #d97706', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}></span>
                        Đang transcode ({v.transcodeProgress ?? 0}%)
                      </span>
                    )}
                    {v.status === 'PENDING' && (
                      <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>Đang chờ...</span>
                    )}
                    {v.status === 'FAILED' && (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>Lỗi xử lý</span>
                    )}
                  </td>
                  <td style={{ ...TD_STYLE, fontSize: 13, fontFamily: 'monospace', color: v.status === 'READY' ? '#c37938' : '#94a3b8', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.status === 'READY' ? v.hlsUrl : 'Chờ xử lý để cấp link...'}
                  </td>
                  <td style={{ ...TD_STYLE, color: '#64748b', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.summary ?? '—'}
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button 
                        variant="secondary" 
                        icon={<IconEdit size={14} />} 
                        onClick={() => openEdit(v)} 
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        disabled={v.status === 'PROCESSING' || v.status === 'PENDING'}
                      >
                        Sửa
                      </Button>
                      <Button 
                        variant="danger" 
                        icon={<IconDelete size={14} />} 
                        onClick={() => setDeleteTarget(v)} 
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        disabled={v.status === 'PROCESSING' || v.status === 'PENDING'}
                      >
                        Xóa
                      </Button>
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
        <Input label="Vị trí hiển thị (Thứ tự)" type="number" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="Ví dụ: 1" />
        <Textarea label="Tóm tắt nội dung video" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Mô tả tóm tắt nội dung video lịch sử..." />

        {/* Liên kết bài học */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 16, background: '#fafbff' }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>Bài học liên kết</span>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Select label="Khối lớp" value={selectedGradeId} onChange={handleGradeChange}>
              {grades.map(g => (
                <option key={g.id} value={g.id}>Lớp {g.id}</option>
              ))}
            </Select>

            <Select label="Chủ đề" value={selectedTopicId} onChange={handleTopicChange} disabled={topics.length === 0}>
              {topics.length === 0 && <option value="">(Không có chủ đề)</option>}
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>

          <Select label="Bài học" value={form.lessonId} onChange={(e) => setForm(f => ({ ...f, lessonId: e.target.value }))}>
            <option value="">Không liên kết bài học</option>
            {lessons.map(l => (
              <option key={l.id} value={l.id}>Bài {l.position}: {l.name}</option>
            ))}
          </Select>
        </div>

        {/* Option: Upload File MP4 hoặc nhập URL HLS */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
            {editVideo ? 'Thay đổi nguồn video (Tùy chọn)' : 'Phương thức nguồn video'}
          </span>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            <button 
              type="button" 
              className={`tab-btn ${uploadType === 'file' ? 'active' : ''}`}
              onClick={() => setUploadType('file')}
            >
              Tải lên file MP4
            </button>
            <button 
              type="button" 
              className={`tab-btn ${uploadType === 'url' ? 'active' : ''}`}
              onClick={() => setUploadType('url')}
            >
              Nhập link phát HLS (.m3u8)
            </button>
          </div>

          {uploadType === 'file' ? (
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 20, textAlign: 'center', background: '#f8fafc' }}>
              <input 
                type="file" 
                accept="video/mp4" 
                onChange={handleFileChange} 
                ref={fileInputRef}
                style={{ display: 'block', margin: '0 auto', fontSize: 14 }}
              />
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>Hỗ trợ file định dạng .mp4 (Dung lượng tối đa 100MB)</p>
              {videoFile && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
                  Đã chọn: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              )}
              {editVideo && !videoFile && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                  (Để trống nếu không muốn thay thế file video cũ)
                </div>
              )}
            </div>
          ) : (
            <Input label="Đường dẫn phát (HLS .m3u8)" value={form.hlsUrl} onChange={(e) => setForm((f) => ({ ...f, hlsUrl: e.target.value }))} placeholder="https://example.com/stream/video.m3u8" />
          )}
        </div>

        {/* Thanh tiến trình upload */}
        {saving && uploadType === 'file' && uploadProgress >= 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              <span>Đang tải lên file MP4 lên server...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#c37938', transition: 'width 0.1s linear' }}></div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>{editVideo ? 'Lưu thay đổi' : 'Tạo mới & Lưu'}</Button>
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
