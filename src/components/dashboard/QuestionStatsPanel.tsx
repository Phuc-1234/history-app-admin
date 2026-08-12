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
import type { QuestionTypeBreakdown, WrongQuestionRow } from '../../types/api';

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
            Top câu dễ sai & tỷ lệ sai theo loại ({range} ngày)
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
            {topWrong.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>
                Chưa có dữ liệu trả lời trong khoảng này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topWrong.map((q, i) => (
                  <div
                    key={q.questionId}
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}
                  >
                    <div style={{ minWidth: 22, height: 22, borderRadius: 6, background: TYPE_COLORS[q.type] || '#64748b', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#0f172a', lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {q.promptText || '(câu hỏi trống)'}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: '#94a3b8', flexWrap: 'wrap' }}>
                        <span>{TYPE_LABELS[q.type] || q.type}</span>
                        <span>Độ khó {q.difficulty}</span>
                        <span>{q.totalAnswers} lượt</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 56 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: q.wrongRate >= 50 ? '#dc2626' : '#d97706' }}>
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
                        <Cell key={i} fill={b.wrongRate >= 50 ? '#dc2626' : b.wrongRate >= 30 ? '#d97706' : '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
