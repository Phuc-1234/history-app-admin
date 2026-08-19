// src/components/dashboard/OverviewPanel.tsx
import { useDashboardData } from '../../hooks/useDashboardData';
import { Spinner } from '../ui/Spinner';
import { StatsCards } from './StatsCards';
import { GrowthCharts } from './GrowthCharts';
import { UserAnalytics } from './UserAnalytics';
import { AiUsagePanel } from './AiUsagePanel';
import { TestActivityCharts } from './TestActivityCharts';
import { TestOverviewCards } from './TestOverviewCards';
import { QuestionStatsPanel } from './QuestionStatsPanel';
import { Leaderboard } from './Leaderboard';
import { ActivityFeed } from './ActivityFeed';
import { UserGrowthPanel } from './UserGrowthPanel';
import { RevenuePanel } from './RevenuePanel';
import { ContentProgressPanel } from './ContentProgressPanel';
import { DashboardSectionNav, SECTION_SCROLL_MARGIN } from './DashboardSectionNav';

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
        {/* Điều hướng nội bộ — cuộn tới từng phần */}
        <DashboardSectionNav />

        {/* Phần 1 — Stats Cards + KPI */}
        <div id="sec-overview" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
          <StatsCards stats={stats} derived={derived} />
        </div>

        {/* Phần 2 — Tăng trưởng người dùng mới */}
        <div id="sec-user-growth" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
          <UserGrowthPanel />
        </div>

        {/* Phần 3 — Doanh thu */}
        <div id="sec-revenue" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
          <RevenuePanel />
        </div>

        {/* Phần 4 — Tiến độ học nội dung */}
        <div id="sec-content-progress" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
          <ContentProgressPanel />
        </div>

        {/* Phần 5 — Biểu đồ hoạt động */}
        <div id="sec-activity" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
          <GrowthCharts />
        </div>

        {/* Phần AI — Thống kê & Bảng xếp hạng AI Token */}
        <div id="sec-ai" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
          <AiUsagePanel />
        </div>

        {/* Phần 6 — Phân tích người dùng */}
        <div id="sec-users" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
          <UserAnalytics roleSlices={roleSlices} streakBuckets={streakBuckets} derived={derived} />
        </div>

        {/* Phần 7 — Thống kê làm bài & câu hỏi */}
        <div id="sec-tests" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <TestActivityCharts />
          <TestOverviewCards />
          <QuestionStatsPanel />
        </div>

        {/* Phần 8 — Bảng xếp hạng */}
        <div id="sec-leaderboard" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
          <Leaderboard topXp={topXp} topStreak={topStreak} topGold={topGold} />
        </div>

        {/* Phần 9 — Hoạt động gần đây */}
        <div id="sec-feed" style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
          <ActivityFeed items={activityFeed} />
        </div>
      </div>
    </div>
  );
}
