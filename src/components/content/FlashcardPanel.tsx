// src/components/content/FlashcardPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { FlashcardDto, GradeDto, TopicDto, LessonDto, SectionDto, NodeDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Textarea, Select } from '../ui/FormField';
import { RichTextEditor } from '../ui/RichTextEditor';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconFlashcard, IconMagicWand, IconAlert, IconInfo, IconDownload, IconUpload } from '../ui/Icons';
import type { TabId, NavParams } from '../../pages/DashboardPage';
import { getDeleteErrorMessage } from '../../utils/deleteHelper';
import XLSX from 'xlsx-js-style';

export interface SectionWithDepth extends SectionDto {
  depth: number;
}

export interface FormCardItem {
  key: string;
  frontText: string;
  backText: string;
  isAiGenerated?: boolean;
}

interface FlashcardPanelProps {
  onToast: (msg: string, type: ToastType) => void;
  navParams?: NavParams;
  onNavigate?: (tab: TabId, params?: NavParams) => void;
}

export function FlashcardPanel({ onToast, navParams, onNavigate: _onNavigate }: FlashcardPanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [sections, setSections] = useState<SectionWithDepth[]>([]);
  const [nodes, setNodes] = useState<NodeDto[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardDto[]>([]);

  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCard, setEditCard] = useState<FlashcardDto | null>(null);

  // Form modal scope & inputs
  const [formScope, setFormScope] = useState({
    gradeId: '',
    topicId: '',
    lessonId: '',
    sectionId: '',
    nodeId: '',
  });

  const [formCards, setFormCards] = useState<FormCardItem[]>([
    { key: Math.random().toString(), frontText: '', backText: '' }
  ]);

  // Modal cascade options
  const [formTopics, setFormTopics] = useState<TopicDto[]>([]);
  const [formLessons, setFormLessons] = useState<LessonDto[]>([]);
  const [formSections, setFormSections] = useState<SectionWithDepth[]>([]);
  const [formNodes, setFormNodes] = useState<NodeDto[]>([]);

  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlashcardDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // 1. Sequential Cascade Select Fetches
  useEffect(() => {
    let isMounted = true;
    const targetGradeId = navParams?.gradeId ? Number(navParams.gradeId) : null;
    const targetTopicId = navParams?.topicId ? Number(navParams.topicId) : null;
    const targetLessonId = navParams?.lessonId ? Number(navParams.lessonId) : null;

    async function loadCascade() {
      try {
        if (targetGradeId && targetTopicId) {
          const [gRes, tRes, lRes] = await Promise.all([
            client.get('/api/content/grades'),
            client.get(`/api/content/grades/${targetGradeId}/topics`),
            client.get(`/api/content/topics/${targetTopicId}/lessons`)
          ]);
          if (!isMounted) return;

          const gs: GradeDto[] = gRes.data.grades ?? [];
          const ts: TopicDto[] = tRes.data.topics ?? [];
          const ls: LessonDto[] = lRes.data.lessons ?? [];

          setGrades(gs);
          setTopics(ts);
          setLessons(ls);

          setSelectedGradeId(targetGradeId);
          setSelectedTopicId(targetTopicId);

          const activeLessonId = targetLessonId && ls.some(l => l.id === targetLessonId)
            ? targetLessonId
            : (ls.length ? ls[0].id : null);

          setSelectedLessonId(activeLessonId);
          return;
        }

        const gRes = await client.get('/api/content/grades');
        if (!isMounted) return;
        const gs: GradeDto[] = gRes.data.grades ?? [];
        setGrades(gs);

        const activeGradeId = targetGradeId && gs.some(g => g.id === targetGradeId)
          ? targetGradeId
          : (gs.length ? gs[0].id : null);

        setSelectedGradeId(activeGradeId);

        if (!activeGradeId) {
          setTopics([]);
          setLessons([]);
          setSelectedTopicId(null);
          setSelectedLessonId(null);
          return;
        }

        const tRes = await client.get(`/api/content/grades/${activeGradeId}/topics`);
        if (!isMounted) return;
        const ts: TopicDto[] = tRes.data.topics ?? [];
        setTopics(ts);

        const activeTopicId = targetTopicId && ts.some(t => t.id === targetTopicId)
          ? targetTopicId
          : (ts.length ? ts[0].id : null);

        setSelectedTopicId(activeTopicId);

        if (!activeTopicId) {
          setLessons([]);
          setSelectedLessonId(null);
          return;
        }

        const lRes = await client.get(`/api/content/topics/${activeTopicId}/lessons`);
        if (!isMounted) return;
        const ls: LessonDto[] = lRes.data.lessons ?? [];
        setLessons(ls);

        const activeLessonId = targetLessonId && ls.some(l => l.id === targetLessonId)
          ? targetLessonId
          : (ls.length ? ls[0].id : null);

        setSelectedLessonId(activeLessonId);

      } catch (err) {
        console.error('Error loading Flashcard cascade:', err);
      }
    }

    loadCascade();

    return () => {
      isMounted = false;
    };
  }, [navParams?.gradeId, navParams?.topicId, navParams?.lessonId]);

  const handleGradeChange = async (gId: number | null) => {
    setSelectedGradeId(gId);
    setSelectedSectionId(null);
    setSelectedNodeId(null);
    if (!gId) {
      setTopics([]);
      setLessons([]);
      setFlashcards([]);
      setSections([]);
      setNodes([]);
      setSelectedTopicId(null);
      setSelectedLessonId(null);
      return;
    }
    try {
      setLoading(true);
      const res = await client.get(`/api/content/grades/${gId}/topics`);
      const ts: TopicDto[] = res.data.topics ?? [];
      setTopics(ts);
      if (ts.length > 0) {
        const firstTopicId = ts[0].id;
        setSelectedTopicId(firstTopicId);
        const lRes = await client.get(`/api/content/topics/${firstTopicId}/lessons`);
        const ls: LessonDto[] = lRes.data.lessons ?? [];
        setLessons(ls);
        if (ls.length > 0) {
          setSelectedLessonId(ls[0].id);
        } else {
          setSelectedLessonId(null);
          setFlashcards([]);
          setSections([]);
          setNodes([]);
        }
      } else {
        setSelectedTopicId(null);
        setLessons([]);
        setSelectedLessonId(null);
        setFlashcards([]);
        setSections([]);
        setNodes([]);
      }
    } catch {
      onToast('Không tải được danh sách chủ đề', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicChange = async (tId: number | null) => {
    setSelectedTopicId(tId);
    setSelectedSectionId(null);
    setSelectedNodeId(null);
    if (!tId) {
      setLessons([]);
      setFlashcards([]);
      setSections([]);
      setNodes([]);
      setSelectedLessonId(null);
      return;
    }
    try {
      setLoading(true);
      const res = await client.get(`/api/content/topics/${tId}/lessons`);
      const ls: LessonDto[] = res.data.lessons ?? [];
      setLessons(ls);
      if (ls.length > 0) {
        setSelectedLessonId(ls[0].id);
      } else {
        setSelectedLessonId(null);
        setFlashcards([]);
        setSections([]);
        setNodes([]);
      }
    } catch {
      onToast('Không tải được danh sách bài học', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLessonChange = (lId: number | null) => {
    setSelectedLessonId(lId);
    setSelectedSectionId(null);
    setSelectedNodeId(null);
    if (!lId) {
      setFlashcards([]);
      setSections([]);
      setNodes([]);
    }
  };

  const fetchFlashcards = useCallback(async (lessonId: number) => {
    try {
      setLoading(true);
      const res = await client.get(`/api/admin/flashcards?lessonId=${lessonId}`);
      setFlashcards(res.data.flashcards ?? []);
    } catch {
      onToast('Không tải được danh sách thẻ lật', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (selectedLessonId) {
      fetchFlashcards(selectedLessonId);
    } else {
      setFlashcards([]);
      setSections([]);
      setNodes([]);
    }
  }, [selectedLessonId, fetchFlashcards]);

  useEffect(() => {
    if (!selectedLessonId) {
      setSections([]);
      setNodes([]);
      setSelectedSectionId(null);
      setSelectedNodeId(null);
      return;
    }
    client.get(`/api/content/lessons/${selectedLessonId}/tree`).then((r) => {
      const tree = r.data;
      if (tree && tree.sections) {
        const flatSecs: SectionWithDepth[] = [];
        const flatNodes: NodeDto[] = [];
        const traverse = (sList: SectionDto[], depth = 0) => {
          for (const s of sList) {
            flatSecs.push({ ...s, depth });
            if (s.nodes) {
              flatNodes.push(...s.nodes);
            }
            if (s.children) {
              traverse(s.children, depth + 1);
            }
          }
        };
        traverse(tree.sections, 0);
        setSections(flatSecs);
        setNodes(flatNodes);

        if (navParams?.sectionId && flatSecs.some(s => s.id === navParams.sectionId)) {
          setSelectedSectionId(navParams.sectionId);
        } else {
          setSelectedSectionId(null);
        }

        if (navParams?.nodeId && flatNodes.some(n => n.id === navParams.nodeId)) {
          setSelectedNodeId(navParams.nodeId);
        } else {
          setSelectedNodeId(null);
        }
      } else {
        setSections([]);
        setNodes([]);
        setSelectedSectionId(null);
        setSelectedNodeId(null);
      }
    }).catch(() => {
      setSections([]);
      setNodes([]);
      setSelectedSectionId(null);
      setSelectedNodeId(null);
    });
  }, [selectedLessonId, navParams?.sectionId, navParams?.nodeId]);

  // Modal cascade triggers
  const handleFormGradeChange = async (gIdStr: string) => {
    setFormScope(prev => ({ ...prev, gradeId: gIdStr, topicId: '', lessonId: '', sectionId: '', nodeId: '' }));
    setFormTopics([]);
    setFormLessons([]);
    setFormSections([]);
    setFormNodes([]);
    if (!gIdStr) return;
    try {
      const res = await client.get(`/api/content/grades/${gIdStr}/topics`);
      setFormTopics(res.data.topics ?? []);
    } catch {
      onToast('Không tải được danh sách chủ đề', 'error');
    }
  };

  const handleFormTopicChange = async (tIdStr: string) => {
    setFormScope(prev => ({ ...prev, topicId: tIdStr, lessonId: '', sectionId: '', nodeId: '' }));
    setFormLessons([]);
    setFormSections([]);
    setFormNodes([]);
    if (!tIdStr) return;
    try {
      const res = await client.get(`/api/content/topics/${tIdStr}/lessons`);
      setFormLessons(res.data.lessons ?? []);
    } catch {
      onToast('Không tải được danh sách bài học', 'error');
    }
  };

  const handleFormLessonChange = async (lIdStr: string) => {
    setFormScope(prev => ({ ...prev, lessonId: lIdStr, sectionId: '', nodeId: '' }));
    setFormSections([]);
    setFormNodes([]);
    if (!lIdStr) return;
    try {
      const res = await client.get(`/api/content/lessons/${lIdStr}/tree`);
      const tree = res.data;
      if (tree && tree.sections) {
        const flatSecs: SectionWithDepth[] = [];
        const flatNodes: NodeDto[] = [];
        const traverse = (sList: SectionDto[], depth = 0) => {
          for (const s of sList) {
            flatSecs.push({ ...s, depth });
            if (s.nodes) flatNodes.push(...s.nodes);
            if (s.children) traverse(s.children, depth + 1);
          }
        };
        traverse(tree.sections, 0);
        setFormSections(flatSecs);
        setFormNodes(flatNodes);
      }
    } catch {
      onToast('Không tải được danh sách phần', 'error');
    }
  };

  const handleFormSectionChange = (sIdStr: string) => {
    setFormScope(prev => ({ ...prev, sectionId: sIdStr, nodeId: '' }));
  };

  // 2. Individual CRUD Handlers & Batch Helpers
  const openCreate = () => {
    setEditCard(null);
    const gId = selectedGradeId ? String(selectedGradeId) : (grades.length > 0 ? String(grades[0].id) : '');
    const tId = selectedTopicId ? String(selectedTopicId) : '';
    const lId = selectedLessonId ? String(selectedLessonId) : '';
    const sId = selectedSectionId ? String(selectedSectionId) : '';
    const nId = selectedNodeId ? String(selectedNodeId) : '';

    setFormScope({
      gradeId: gId,
      topicId: tId,
      lessonId: lId,
      sectionId: sId,
      nodeId: nId,
    });
    setFormCards([{ key: Math.random().toString(), frontText: '', backText: '' }]);
    setFormTopics(topics);
    setFormLessons(lessons);
    setFormSections(sections);
    setFormNodes(nodes);
    setModalOpen(true);
  };

  const openEdit = (card: FlashcardDto) => {
    setEditCard(card);
    const gId = selectedGradeId ? String(selectedGradeId) : '';
    const tId = selectedTopicId ? String(selectedTopicId) : '';
    const lId = card.lessonId ? String(card.lessonId) : (selectedLessonId ? String(selectedLessonId) : '');
    let sId = card.sectionId ? String(card.sectionId) : '';
    const nId = card.nodeId ? String(card.nodeId) : '';

    if (card.nodeId) {
      const node = nodes.find(n => n.id === card.nodeId);
      if (node && node.sectionId) {
        sId = String(node.sectionId);
      }
    }

    setFormScope({
      gradeId: gId,
      topicId: tId,
      lessonId: lId,
      sectionId: sId,
      nodeId: nId,
    });
    setFormCards([{ key: 'edit', frontText: card.frontText, backText: card.backText }]);
    setFormTopics(topics);
    setFormLessons(lessons);
    setFormSections(sections);
    setFormNodes(nodes);
    setModalOpen(true);
  };

  const addCardItem = () => {
    setFormCards(prev => [...prev, { key: Math.random().toString(), frontText: '', backText: '' }]);
  };

  const removeCardItem = (idx: number) => {
    setFormCards(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCardField = (idx: number, field: 'frontText' | 'backText', val: string) => {
    setFormCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  };

  // Excel Template Download & Import Handlers
  const downloadExcelTemplate = () => {
    const headers = [
      'Mặt trước (Câu hỏi / Thuật ngữ)',
      'Mặt sau (Câu trả lời / Định nghĩa)'
    ];

    const instructions = [
      'Nhập câu hỏi, sự kiện hoặc thuật ngữ lịch sử ở mặt trước của thẻ lật',
      'Nhập nội dung giải thích, câu trả lời hoặc định nghĩa tương ứng ở mặt sau của thẻ lật'
    ];

    const sample1 = [
      'Chiến thắng Điện Biên Phủ diễn ra vào năm nào?',
      'Năm 1954 (ngày 07/05/1954)'
    ];

    const sample2 = [
      'Ai là người đọc bản Tuyên ngôn Độc lập ngày 2/9/1945 tại Quảng trường Ba Đình?',
      'Chủ tịch Hồ Chí Minh'
    ];

    const sample3 = [
      'Chiến dịch Hồ Chí Minh toàn thắng vào thời gian nào?',
      '11 giờ 30 phút ngày 30 tháng 4 năm 1975'
    ];

    const sample4 = [
      'Thủ đô đầu tiên của nước Việt Nam độc lập sau thời Bắc thuộc đóng ở đâu?',
      'Hoa Lư (Ninh Bình)'
    ];

    const data = [headers, instructions, sample1, sample2, sample3, sample4];

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Apply custom column widths
    worksheet['!cols'] = [
      { wch: 45 }, // Mặt trước
      { wch: 45 }  // Mặt sau
    ];

    // Apply custom row heights
    worksheet['!rows'] = [
      { hpt: 30 }, // Header
      { hpt: 35 }, // Instruction
      { hpt: 25 }, // Sample 1
      { hpt: 25 }, // Sample 2
      { hpt: 25 }, // Sample 3
      { hpt: 25 }  // Sample 4
    ];

    // Styling worksheet cells
    for (const key in worksheet) {
      if (key.startsWith('!')) continue;
      const cell = worksheet[key];
      if (!cell) continue;

      const decoded = XLSX.utils.decode_cell(key);
      const row = decoded.r;

      const style: any = {
        font: { name: 'Segoe UI', sz: 10 },
        alignment: { vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      if (row === 0) {
        // Title/Header row
        style.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } };
        style.fill = { fgColor: { rgb: '5B21B6' } };
        style.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        style.border = {
          top: { style: 'medium', color: { rgb: '4C1D95' } },
          bottom: { style: 'medium', color: { rgb: '4C1D95' } },
          left: { style: 'thin', color: { rgb: '7C3AED' } },
          right: { style: 'thin', color: { rgb: '7C3AED' } }
        };
      } else if (row === 1) {
        // Instruction row
        style.font = { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: '4B5563' } };
        style.fill = { fgColor: { rgb: 'F3E8FF' } };
        style.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
        style.border = {
          top: { style: 'thin', color: { rgb: 'DDD6FE' } },
          bottom: { style: 'medium', color: { rgb: 'C084FC' } },
          left: { style: 'thin', color: { rgb: 'E9D5FF' } },
          right: { style: 'thin', color: { rgb: 'E9D5FF' } }
        };
      } else {
        // Sample data rows
        style.font = { name: 'Segoe UI', sz: 10, color: { rgb: '1F2937' } };
        style.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
        if (row % 2 === 0) {
          style.fill = { fgColor: { rgb: 'F9FAFB' } };
        } else {
          style.fill = { fgColor: { rgb: 'FFFFFF' } };
        }
      }

      cell.s = style;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Thẻ Lật');
    XLSX.writeFile(workbook, 'Mau_Import_The_Lat.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const ab = event.target?.result;
        if (!ab) {
          onToast('Không đọc được dữ liệu tệp tin', 'error');
          return;
        }

        const workbook = XLSX.read(ab, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows.length <= 2) {
          onToast('Tệp excel không chứa dữ liệu thẻ lật hợp lệ', 'error');
          return;
        }

        const importedCards: FormCardItem[] = [];

        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const frontText = String(row[0] || '').trim();
          const backText = String(row[1] || '').trim();

          if (frontText && backText) {
            importedCards.push({
              key: Math.random().toString(),
              frontText,
              backText
            });
          }
        }

        if (importedCards.length === 0) {
          onToast('Không tìm thấy dòng dữ liệu thẻ lật nào hợp lệ trong tệp excel', 'error');
          return;
        }

        setFormCards(prev => {
          const isOnlyBlank = prev.length === 1 && !prev[0].frontText.trim() && !prev[0].backText.trim();
          return isOnlyBlank ? importedCards : [...prev, ...importedCards];
        });
        onToast(`Đã tải nhập thành công ${importedCards.length} thẻ lật vào form. Bạn vui lòng xem lại trước khi lưu!`, 'success');
      } catch (err: any) {
        onToast('Đã xảy ra lỗi khi xử lý tệp excel: ' + (err.message || ''), 'error');
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    const nodeId = formScope.nodeId ? Number(formScope.nodeId) : null;
    const sectionId = formScope.sectionId ? Number(formScope.sectionId) : null;
    const lessonId = formScope.lessonId ? Number(formScope.lessonId) : null;

    if (!nodeId && !sectionId && !lessonId) {
      onToast('Vui lòng chọn ít nhất Bài học, Phần hoặc Nút kiến thức', 'error');
      return;
    }

    if (formCards.length === 0) {
      onToast('Vui lòng thêm ít nhất một thẻ lật', 'error');
      return;
    }

    for (let i = 0; i < formCards.length; i++) {
      const card = formCards[i];
      if (!card.frontText.trim() || !card.backText.trim()) {
        onToast(`Mặt trước và mặt sau ở thẻ #${i + 1} không được để trống`, 'error');
        return;
      }
    }

    try {
      setSaving(true);
      if (editCard) {
        await client.patch(`/api/admin/flashcards/${editCard.id}`, {
          frontText: formCards[0].frontText.trim(),
          backText: formCards[0].backText.trim(),
          lessonId: nodeId ? null : sectionId ? null : lessonId,
          sectionId: nodeId ? null : sectionId,
          nodeId: nodeId,
        });
        onToast('Đã cập nhật thẻ lật', 'success');
      } else {
        for (const card of formCards) {
          const payload: any = {
            frontText: card.frontText.trim(),
            backText: card.backText.trim(),
          };
          if (nodeId) {
            payload.nodeId = nodeId;
          } else if (sectionId) {
            payload.sectionId = sectionId;
          } else if (lessonId) {
            payload.lessonId = lessonId;
          }

          await client.post('/api/admin/flashcards', payload);
        }
        onToast(`Đã tạo thành công ${formCards.length} thẻ lật mới`, 'success');
      }
      setModalOpen(false);
      if (selectedLessonId) fetchFlashcards(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu thẻ lật', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/flashcards/${deleteTarget.id}`);
      onToast('Đã xóa thẻ lật', 'success');
      setDeleteTarget(null);
      if (selectedLessonId) fetchFlashcards(selectedLessonId);
    } catch (err: any) {
      onToast(getDeleteErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // 3. AI Generation Handler
  const handleAIGenerate = async () => {
    if (!aiText.trim()) {
      onToast('Vui lòng nhập đoạn văn bản lịch sử cần tóm tắt', 'error');
      return;
    }

    try {
      setAiGenerating(true);
      const res = await client.post('/api/admin/ai/generate', {
        type: 'flashcards',
        text: aiText.trim()
      });

      const data = res.data;
      if (!data || !Array.isArray(data.flashcards)) {
        throw new Error('Định dạng dữ liệu trả về từ AI không đúng cấu trúc flashcards');
      }

      const generatedCards: FormCardItem[] = data.flashcards.map((f: any) => ({
        key: Math.random().toString(),
        frontText: f.frontText ? String(f.frontText).trim() : '',
        backText: f.backText ? String(f.backText).trim() : '',
        isAiGenerated: true,
      })).filter((f: FormCardItem) => f.frontText && f.backText);

      if (generatedCards.length === 0) {
        throw new Error('AI không tạo được thẻ lật hợp lệ từ đoạn văn bản');
      }

      setFormCards(prev => {
        const isOnlyBlank = prev.length === 1 && !prev[0].frontText.trim() && !prev[0].backText.trim();
        return isOnlyBlank ? generatedCards : [...prev, ...generatedCards];
      });

      setAiModalOpen(false);
      setAiText('');
      onToast(`Đã tự động thêm ${generatedCards.length} thẻ lật từ AI vào form!`, 'success');
    } catch (err: any) {
      console.error(err);
      onToast(err?.response?.data?.error || err.message || 'Lỗi khi sinh thẻ lật từ AI', 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const getDescendantSectionIds = useCallback((startId: number, secList: SectionWithDepth[]): Set<number> => {
    const ids = new Set<number>([startId]);
    let added = true;
    while (added) {
      added = false;
      for (const sec of secList) {
        if (sec.parentSectionId && ids.has(sec.parentSectionId) && !ids.has(sec.id)) {
          ids.add(sec.id);
          added = true;
        }
      }
    }
    return ids;
  }, []);

  const filteredFlashcards = flashcards.filter((card) => {
    if (selectedNodeId) {
      return card.nodeId === selectedNodeId;
    }
    if (selectedSectionId) {
      const descendantSecIds = getDescendantSectionIds(selectedSectionId, sections);
      if (card.sectionId && descendantSecIds.has(card.sectionId)) return true;
      if (card.nodeId) {
        const node = nodes.find((n) => n.id === card.nodeId);
        return node?.sectionId ? descendantSecIds.has(node.sectionId) : false;
      }
      return false;
    }
    return true;
  });

  return (
    <div>
      {/* Cascade Filters */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        boxShadow: '0 2px 8px rgba(15,23,42,0.02)',
      }}>
        <Select
          label="Khối lớp"
          value={selectedGradeId ?? ''}
          onChange={(e) => {
            const gId = e.target.value ? Number(e.target.value) : null;
            handleGradeChange(gId);
          }}
        >
          {grades.map((g) => (
            <option key={g.id} value={g.id}>Khối {g.id}</option>
          ))}
        </Select>

        <Select
          label="Chủ đề"
          value={selectedTopicId ?? ''}
          onChange={(e) => {
            const tId = e.target.value ? Number(e.target.value) : null;
            handleTopicChange(tId);
          }}
          disabled={topics.length === 0}
        >
          {topics.length === 0 && <option value="">Chưa có chủ đề nào</option>}
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>

        <Select
          label="Bài học"
          value={selectedLessonId ?? ''}
          onChange={(e) => {
            const lId = e.target.value ? Number(e.target.value) : null;
            handleLessonChange(lId);
          }}
          disabled={lessons.length === 0}
        >
          {lessons.length === 0 && <option value="">Chưa có bài học nào</option>}
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>

        <Select
          label="Phần/Nhánh"
          value={selectedSectionId ?? ''}
          onChange={(e) => {
            const secId = Number(e.target.value) || null;
            setSelectedSectionId(secId);
            setSelectedNodeId(null);
          }}
          disabled={!selectedLessonId || sections.length === 0}
        >
          <option value="">Tất cả</option>
          {sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              {'\u00A0\u00A0'.repeat(sec.depth)}{sec.depth > 0 ? '↳ ' : ''}{sec.name}
            </option>
          ))}
        </Select>

        <Select
          label="Nút kiến thức"
          value={selectedNodeId ?? ''}
          onChange={(e) => setSelectedNodeId(Number(e.target.value) || null)}
          disabled={!selectedSectionId}
        >
          <option value="">Tất cả</option>
          {nodes
            .filter((n) => n.sectionId === selectedSectionId)
            .map((node) => (
              <option key={node.id} value={node.id}>
                {node.header || node.body.slice(0, 40) + '...'}
              </option>
            ))}
        </Select>
      </div>

      {/* Main Actions & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Thẻ lật (Flashcards)</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            {selectedLessonId ? `Có ${filteredFlashcards.length} thẻ lật trong bài học này` : 'Vui lòng chọn bài học'}
          </p>
        </div>

        {selectedLessonId && (
          <Button icon={<IconPlus size={16} />} onClick={openCreate}>
            Thêm thẻ lật
          </Button>
        )}
      </div>

      {/* Cards Table / Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : !selectedLessonId ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', color: '#64748b' }}>
          Vui lòng chọn Khối lớp, Chủ đề và Bài học để tải danh sách thẻ lật.
        </div>
      ) : filteredFlashcards.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <div style={{ marginBottom: 16 }}><IconFlashcard size={48} color="#cbd5e1" /></div>
          Chưa có thẻ lật nào. Bạn có thể tự thêm hoặc mở form và dùng Trợ lý AI để tự sinh nhanh từ sách giáo khoa!
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {filteredFlashcards.map((card) => (
            <div
              key={card.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 180,
                transition: 'transform 0.2s, box-shadow 0.2s',
                overflow: 'hidden',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.03)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#c37938', background: 'rgba(195, 121, 56, 0.06)', padding: '2px 8px', borderRadius: 20 }}>
                    Thẻ #{card.id}
                  </span>
                  {card.nodeId ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 20 }}>
                      Nút #{card.nodeId}
                    </span>
                  ) : card.sectionId ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0284c7', background: '#f0f9ff', padding: '2px 8px', borderRadius: 20 }}>
                      Nhánh #{card.sectionId}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>
                      Bài học #{card.lessonId}
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: 12, overflow: 'hidden', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  <strong style={{ display: 'block', fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Mặt trước (Q)</strong>
                  <div
                    style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    dangerouslySetInnerHTML={{ __html: card.frontText }}
                  />
                </div>
                <div style={{ borderTop: '1px dashed #f1f5f9', paddingTop: 10, overflow: 'hidden', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  <strong style={{ display: 'block', fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Mặt sau (A)</strong>
                  <div
                    style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    dangerouslySetInnerHTML={{ __html: card.backText }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button
                  onClick={() => openEdit(card)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <IconEdit size={14} /> <span style={{ fontSize: 12 }}>Sửa</span>
                </button>
                <button
                  onClick={() => setDeleteTarget(card)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <IconDelete size={14} /> <span style={{ fontSize: 12 }}>Xóa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual CRUD Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editCard ? `Chỉnh sửa thẻ #${editCard.id}` : 'Thêm thẻ lật mới'}
        width={920}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Scope fields on top */}
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
              Phạm vi thuộc về (Scope)
            </label>

            {(() => {
              const activeScope = formScope.nodeId ? 'node' : formScope.sectionId ? 'section' : formScope.lessonId ? 'lesson' : formScope.topicId ? 'topic' : formScope.gradeId ? 'grade' : null;
              const glowStyle = {
                borderColor: '#059669',
                borderWidth: '2px',
                borderStyle: 'solid',
                boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.3)',
                background: '#ecfdf5',
                fontWeight: 700,
                color: '#065f46',
              };

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <Select
                    label="Khối lớp"
                    value={formScope.gradeId}
                    onChange={(e) => handleFormGradeChange(e.target.value)}
                    style={activeScope === 'grade' ? glowStyle : undefined}
                  >
                    <option value="">-- Chọn Khối --</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>Khối {g.id}</option>
                    ))}
                  </Select>

                  <Select
                    label="Chủ đề"
                    value={formScope.topicId}
                    onChange={(e) => handleFormTopicChange(e.target.value)}
                    disabled={!formScope.gradeId || formTopics.length === 0}
                    style={activeScope === 'topic' ? glowStyle : undefined}
                  >
                    <option value="">-- Chọn Chủ đề --</option>
                    {formTopics.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>

                  <Select
                    label="Bài học"
                    value={formScope.lessonId}
                    onChange={(e) => handleFormLessonChange(e.target.value)}
                    disabled={!formScope.topicId || formLessons.length === 0}
                    style={activeScope === 'lesson' ? glowStyle : undefined}
                  >
                    <option value="">-- Chọn Bài học --</option>
                    {formLessons.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </Select>

                  <Select
                    label="Phần/Nhánh sơ đồ (Tùy chọn)"
                    value={formScope.sectionId}
                    onChange={(e) => handleFormSectionChange(e.target.value)}
                    disabled={!formScope.lessonId || formSections.length === 0}
                    style={activeScope === 'section' ? glowStyle : undefined}
                  >
                    <option value="">-- Thuộc toàn bộ Bài học --</option>
                    {formSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {'\u00A0\u00A0'.repeat(sec.depth)}{sec.depth > 0 ? '↳ ' : ''}{sec.name}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Nút kiến thức cụ thể (Tùy chọn)"
                    value={formScope.nodeId}
                    onChange={(e) => setFormScope(prev => ({ ...prev, nodeId: e.target.value }))}
                    disabled={!formScope.sectionId}
                    style={activeScope === 'node' ? glowStyle : undefined}
                  >
                    <option value="">-- Thuộc toàn bộ Nhánh --</option>
                    {formNodes
                      .filter((n) => n.sectionId === Number(formScope.sectionId))
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.header || node.body.slice(0, 40) + '...'}
                        </option>
                      ))}
                  </Select>
                </div>
              );
            })()}
          </div>

          {/* Quick Import / AI Row (only when creating) */}
          {!editCard && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #f5f3ff, #f0fdf4)',
              borderRadius: 12,
              border: '1px solid #e9d5ff',
              boxShadow: '0 2px 8px rgba(108,99,255,0.05)',
              gap: 12,
              flexWrap: 'wrap'
            }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#5b21b6' }}>Công cụ nhập nhanh</span>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>Sử dụng Trợ lý AI hoặc nhập danh sách thẻ lật từ file Excel.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  variant="secondary"
                  icon={<IconMagicWand size={14} color="#c37938" />}
                  onClick={() => {
                    setAiText('');
                    setAiModalOpen(true);
                  }}
                  style={{
                    padding: '0 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderColor: 'rgba(195, 121, 56, 0.3)',
                    background: '#fff8f3',
                    color: '#c37938',
                    whiteSpace: 'nowrap',
                    height: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  Trợ lý AI
                </Button>
                <Button
                  variant="secondary"
                  icon={<IconDownload size={14} />}
                  onClick={downloadExcelTemplate}
                  style={{
                    padding: '0 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    whiteSpace: 'nowrap',
                    height: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  Tải Excel mẫu
                </Button>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '0 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ffffff',
                  background: '#10b981',
                  borderRadius: 8,
                  cursor: 'pointer',
                  userSelect: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'background 0.2s',
                  height: 36,
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  <IconUpload size={14} />
                  Nhập Excel
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '55vh', overflowY: 'auto', paddingRight: 4 }}>
            {formCards.map((card, idx) => (
              <div
                key={card.key}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 14,
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(!editCard || formCards.length > 1) && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Thẻ #{idx + 1}</span>
                    )}
                    {card.isAiGenerated && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b45309',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        padding: '2px 8px',
                        borderRadius: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <IconMagicWand size={11} color="#b45309" /> AI tạo
                      </span>
                    )}
                  </div>
                  {!editCard && formCards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCardItem(idx)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 6px',
                        borderRadius: 4
                      }}
                    >
                      <IconDelete size={14} /> Xóa thẻ
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, width: '100%', minWidth: 0 }}>
                  <div style={{ minWidth: 0, width: '100%' }}>
                    <RichTextEditor
                      label="Mặt trước (Câu hỏi / Thuật ngữ)"
                      value={card.frontText}
                      onChange={(val) => updateCardField(idx, 'frontText', val)}
                      placeholder="Ví dụ: Chiến dịch Điện Biên Phủ bắt đầu vào ngày nào?"
                    />
                  </div>
                  <div style={{ minWidth: 0, width: '100%' }}>
                    <RichTextEditor
                      label="Mặt sau (Câu trả lời / Định nghĩa)"
                      value={card.backText}
                      onChange={(val) => updateCardField(idx, 'backText', val)}
                      placeholder="Ví dụ: Ngày 13 tháng 3 năm 1954."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Card Button */}
          {!editCard && (
            <Button
              variant="secondary"
              icon={<IconPlus size={14} />}
              onClick={addCardItem}
              style={{
                width: '100%',
                padding: '10px',
                borderStyle: 'dashed',
                borderRadius: 10,
                background: '#f8fafc',
                color: '#c37938',
                borderColor: '#fdba74'
              }}
            >
              Thêm thẻ khác
            </Button>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : (editCard ? 'Lưu thay đổi' : 'Lưu lại')}</Button>
          </div>
        </div>
      </Modal>

      {/* AI Generate Modal */}
      <Modal
        open={aiModalOpen}
        onClose={() => !aiGenerating && setAiModalOpen(false)}
        title="Trợ lý AI tạo thẻ lật tự động"
        width={640}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: '#fffbeb',
            borderRadius: 8,
            border: '1px solid #fef3c7',
            fontSize: 13,
            color: '#b45309',
            fontWeight: 500,
          }}>
            <IconAlert size={16} color="#b45309" style={{ flexShrink: 0 }} />
            <span><strong>Lưu ý: </strong>AI có thể mắc sai sót, vui lòng kiểm tra kỹ thông tin.</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: '#eff6ff',
            borderRadius: 8,
            border: '1px solid #dbeafe',
            fontSize: 13,
            color: '#1d4ed8',
            fontWeight: 500,
          }}>
            <IconInfo size={16} color="#2563eb" style={{ flexShrink: 0 }} />
            <span>Các thẻ được sinh ra sẽ được đưa trực tiếp vào form để bạn rà soát và chỉnh sửa trước khi lưu.</span>
          </div>

          <Textarea
            label="Nội dung/Văn bản lịch sử cần tóm tắt thành thẻ lật"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Dán nội dung sách giáo khoa hoặc đoạn sử liệu vào đây..."
            rows={8}
            disabled={aiGenerating}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <Button variant="secondary" onClick={() => setAiModalOpen(false)} disabled={aiGenerating}>Hủy</Button>
            <Button
              icon={aiGenerating ? <Spinner size={14} /> : <IconMagicWand size={14} color="#ffffff" />}
              onClick={handleAIGenerate}
              disabled={aiGenerating || !aiText.trim()}
            >
              {aiGenerating ? 'Đang trích xuất...' : 'Trích xuất vào form'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xóa thẻ lật"
        message="Bạn có chắc chắn muốn xóa thẻ lật này? Hành động này không thể hoàn tác."
        loading={deleting}
      />
    </div>
  );
}



