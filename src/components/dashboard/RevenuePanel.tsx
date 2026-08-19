// src/components/dashboard/RevenuePanel.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import client from '../../api/client';

interface RevenueResponse {
  series: { date: string; goldRevenue: number; goldCount: number; subRevenue: number; subCount: number }[];
  kpis: {
    goldRevenueInPeriod: number;
    goldCountInPeriod: number;
    subRevenueInPeriod: number;
    subCountInPeriod: number;
    goldRevenueAllTime: number;
    subRevenueAllTime: number;
    activeSubscriptions: number;
    autoRenewCount: number;
    pendingPayments: number;
  };
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
  fontSize: 12,
};

const fmtVnd = (v: number) => `${v.toLocaleString('vi-VN')} ₫`;

/** Định dạng gọn cho trục Y: 1,2 tr / 450k / 1,5 tỷ. */
const fmtVndCompact = (v: number): string => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace('.', ',')} tỷ`;
  if (v >= 1_000_000) return `${(Math.round(v / 100_000) / 10).toFixed(1).replace('.', ',')} tr`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
};

interface KpiCard {
  label: string;
  value: string;
  accent: string;
  bg: string;
  border: string;
}

export function RevenuePanel() {
  const [range, setRange] = useState<7 | 30>(30);
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    client
      .get<RevenueResponse>('/api/admin/stats/revenue', { params: { days: range } })
      .then((res) => {
        if (!isMounted) return;
        setData(res.data ?? null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || 'Không tải được dữ liệu doanh thu');
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
        { label: `Doanh thu Gold (${range} ngày)`, value: fmtVnd(data.kpis.goldRevenueInPeriod), accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
        { label: `Doanh thu Pro (${range} ngày)`, value: fmtVnd(data.kpis.subRevenueInPeriod), accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
        { label: 'Tổng đã thu (toàn bộ)', value: fmtVnd(data.kpis.goldRevenueAllTime + data.kpis.subRevenueAllTime), accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
        { label: 'Gói Pro đang active', value: `${data.kpis.activeSubscriptions.toLocaleString('vi-VN')} (${data.kpis.autoRenewCount} auto-renew)`, accent: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
        { label: 'Giao dịch chờ xử lý', value: data.kpis.pendingPayments.toLocaleString('vi-VN'), accent: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
      ]
    : [];

  return (
    <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Doanh thu
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Giao dịch mua Gold và đăng ký Pro đã thanh toán theo ngày
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
              <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="goldRevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="subRevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval="preserveStartEnd" minTickGap={20} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtVndCompact(v)} width={64} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: unknown, name: unknown) => [fmtVnd(Number(value) || 0), String(name)]}
                />
                <Area type="monotone" dataKey="goldRevenue" name="Gold" stroke="#d97706" strokeWidth={2} fill="url(#goldRevGradient)" isAnimationActive={!loading} />
                <Area type="monotone" dataKey="subRevenue" name="Pro" stroke="#7c3aed" strokeWidth={2} fill="url(#subRevGradient)" isAnimationActive={!loading} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
