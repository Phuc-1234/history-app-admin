// src/components/content/QuestionBatchModal.tsx
import { useState, useEffect } from 'react';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/FormField';
import { RichTextEditor } from '../ui/RichTextEditor';
import { IconPlus, IconDelete, IconChevronDown, IconChevronUp, IconDownload, IconUpload } from '../ui/Icons';
import { stripHtml } from '../../utils/html';
import XLSX from 'xlsx-js-style';

export interface FormAnswer {
  content: string;
  isCorrect: boolean;
  leftText: string;
  rightText: string;
}

export interface FormQuestionItem {
  key: string;
  id?: number;
  type: 'CHOOSE' | 'FILL' | 'MATCH';
  difficulty: string;
  isActive: boolean;
  promptText: string;
  document: string;
  explanation: string;
  answers: FormAnswer[];
  isCollapsed?: boolean;
}

export const EMPTY_ANSWER: FormAnswer = { content: '', isCorrect: false, leftText: '', rightText: '' };

export const createEmptyQuestionItem = (): FormQuestionItem => ({
  key: Math.random().toString(),
  type: 'CHOOSE',
  difficulty: '1',
  isActive: true,
  promptText: '',
  document: '',
  explanation: '',
  answers: [{ ...EMPTY_ANSWER }, { ...EMPTY_ANSWER }],
  isCollapsed: false,
});

interface QuestionBatchModalProps {
  open: boolean;
  title?: string;
  initialQuestions: FormQuestionItem[];
  onClose: () => void;
  onSave: (questions: FormQuestionItem[]) => void;
  onToast: (msg: string, type: ToastType) => void;
}

