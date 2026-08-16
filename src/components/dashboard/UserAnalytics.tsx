// src/components/dashboard/UserAnalytics.tsx
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OverviewDerivedStats, RoleSlice, StreakBucket } from '../../types/api';

interface UserAnalyticsProps {
  roleSlices: RoleSlice[];
  streakBuckets: StreakBucket[];
  derived: OverviewDerivedStats | null;
}

const PIE_COLORS = ['#c37938', '#16a34a', '#d97706', '#0284c7', '#ec4899'];
const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
  fontSize: 12,
};

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: 24,
} as const;

function DonutLegend({ data, colors }: { data: RoleSlice[]; colors: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      {data.map((d, i) => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length], display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#475569' }}>{d.name}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function UserAnalytics({ roleSlices, streakBuckets, derived }: UserAnalyticsProps) {
  const verifiedData = derived
    ? [
        { name: 'Đã xác thực', value: derived.verifiedCount },
        { name: 'Chưa xác thực', value: derived.totalUsers - derived.verifiedCount },
      ]
    : [];

  return (
    <section>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
        Phân tích người dùng
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {/* Phân bố theo role */}
        <div style={cardStyle}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#475569' }}>Phân bố theo vai trò</h4>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleSlices} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {roleSlices.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <DonutLegend data={roleSlices} colors={PIE_COLORS} />
        </div>

        {/* Tỷ lệ đã xác thực */}
        <div style={cardStyle}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#475569' }}>Xác thực tài khoản</h4>
          <div style={{ width: '100%', height: 200, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={verifiedData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  <Cell fill="#16a34a" stroke="#fff" strokeWidth={2} />
                  <Cell fill="#e2e8f0" stroke="#fff" strokeWidth={2} />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            {derived && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
                  {Math.round(derived.verifiedRatio * 100)}%
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>đã xác thực</div>
              </div>
            )}
          </div>
          <DonutLegend data={verifiedData.map((d) => ({ name: d.name, value: d.value }))} colors={['#16a34a', '#94a3b8']} />
        </div>

        {/* Phân bố streak */}
        <div style={cardStyle}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#475569' }}>Phân bố chuỗi ngày (streak)</h4>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={streakBuckets} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" name="Số user" radius={[6, 6, 0, 0]}>
                  {streakBuckets.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
