// src/components/dashboard/TestOverviewCards.tsx
import { useEffect, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import client from '../../api/client';
import type { TestOverviewStats } from '../../types/api';

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
  fontSize: 12,
};

interface KpiCard {
  label: string;
  value: string | number;
  accent: string;
  bg: string;
  border: string;
}

export function TestOverviewCards() {
  const [range, setRange] = useState<7 | 30>(30);
  const [data, setData] = useState<TestOverviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setError(null);

    client
      .get<TestOverviewStats>('/api/admin/stats/test-overview', { params: { days: range } })
      .then((res) => {
        if (!mounted) return;
        setData(res.data ?? null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Không tải được tổng quan làm bài');
        setData(null);
      });

    return () => {
      mounted = false;
    };
  }, [range]);

  const cards: KpiCard[] = data
    ? [
        { label: 'Tổng lượt làm bài', value: data.totalAttempts.toLocaleString('vi-VN'), accent: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
        { label: 'Người dùng làm bài', value: data.distinctUsers.toLocaleString('vi-VN'), accent: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
        { label: 'Đề thủ công', value: data.manualAttempts.toLocaleString('vi-VN'), accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
        { label: 'Đề tự động', value: data.autoAttempts.toLocaleString('vi-VN'), accent: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
        { label: 'Điểm trung bình', value: data.avgScore, accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
        { label: 'Tỷ lệ pass', value: `${data.passRate}%`, accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
      ]
    : [];

  const passData = data
    ? [
        { name: 'Pass', value: data.passedCount },
        { name: 'Fail', value: data.failedCount },
      ]
    : [];

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
            Tổng quan làm bài
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            KPI trong {range} ngày gần nhất
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'stretch' }}>
          {cards.map((c) => (
            <div
              key={c.label}
              style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16 }}
            >
              <div style={{ fontSize: 12, color: c.accent, fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{c.value}</div>
            </div>
          ))}

          {/* Pass/Fail donut */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 4 }}>Pass / Fail</div>
            <div style={{ flex: 1, minHeight: 90, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={passData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={42} paddingAngle={2}>
                    <Cell fill="#16a34a" stroke="#fff" strokeWidth={2} />
                    <Cell fill="#ef4444" stroke="#fff" strokeWidth={2} />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              {data && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{data.passRate}%</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 11, color: '#64748b' }}>
              <span><span style={{ color: '#16a34a', fontWeight: 700 }}>●</span> Pass {data?.passedCount ?? 0}</span>
              <span><span style={{ color: '#ef4444', fontWeight: 700 }}>●</span> Fail {data?.failedCount ?? 0}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