export function QuestionBatchModal({
  open,
  title = 'Soạn câu hỏi mới',
  initialQuestions,
  onClose,
  onSave,
  onToast,
}: QuestionBatchModalProps) {
  const [formQuestions, setFormQuestions] = useState<FormQuestionItem[]>([]);

  useEffect(() => {
    if (open) {
      if (initialQuestions && initialQuestions.length > 0) {
        setFormQuestions(JSON.parse(JSON.stringify(initialQuestions)));
      } else {
        setFormQuestions([createEmptyQuestionItem()]);
      }
    }
  }, [open, initialQuestions]);

  const addQuestionItem = () => {
    setFormQuestions(prev => [
      ...prev,
      createEmptyQuestionItem()
    ]);
  };

  const removeQuestionItem = (idx: number) => {
    setFormQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestionField = <K extends keyof FormQuestionItem>(idx: number, field: K, val: FormQuestionItem[K]) => {
    setFormQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  };

  const addAnswerField = (qIdx: number) => {
    setFormQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, answers: [...q.answers, { ...EMPTY_ANSWER }] } : q));
  };

  const removeAnswerField = (qIdx: number, ansIdx: number) => {
    setFormQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const minAnswers = (q.type === 'CHOOSE' || q.type === 'MATCH') ? 2 : 1;
      if (q.answers.length <= minAnswers) return q;
      return { ...q, answers: q.answers.filter((_, aIdx) => aIdx !== ansIdx) };
    }));
  };

  const updateAnswerField = (qIdx: number, ansIdx: number, field: keyof FormAnswer, val: any) => {
    setFormQuestions(prev => prev.map((q, i) => i === qIdx ? {
      ...q,
      answers: q.answers.map((ans, aIdx) => aIdx === ansIdx ? { ...ans, [field]: val } : ans)
    } : q));
  };

  const downloadExcelTemplate = () => {
    const headers = [
      'Loại câu hỏi (CHOOSE / FILL / MATCH)',
      'Độ khó (1 - 4)',
      'Kích hoạt (TRUE / FALSE)',
      'Nội dung câu hỏi',
      'Tài liệu đi kèm (Tùy chọn)',
      'Giải thích đáp án (Tùy chọn)',
      'Lựa chọn 1 / Vế trái 1',
      'Lựa chọn 2 / Vế trái 2',
      'Lựa chọn 3 / Vế trái 3',
      'Lựa chọn 4 / Vế trái 4',
      'Lựa chọn 5 / Vế trái 5',
      'Vế phải 1 (Nối cặp)',
      'Vế phải 2 (Nối cặp)',
      'Vế phải 3 (Nối cặp)',
      'Vế phải 4 (Nối cặp)',
      'Vế phải 5 (Nối cặp)',
      'Đáp án đúng'
    ];

    const instructions = [
      'CHOOSE, FILL, hoặc MATCH',
      '1 (Nhận biết) đến 4 (Vận dụng cao)',
      'TRUE hoặc FALSE (mặc định TRUE)',
      'Nội dung câu hỏi (chấp nhận thẻ HTML cơ bản)',
      'Đoạn trích/Tài liệu bổ trợ (nếu có)',
      'Giải thích lý do chọn đáp án đúng',
      'Trắc nghiệm: Đáp án A | Nối cặp: Vế trái 1',
      'Trắc nghiệm: Đáp án B | Nối cặp: Vế trái 2',
      'Trắc nghiệm: Đáp án C | Nối cặp: Vế trái 3',
      'Trắc nghiệm: Đáp án D | Nối cặp: Vế trái 4',
      'Trắc nghiệm: Đáp án E | Nối cặp: Vế trái 5',
      'Nối cặp: Vế phải tương ứng vế trái 1',
      'Nối cặp: Vế phải tương ứng vế trái 2',
      'Nối cặp: Vế phải tương ứng vế trái 3',
      'Nối cặp: Vế phải tương ứng vế trái 4',
      'Nối cặp: Vế phải tương ứng vế trái 5',
      'Trắc nghiệm: Điền số thứ tự của đáp án đúng (VD: 1 hoặc 1,3) hoặc chữ cái tương ứng (VD: A hoặc A,C). Điền khuyết: điền các đáp án được chấp nhận cách nhau bởi dấu chấm phẩy (VD: Bạch Đằng; Sông Bạch Đằng)'
    ];

    const sample1 = [
      'CHOOSE', 1, 'TRUE',
      'Ai là người lãnh đạo cuộc khởi nghĩa Lam Sơn?',
      '',
      'Lê Lợi xưng Bình Định Vương, lãnh đạo cuộc khởi nghĩa Lam Sơn thắng lợi.',
      'Lê Lợi', 'Nguyễn Huệ', 'Trần Hưng Đạo', 'Quang Trung', '', '', '', '', '', '', '1'
    ];

    const sample2 = [
      'FILL', 2, 'TRUE',
      'Chiến thắng trên sông ... năm 938 đã chấm dứt hơn 1000 năm Bắc thuộc.',
      '',
      'Ngô Quyền đánh tan quân Nam Hán trên sông Bạch Đằng năm 938.',
      'Bạch Đằng; Sông Bạch Đằng; song Bach Dang', '', '', '', '', '', '', '', '', '', 'Bạch Đằng; Sông Bạch Đằng; song Bach Dang'
    ];

    const sample3 = [
      'MATCH', 2, 'TRUE',
      'Hãy nối tên các cuộc khởi nghĩa với năm nổ ra tương ứng:',
      '',
      'Các mốc thời gian tiêu biểu trong lịch sử phong kiến.',
      'Khởi nghĩa Hai Bà Trưng', 'Khởi nghĩa Bà Triệu', 'Khởi nghĩa Lý Bí', 'Chiến thắng Bạch Đằng', '',
      'Năm 40', 'Năm 248', 'Năm 542', 'Năm 938', '', '1-1; 2-2; 3-3; 4-4'
    ];

    const data = [headers, instructions, sample1, sample2, sample3];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    worksheet['!cols'] = [
      { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 45 }, { wch: 30 }, { wch: 35 },
      { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
      { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
      { wch: 35 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Câu Hỏi');
    XLSX.writeFile(workbook, 'Mau_Import_Cau_Hoi.xlsx');
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
          onToast('Tệp excel không chứa dữ liệu câu hỏi hợp lệ', 'error');
          return;
        }

        const newQuestions: FormQuestionItem[] = [];

        for (let r = 2; r < rows.length; r++) {
          const row = rows[r];
          if (!row || !row[0] || !row[3]) continue;

          const rawType = String(row[0]).trim().toUpperCase();
          let type: 'CHOOSE' | 'FILL' | 'MATCH' = 'CHOOSE';
          if (rawType.includes('FILL')) type = 'FILL';
          else if (rawType.includes('MATCH')) type = 'MATCH';

          const diffVal = Number(row[1]);
          const difficulty = (!isNaN(diffVal) && diffVal >= 1 && diffVal <= 4) ? String(diffVal) : '1';
          const isActive = row[2] !== undefined ? String(row[2]).trim().toUpperCase() !== 'FALSE' : true;
          const promptText = String(row[3]).trim();
          const document = row[4] ? String(row[4]).trim() : '';
          const explanation = row[5] ? String(row[5]).trim() : '';

          const answers: FormAnswer[] = [];
          if (type === 'CHOOSE') {
            const rawCorrect = row[16] ? String(row[16]).trim().toUpperCase() : '';
            const correctIndices = new Set<number>();

            rawCorrect.split(/[,;\s]+/).forEach(part => {
              const num = parseInt(part, 10);
              if (!isNaN(num) && num >= 1) {
                correctIndices.add(num - 1);
              } else if (part.length === 1 && part >= 'A' && part <= 'Z') {
                correctIndices.add(part.charCodeAt(0) - 65);
              }
            });

            for (let c = 6; c <= 10; c++) {
              const opt = row[c] !== undefined ? String(row[c]).trim() : '';
              if (opt) {
                const optIdx = c - 6;
                answers.push({
                  content: opt,
                  isCorrect: correctIndices.has(optIdx),
                  leftText: '',
                  rightText: ''
                });
              }
            }

            if (answers.length > 0 && !answers.some(a => a.isCorrect)) {
              answers[0].isCorrect = true;
            }
          } else if (type === 'FILL') {
            const fillText = row[6] ? String(row[6]).trim() : (row[16] ? String(row[16]).trim() : '');
            if (fillText) {
              fillText.split(';').forEach(ans => {
                const trimmed = ans.trim();
                if (trimmed) {
                  answers.push({
                    content: trimmed,
                    isCorrect: true,
                    leftText: '',
                    rightText: ''
                  });
                }
              });
            }
          } else if (type === 'MATCH') {
            for (let p = 0; p < 5; p++) {
              const left = row[6 + p] ? String(row[6 + p]).trim() : '';
              const right = row[11 + p] ? String(row[11 + p]).trim() : '';
              if (left && right) {
                answers.push({
                  content: '',
                  isCorrect: true,
                  leftText: left,
                  rightText: right
                });
              }
            }
          }

          if (answers.length === 0) {
            answers.push({ ...EMPTY_ANSWER });
          }

          newQuestions.push({
            key: Math.random().toString(),
            type,
            difficulty,
            isActive,
            promptText,
            document,
            explanation,
            answers,
            isCollapsed: true
          });
        }

        if (newQuestions.length === 0) {
          onToast('Không tìm thấy dòng dữ liệu câu hỏi nào hợp lệ trong tệp excel', 'error');
          return;
        }

        setFormQuestions(newQuestions);
        onToast(`Đã tải nhập thành công ${newQuestions.length} câu hỏi vào danh sách!`, 'success');
      } catch (err: any) {
        onToast('Đã xảy ra lỗi khi xử lý tệp excel: ' + (err.message || ''), 'error');
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleValidateAndSubmit = () => {
    if (!formQuestions.length) {
      onToast('Danh sách câu hỏi không được để trống', 'error');
      return;
    }

    for (let index = 0; index < formQuestions.length; index++) {
      const qItem = formQuestions[index];
      const diff = Number(qItem.difficulty);
      const promptTrimmed = qItem.promptText.trim();

      if (!promptTrimmed) {
        onToast(`Nội dung câu hỏi số ${index + 1} không được để trống`, 'error');
        return;
      }
      if (isNaN(diff) || !qItem.answers.length) {
        onToast(`Vui lòng điền đầy đủ thông tin hợp lệ ở câu hỏi số ${index + 1}`, 'error');
        return;
      }

      if (qItem.type === 'CHOOSE') {
        const validOptions = qItem.answers.map(a => a.content.trim());
        if (validOptions.some(opt => !opt)) {
          onToast(`Câu hỏi số ${index + 1}: Vui lòng điền nội dung cho tất cả các lựa chọn`, 'error');
          return;
        }
        if (validOptions.length < 2) {
          onToast(`Câu hỏi số ${index + 1}: Loại câu hỏi Trắc nghiệm (CHOOSE) phải có ít nhất 2 lựa chọn`, 'error');
          return;
        }
        const correctOption = qItem.answers.some(a => a.isCorrect);

        if (!correctOption) {
          onToast(`Câu hỏi số ${index + 1}: Vui lòng chọn ít nhất một lựa chọn đúng`, 'error');
          return;
        }
      } else if (qItem.type === 'FILL') {
        const acceptedAnswers = qItem.answers.map(a => a.content.trim()).filter(Boolean);
        if (acceptedAnswers.length === 0) {
          onToast(`Câu hỏi số ${index + 1}: Vui lòng điền các đáp án được chấp nhận`, 'error');
          return;
        }
      } else if (qItem.type === 'MATCH') {
        const validPairs = qItem.answers.map(a => ({ left: a.leftText.trim(), right: a.rightText.trim() }));
        if (validPairs.some(p => !p.left || !p.right)) {
          onToast(`Câu hỏi số ${index + 1}: Vui lòng điền đầy đủ cả hai vế cho tất cả các cặp nối`, 'error');
          return;
        }
        if (validPairs.length < 2) {
          onToast(`Câu hỏi số ${index + 1}: Loại câu hỏi Nối cặp (MATCH) phải có ít nhất 2 cặp nối`, 'error');
          return;
        }
      }
    }

    onSave(formQuestions);
    onClose();
  };

  return (
    <Modal open={open} title={title} onClose={onClose} width={850}>
      {/* Bulk Excel import row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        background: 'linear-gradient(135deg, #f5f3ff, #f0fdf4)',
        borderRadius: 12,
        border: '1px solid #e9d5ff',
        marginBottom: 16,
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#5b21b6' }}>Nhập câu hỏi nhanh từ Excel</span>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>Tải file mẫu, điền câu hỏi và tải lên để tự động điền.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            variant="secondary"
            icon={<IconDownload size={14} />}
            onClick={downloadExcelTemplate}
            style={{ padding: '6px 12px', fontSize: 12, background: '#ffffff', border: '1px solid #cbd5e1' }}
          >
            Tải mẫu Excel
          </Button>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: '#ffffff',
            background: '#10b981',
            borderRadius: 8,
            cursor: 'pointer',
            userSelect: 'none',
            height: 34,
            boxSizing: 'border-box'
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

      {/* Expand / Collapse all actions */}
      {formQuestions.length > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button
            variant="ghost"
            onClick={() => setFormQuestions(prev => prev.map(q => ({ ...q, isCollapsed: true })))}
            style={{ fontSize: 12, padding: '4px 8px', color: '#64748b' }}
          >
            Thu gọn tất cả
          </Button>
          <Button
            variant="ghost"
            onClick={() => setFormQuestions(prev => prev.map(q => ({ ...q, isCollapsed: false })))}
            style={{ fontSize: 12, padding: '4px 8px', color: '#64748b' }}
          >
            Mở rộng tất cả
          </Button>
        </div>
      )}

      {/* Questions list */}
      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
        {formQuestions.map((qItem, qIdx) => (
          <div
            key={qItem.key}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: qItem.isCollapsed ? '10px 18px' : '16px 20px',
              marginBottom: 16,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: qItem.isCollapsed ? 0 : 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', marginRight: 16 }}>
                <button
                  type="button"
                  onClick={() => updateQuestionField(qIdx, 'isCollapsed', !qItem.isCollapsed)}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#64748b',
                    borderRadius: 4,
                  }}
                  title={qItem.isCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                  {qItem.isCollapsed ? <IconChevronDown size={18} /> : <IconChevronUp size={18} />}
                </button>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                  Câu hỏi #{qIdx + 1}
                </h4>
                {qItem.isCollapsed && qItem.promptText && (
                  <span style={{
                    fontSize: 12.5,
                    color: '#64748b',
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginLeft: 8
                  }}>
                    — {stripHtml(qItem.promptText).substring(0, 50)}{stripHtml(qItem.promptText).length > 50 ? '...' : ''}
                  </span>
                )}
              </div>
              {formQuestions.length > 1 && (
                <Button
                  variant="danger"
                  onClick={() => removeQuestionItem(qIdx)}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  Xóa câu này
                </Button>
              )}
            </div>

            {!qItem.isCollapsed && (
              <>
                <div style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 2, minWidth: 200 }}>
                    <Select
                      label="Loại câu hỏi"
                      value={qItem.type}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        updateQuestionField(qIdx, 'type', newType);
                        const initialCount = (newType === 'CHOOSE' || newType === 'MATCH') ? 2 : 1;
                        setFormQuestions(prev => prev.map((q, i) => i === qIdx ? {
                          ...q,
                          answers: Array.from({ length: initialCount }, () => ({ ...EMPTY_ANSWER }))
                        } : q));
                      }}
                    >
                      <option value="CHOOSE">CHOOSE — Trắc nghiệm nhiều lựa chọn</option>
                      <option value="FILL">FILL — Điền vào chỗ trống</option>
                      <option value="MATCH">MATCH — Nối cặp tương ứng</option>
                    </Select>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <Select
                      label="Độ khó"
                      value={qItem.difficulty}
                      onChange={(e) => updateQuestionField(qIdx, 'difficulty', e.target.value)}
                    >
                      <option value="1">Mức độ 1 (Nhận biết)</option>
                      <option value="2">Mức độ 2 (Thông hiểu)</option>
                      <option value="3">Mức độ 3 (Vận dụng)</option>
                      <option value="4">Mức độ 4 (Vận dụng cao)</option>
                    </Select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={qItem.isActive}
                        onChange={(e) => updateQuestionField(qIdx, 'isActive', e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600, color: '#334155' }}>Kích hoạt</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <RichTextEditor
                    label="Nội dung câu hỏi"
                    value={qItem.promptText}
                    onChange={(val) => updateQuestionField(qIdx, 'promptText', val)}
                    placeholder="Nhập câu hỏi lịch sử..."
                  />
                </div>

                {/* Answer list section inside card */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#475569' }}>Danh sách đáp án</span>
                    <Button variant="secondary" icon={<IconPlus size={12} />} onClick={() => addAnswerField(qIdx)} style={{ padding: '3px 8px', fontSize: 11 }}>
                      Thêm đáp án
                    </Button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto', paddingRight: 4 }}>
                    {qItem.answers.map((ans, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {qItem.type === 'CHOOSE' && (
                          <>
                            <input
                              type="checkbox"
                              checked={ans.isCorrect}
                              onChange={(e) => updateAnswerField(qIdx, idx, 'isCorrect', e.target.checked)}
                              style={{ width: 16, height: 16, cursor: 'pointer' }}
                              title="Đánh dấu đáp án đúng"
                            />
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Nội dung đáp án lựa chọn..."
                                value={ans.content}
                                onChange={(e) => updateAnswerField(qIdx, idx, 'content', e.target.value)}
                                style={INPUT_STYLE}
                              />
                            </div>
                            {qItem.answers.length > 2 && (
                              <button onClick={() => removeAnswerField(qIdx, idx)} style={DEL_BTN_STYLE}>
                                <IconDelete size={15} />
                              </button>
                            )}
                          </>
                        )}

                        {qItem.type === 'FILL' && (
                          <>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Đáp án điền khuyết được chấp nhận (ví dụ: 'Bạch Đằng')..."
                                value={ans.content}
                                onChange={(e) => updateAnswerField(qIdx, idx, 'content', e.target.value)}
                                style={INPUT_STYLE}
                              />
                            </div>
                            {qItem.answers.length > 1 && (
                              <button onClick={() => removeAnswerField(qIdx, idx)} style={DEL_BTN_STYLE}>
                                <IconDelete size={15} />
                              </button>
                            )}
                          </>
                        )}

                        {qItem.type === 'MATCH' && (
                          <>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Vế bên trái (ví dụ: 'Lê Lợi')..."
                                value={ans.leftText}
                                onChange={(e) => updateAnswerField(qIdx, idx, 'leftText', e.target.value)}
                                style={INPUT_STYLE}
                              />
                            </div>
                            <span style={{ color: '#94a3b8' }}>➔</span>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Vế bên phải nối tương ứng (ví dụ: '1428')..."
                                value={ans.rightText}
                                onChange={(e) => updateAnswerField(qIdx, idx, 'rightText', e.target.value)}
                                style={INPUT_STYLE}
                              />
                            </div>
                            {qItem.answers.length > 2 && (
                              <button onClick={() => removeAnswerField(qIdx, idx)} style={DEL_BTN_STYLE}>
                                <IconDelete size={15} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  <RichTextEditor
                    label="Tài liệu/Đoạn trích đi kèm (Tùy chọn)"
                    value={qItem.document}
                    onChange={(val) => updateQuestionField(qIdx, 'document', val)}
                    placeholder="Nhập đoạn văn trích dẫn lịch sử..."
                  />
                  <RichTextEditor
                    label="Giải thích đáp án (Tùy chọn)"
                    value={qItem.explanation}
                    onChange={(val) => updateQuestionField(qIdx, 'explanation', val)}
                    placeholder="Giải thích vì sao đáp án này chính xác..."
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add Another Question Button */}
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <Button
          variant="secondary"
          icon={<IconPlus size={14} />}
          onClick={addQuestionItem}
          style={{ width: '100%', padding: '10px', borderStyle: 'dashed', borderRadius: 8, background: '#f8fafc', color: '#6366f1' }}
        >
          Thêm câu hỏi khác vào danh sách
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
        <Button variant="ghost" onClick={onClose}>Hủy</Button>
        <Button onClick={handleValidateAndSubmit}>Lưu vào đề thi ({formQuestions.length} câu)</Button>
      </div>
    </Modal>
  );
}

const INPUT_STYLE = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  outline: 'none',
  fontSize: 13,
  boxSizing: 'border-box' as const,
};

const DEL_BTN_STYLE = {
  background: 'none',
  border: 'none',
  color: '#ef4444',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  borderRadius: 4,
};
