// src/components/dashboard/QuestionStatsPanel.tsx
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import client from '../../api/client';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { stripHtml } from '../../utils/html';
import type {
  AdminQuestionDto,
  QuestionTypeBreakdown,
  WrongQuestionRow,
} from '../../types/api';

interface RawResponse {
  topWrong: WrongQuestionRow[];
  typeBreakdown: QuestionTypeBreakdown[];
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
  fontSize: 12,
};

const TYPE_COLORS: Record<string, string> = {
  CHOOSE: '#6c63ff',
  FILL: '#16a34a',
  MATCH: '#ea580c',
};
const TYPE_LABELS: Record<string, string> = {
  CHOOSE: 'Trắc nghiệm',
  FILL: 'Điền khuyết',
  MATCH: 'Nối',
};

export function QuestionStatsPanel() {
  const [range, setRange] = useState<7 | 30>(30);
  const [topWrong, setTopWrong] = useState<WrongQuestionRow[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<QuestionTypeBreakdown[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal chi tiết
  const [selected, setSelected] = useState<WrongQuestionRow | null>(null);
  const [detail, setDetail] = useState<AdminQuestionDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setError(null);

    client
      .get<RawResponse>('/api/admin/stats/question-stats', { params: { days: range, limit: 10 } })
      .then((res) => {
        if (!mounted) return;
        setTopWrong(Array.isArray(res.data?.topWrong) ? res.data.topWrong : []);
        setTypeBreakdown(Array.isArray(res.data?.typeBreakdown) ? res.data.typeBreakdown : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Không tải được thống kê câu hỏi');
        setTopWrong([]);
        setTypeBreakdown([]);
      });

    return () => {
      mounted = false;
    };
  }, [range]);

  // Sort theo % sai giảm dần (client-side để đảm bảo thứ tự)
  const sortedTopWrong = [...topWrong].sort((a, b) => b.wrongRate - a.wrongRate);

  const openDetail = (q: WrongQuestionRow) => {
    setSelected(q);
    setDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    client
      .get<AdminQuestionDto>(`/api/admin/questions/${q.questionId}`)
      .then((res) => {
        setDetail(res.data || null);
      })
      .catch((err) => {
        setDetailError(err?.message || 'Không tải được chi tiết câu hỏi');
      })
      .finally(() => setLoadingDetail(false));
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
    setDetailError(null);
    setLoadingDetail(false);
  };

  const typeBars = typeBreakdown.map((t) => ({
    label: TYPE_LABELS[t.type] || t.type,
    wrongRate: t.wrongRate,
    total: t.total,
    wrong: t.wrongCount,
  }));

  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Thống kê câu hỏi
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Top câu dễ sai &amp; tỷ lệ sai theo loại ({range} ngày) — bấm vào câu để xem chi tiết
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                background: range === r ? '#ffffff' : 'transparent',
                color: range === r ? '#4f46e5' : '#64748b',
                boxShadow: range === r ? '0 1px 3px rgba(15,23,42,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {r} ngày
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Top câu dễ sai — bảng */}
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#475569' }}>Top 10 câu dễ sai</h4>
            {sortedTopWrong.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>
                Chưa có dữ liệu trả lời trong khoảng này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedTopWrong.map((q, i) => (
                  <div
                    key={q.questionId}
                    onClick={() => openDetail(q)}
                    title="Bấm để xem chi tiết"
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#eef2ff';
                      e.currentTarget.style.borderColor = '#c7d2fe';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(79,70,229,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#f1f5f9';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ minWidth: 22, height: 22, borderRadius: 6, background: TYPE_COLORS[q.type] || '#64748b', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* FIX 1: render HTML thay vì plain text */}
                      <div
                        dangerouslySetInnerHTML={{ __html: q.promptText || '<em>(câu hỏi trống)</em>' }}
                        style={{ fontSize: 12, color: '#0f172a', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden' }}
                      />
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: '#94a3b8', flexWrap: 'wrap' }}>
                        <span>{TYPE_LABELS[q.type] || q.type}</span>
                        <span>Độ khó {q.difficulty}</span>
                        <span>{q.totalAnswers} lượt</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 56 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: q.wrongRate >= 50 ? '#f43f5e' : '#d97706' }}>
                        {q.wrongRate}%
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>sai</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tỷ lệ sai theo loại câu — bar chart */}
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#475569' }}>Tỷ lệ sai theo loại câu</h4>
            {typeBars.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: '40px 0', textAlign: 'center' }}>
                Chưa có dữ liệu.
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeBars} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(value: any, _name: any, item: any) => {
                        const p = item?.payload;
                        return [`${value}% sai (${p?.wrong ?? 0}/${p?.total ?? 0})`, 'Tỷ lệ sai'];
                      }}
                    />
                    <Bar dataKey="wrongRate" name="Tỷ lệ sai" radius={[6, 6, 0, 0]}>
                      {typeBars.map((b, i) => (
                        <Cell key={i} fill={b.wrongRate >= 50 ? '#f43f5e' : b.wrongRate >= 30 ? '#d97706' : '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FIX 2: Modal xem chi tiết câu hỏi */}
      <Modal
        open={selected !== null}
        title={selected ? `Câu hỏi #${selected.questionId}` : 'Chi tiết câu hỏi'}
        onClose={closeDetail}
        width={720}
        closeOnOverlayClick
        closeOnEscape
      >
        {loadingDetail ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spinner />
          </div>
        ) : detailError ? (
          <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
            {detailError}
          </div>
        ) : detail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats tóm tắt từ topWrong */}
            {selected && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <StatChip label="Tỷ lệ sai" value={`${selected.wrongRate}%`} color={selected.wrongRate >= 50 ? '#f43f5e' : '#d97706'} />
                <StatChip label="Số lượt trả lời" value={String(selected.totalAnswers)} color="#4f46e5" />
                <StatChip label="Số lần sai" value={String(selected.wrongCount)} color="#f43f5e" />
                <StatChip label="Loại" value={TYPE_LABELS[selected.type] || selected.type} color={TYPE_COLORS[selected.type] || '#64748b'} />
                <StatChip label="Độ khó" value={`${selected.difficulty}/4`} color="#eab308" />
              </div>
            )}

            {/* Nội dung câu hỏi (HTML) */}
            <div>
              <SectionLabel>Nội dung câu hỏi</SectionLabel>
              <div
                dangerouslySetInnerHTML={{ __html: detail.promptText || '<em>(câu hỏi trống)</em>' }}
                style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.6, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}
              />
            </div>

            {/* Trích dẫn / Document */}
            {detail.document && (
              <div>
                <SectionLabel>Trích dẫn</SectionLabel>
                <div
                  dangerouslySetInnerHTML={{ __html: detail.document }}
                  style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, padding: 12, background: '#fffbeb', borderRadius: 10, border: '1px solid #fef3c7', fontStyle: 'italic', maxHeight: 200, overflowY: 'auto' }}
                />
              </div>
            )}

            {/* Lời giải thích */}
            {detail.explanation && (
              <div>
                <SectionLabel>Lời giải</SectionLabel>
                <div
                  dangerouslySetInnerHTML={{ __html: detail.explanation }}
                  style={{ fontSize: 13, color: '#075985', lineHeight: 1.6, padding: 12, background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}
                />
              </div>
            )}

            {/* Đáp án */}
            {Array.isArray(detail.answers) && detail.answers.length > 0 && (
              <div>
                <SectionLabel>Đáp án</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detail.answers.map((a, idx) => {
                    const isCorrect = a.isCorrect === true;
                    const text = a.content || a.correctAnswer || a.leftText || a.rightText || '';
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: isCorrect ? '#ecfdf5' : '#f8fafc',
                          border: `1px solid ${isCorrect ? '#a7f3d0' : '#e2e8f0'}`,
                          fontSize: 13,
                          color: '#0f172a',
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {a.leftText && a.rightText ? (
                            <><strong>{stripHtml(a.leftText)}</strong> ↔ {stripHtml(a.rightText)}</>
                          ) : (
                            <span dangerouslySetInnerHTML={{ __html: text }} />
                          )}
                        </span>
                        {isCorrect && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', flexShrink: 0 }}>
                            ✓ ĐÚNG
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '6px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 70 }}>
      <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>{children}</div>;
}
