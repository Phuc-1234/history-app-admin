// src/components/dashboard/TestActivityCharts.tsx
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import client from '../../api/client';
import type { TestActivityPoint } from '../../types/api';

interface RawRow {
  date: string;
  totalAttempts: number;
  distinctUsers: number;
  manualAttempts: number;
  autoAttempts: number;
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
  fontSize: 12,
};

function toPoint(r: RawRow): TestActivityPoint {
  const d = new Date(r.date + 'T00:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return { ...r, label: `${dd}/${mm}` };
}

export function TestActivityCharts() {
  const [range, setRange] = useState<7 | 30>(30);
  const [data, setData] = useState<TestActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    client
      .get<RawRow[]>('/api/admin/stats/test-activity', { params: { days: range } })
      .then((res) => {
        if (!mounted) return;
        setData((Array.isArray(res.data) ? res.data : []).map(toPoint));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Không tải được dữ liệu làm bài');
        setData([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [range]);

  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Hoạt động làm bài theo ngày
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Số lượt nộp bài theo ngày (đề thủ công vs tự động)
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
        <div style={{ marginTop: 16, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      ) : (
        <div style={{ width: '100%', height: 280, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="totalAttempts" name="Tổng lượt" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} isAnimationActive={!loading} />
              <Line type="monotone" dataKey="manualAttempts" name="Đề thủ công" stroke="#16a34a" strokeWidth={2} dot={false} isAnimationActive={!loading} />
              <Line type="monotone" dataKey="autoAttempts" name="Đề tự động" stroke="#ea580c" strokeWidth={2} dot={false} isAnimationActive={!loading} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
