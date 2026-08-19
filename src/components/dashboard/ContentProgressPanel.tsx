// src/components/dashboard/ContentProgressPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import client from '../../api/client';

interface ContentProgressResponse {
  kpis: {
    totalRows: number;
    completedRows: number;
    completionRate: number;
    learners: number;
    studiesInPeriod: number;
  };
  studyActivity: { date: string; studies: number; learners: number }[];
  byGrade: { gradeId: number; learners: number; totalRows: number; completedRows: number; completionRate: number }[];
  topLessons: { lessonId: number; lessonName: string; gradeId: number; learners: number; totalRows: number; completedRows: number; completionRate: number }[];
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
  fontSize: 12,
};

interface KpiCard {
  label: string;
  value: string;
  accent: string;
  bg: string;
  border: string;
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 700,
  color: '#475569',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: '#0f172a',
  borderBottom: '1px solid #f1f5f9',
};

function RateBadge({ rate }: { rate: number }) {
  const color = rate >= 60 ? '#16a34a' : rate >= 30 ? '#d97706' : '#dc2626';
  return <span style={{ fontWeight: 700, color }}>{rate}%</span>;
}

export function ContentProgressPanel() {
  const [range, setRange] = useState<7 | 30>(30);
  const [data, setData] = useState<ContentProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    client
      .get<ContentProgressResponse>('/api/admin/stats/content-progress', { params: { days: range } })
      .then((res) => {
        if (!isMounted) return;
        setData(res.data ?? null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || 'Không tải được dữ liệu tiến độ nội dung');
        setData(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [range]);

  const chartData = useMemo(
    () =>
      (data?.studyActivity ?? []).map((r) => {
        const d = new Date(r.date + 'T00:00:00');
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return { ...r, label: `${dd}/${mm}` };
      }),
    [data],
  );

  const cards: KpiCard[] = data
    ? [
        { label: 'Tỉ lệ hoàn thành node', value: `${data.kpis.completionRate}%`, accent: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
        { label: 'Người học từng tương tác', value: data.kpis.learners.toLocaleString('vi-VN'), accent: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
        { label: `Lượt học trong ${range} ngày`, value: data.kpis.studiesInPeriod.toLocaleString('vi-VN'), accent: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
        { label: 'Node đã hoàn thành', value: `${data.kpis.completedRows.toLocaleString('vi-VN')} / ${data.kpis.totalRows.toLocaleString('vi-VN')}`, accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
      ]
    : [];

  return (
    <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Tiến độ học nội dung
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Hoạt động học node (sơ đồ tư duy) theo ngày, theo khối và theo bài học
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
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {cards.map((c) => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: 24 }}>
                <div style={{ fontSize: 12, color: c.accent, fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{c.value}</div>
              </div>
            ))}
          </div>

          <h4 style={{ margin: '20px 0 4px', fontSize: 13, fontWeight: 700, color: '#475569' }}>
            Lượt học node theo ngày
          </h4>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval="preserveStartEnd" minTickGap={20} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="studies" name="Lượt học" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 2, fill: '#ea580c' }} activeDot={{ r: 5 }} isAnimationActive={!loading} />
                <Line type="monotone" dataKey="learners" name="Người học" stroke="#0284c7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={!loading} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h4 style={{ margin: '20px 0 8px', fontSize: 13, fontWeight: 700, color: '#475569' }}>
            Tiến độ theo khối lớp
          </h4>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Khối</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Người học</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Node đang học</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Đã hoàn thành</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Tỉ lệ hoàn thành</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byGrade ?? []).map((g) => (
                  <tr key={g.gradeId}>
                    <td style={tdStyle}><span style={{ color: '#c37938', fontWeight: 600 }}>Khối {g.gradeId}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{g.learners.toLocaleString('vi-VN')}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{g.totalRows.toLocaleString('vi-VN')}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{g.completedRows.toLocaleString('vi-VN')}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}><RateBadge rate={g.completionRate} /></td>
                  </tr>
                ))}
                {(data?.byGrade ?? []).length === 0 && (
                  <tr>
                    <td style={{ ...tdStyle, color: '#94a3b8' }} colSpan={5}>Chưa có dữ liệu tiến độ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h4 style={{ margin: '20px 0 8px', fontSize: 13, fontWeight: 700, color: '#475569' }}>
            Top bài học nhiều người học nhất
          </h4>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Bài học</th>
                  <th style={thStyle}>Khối</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Người học</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Node đang học</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Tỉ lệ hoàn thành</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topLessons ?? []).map((l) => (
                  <tr key={l.lessonId}>
                    <td style={tdStyle}>{l.lessonName}</td>
                    <td style={tdStyle}><span style={{ color: '#c37938', fontWeight: 600 }}>Khối {l.gradeId}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{l.learners.toLocaleString('vi-VN')}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{l.totalRows.toLocaleString('vi-VN')}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}><RateBadge rate={l.completionRate} /></td>
                  </tr>
                ))}
                {(data?.topLessons ?? []).length === 0 && (
                  <tr>
                    <td style={{ ...tdStyle, color: '#94a3b8' }} colSpan={5}>Chưa có dữ liệu tiến độ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
