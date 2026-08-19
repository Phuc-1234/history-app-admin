// src/components/dashboard/UserGrowthPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import client from '../../api/client';

interface UserGrowthResponse {
  series: { date: string; newUsers: number; cumulative: number }[];
  kpis: {
    newInPeriod: number;
    avgPerDay: number;
    bestDay: { date: string; count: number } | null;
    totalActivated: number;
  };
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

export function UserGrowthPanel() {
  const [range, setRange] = useState<7 | 30>(30);
  const [data, setData] = useState<UserGrowthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    client
      .get<UserGrowthResponse>('/api/admin/stats/user-growth', { params: { days: range } })
      .then((res) => {
        if (!isMounted) return;
        setData(res.data ?? null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || 'Không tải được dữ liệu tăng trưởng người dùng');
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
      (data?.series ?? []).map((r) => {
        const d = new Date(r.date + 'T00:00:00');
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return { ...r, label: `${dd}/${mm}` };
      }),
    [data],
  );

  const cards: KpiCard[] = data
    ? [
        { label: `Người dùng mới trong ${range} ngày`, value: data.kpis.newInPeriod.toLocaleString('vi-VN'), accent: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
        { label: 'Trung bình mỗi ngày', value: data.kpis.avgPerDay.toLocaleString('vi-VN'), accent: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
        { label: 'Tổng đã từng hoạt động', value: data.kpis.totalActivated.toLocaleString('vi-VN'), accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
      ]
    : [];

  return (
    <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Tăng trưởng người dùng
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Người dùng mới kích hoạt (nhận XP lần đầu) theo ngày
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

          <div style={{ width: '100%', height: 260, marginTop: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval="preserveStartEnd" minTickGap={20} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar yAxisId="left" dataKey="newUsers" name="Người dùng mới" fill="#c37938" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={!loading} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Lũy kế đã hoạt động" stroke="#4f46e5" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={!loading} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
