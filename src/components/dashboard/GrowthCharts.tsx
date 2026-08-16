// src/components/dashboard/GrowthCharts.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import client from '../../api/client';
import type { DailyActivityPoint } from '../../types/api';

interface XpActivityRow {
  date: string; // YYYY-MM-DD
  count: number;
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
  fontSize: 12,
};

/**
 * Biến đổi chuỗi { date, count } từ API thành { date, label, count, cumulative }.
 * `cumulative` là running-sum trong khoảng đang xem.
 */
function toSeries(rows: XpActivityRow[]): DailyActivityPoint[] {
  let cumulative = 0;
  return rows.map((r) => {
    cumulative += r.count;
    const d = new Date(r.date + 'T00:00:00');
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return { date: r.date, label: `${dd}/${mm}`, count: r.count, cumulative };
  });
}

export function GrowthCharts() {
  const [range, setRange] = useState<7 | 30>(30);
  const [raw, setRaw] = useState<XpActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    client
      .get<XpActivityRow[]>('/api/admin/stats/xp-activity', { params: { days: range } })
      .then((res) => {
        if (!isMounted) return;
        setRaw(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || 'Không tải được dữ liệu hoạt động');
        setRaw([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [range]);

  const data = useMemo(() => toSeries(raw), [raw]);

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
            Hoạt động người dùng theo ngày
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Số người dùng đạt XP trong ngày
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
        <div style={{ width: '100%', height: 240, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" name="Người đạt XP" stroke="#c37938" strokeWidth={2.5} dot={{ r: 2, fill: '#c37938' }} activeDot={{ r: 5 }} isAnimationActive={!loading} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h4 style={{ margin: '20px 0 4px', fontSize: 13, fontWeight: 700, color: '#475569' }}>
        Lũy kế người dùng hoạt động
      </h4>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a66228" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#a66228" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="cumulative" name="Lũy kế" stroke="#a66228" strokeWidth={2} fill="url(#cumGradient)" isAnimationActive={!loading} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
