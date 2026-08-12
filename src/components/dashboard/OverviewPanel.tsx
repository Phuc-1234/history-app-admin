// src/components/dashboard/OverviewPanel.tsx
import { useDashboardData } from '../../hooks/useDashboardData';
import { Spinner } from '../ui/Spinner';
import { StatsCards } from './StatsCards';
import { GrowthCharts } from './GrowthCharts';
import { UserAnalytics } from './UserAnalytics';
import { TestActivityCharts } from './TestActivityCharts';
import { TestOverviewCards } from './TestOverviewCards';
import { QuestionStatsPanel } from './QuestionStatsPanel';
import { Leaderboard } from './Leaderboard';
import { ActivityFeed } from './ActivityFeed';

export function OverviewPanel() {
  const { data, loading, partial } = useDashboardData();

  if (loading) {
    return (
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Tổng quan</h2>
        <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>Đang tải dữ liệu...</p>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={36} />
        </div>
      </div>
    );
  }

  if (!partial) {
    return (
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Tổng quan</h2>
        <p style={{ margin: '0 0 28px', color: '#dc2626', fontSize: 14 }}>
          Không tải được dữ liệu. Vui lòng kiểm tra kết nối và thử lại.
        </p>
      </div>
    );
  }

  const { stats, derived, roleSlices, streakBuckets, topXp, topStreak, topGold, activityFeed } = data;

  return (
    <div>
      <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Tổng quan</h2>
      <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>
        Phân tích & thống kê nội dung, người dùng trong hệ thống
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Phần 1 — Stats Cards + KPI */}
        <StatsCards stats={stats} derived={derived} />

        {/* Phần 2 — Biểu đồ tăng trưởng */}
        <GrowthCharts />

        {/* Phần 3 — Phân tích người dùng */}
        <UserAnalytics roleSlices={roleSlices} streakBuckets={streakBuckets} derived={derived} />

        {/* Phần 4 — Thống kê làm bài & câu hỏi */}
        <TestActivityCharts />
        <TestOverviewCards />
        <QuestionStatsPanel />

        {/* Phần 5 — Bảng xếp hạng */}
        <Leaderboard topXp={topXp} topStreak={topStreak} topGold={topGold} />

        {/* Phần 6 — Hoạt động gần đây */}
        <ActivityFeed items={activityFeed} />
      </div>
    </div>
  );
}
