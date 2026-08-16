// src/hooks/useDashboardData.ts
import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import type {
  AdminUserDto,
  ActivityItem,
  DashboardData,
  OverviewDerivedStats,
  OverviewStats,
  RoleSlice,
  StreakBucket,
} from '../types/api';

interface FeedbackRow {
  id: string;
  type: string;
  content: string;
  status: string;
  createdAt: string;
  user?: { name?: string | null } | null;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Học sinh',
  ADMIN: 'Quản trị',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  STUDENT: '#c37938',
  ADMIN: '#c37938',
  SUPER_ADMIN: '#ef4444',
};

/** Đếm user active trong N ngày gần nhất dựa trên lastXpGainedAt (proxy cho engagement). */
// NOTE: Daily activity series giờ được fetch riêng từ endpoint
// /api/admin/stats/xp-activity (đếm distinct userId từ UserXpLog) bên trong GrowthCharts.
// Hàm buildActivitySeries cũ đã bị xoá vì nó chỉ dùng lastXpGainedAt (mỗi user 1 ngày) → sai semantics.

function computeDerived(users: AdminUserDto[]): OverviewDerivedStats {
  const n = users.length;
  if (n === 0) {
    return {
      totalUsers: 0,
      totalXp: 0,
      totalGold: 0,
      avgXp: 0,
      avgGold: 0,
      avgStreak: 0,
      verifiedCount: 0,
      verifiedRatio: 0,
      activeTodayCount: 0,
    };
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  let totalXp = 0;
  let totalGold = 0;
  let streakSum = 0;
  let verifiedCount = 0;
  let activeTodayCount = 0;

  for (const u of users) {
    totalXp += u.totalXp || 0;
    totalGold += u.totalGold || 0;
    streakSum += u.currentStreak || 0;
    if (u.isVerified) verifiedCount += 1;
    if (u.lastXpGainedAt && new Date(u.lastXpGainedAt).toISOString().slice(0, 10) === todayStr) {
      activeTodayCount += 1;
    }
  }

  return {
    totalUsers: n,
    totalXp,
    totalGold,
    avgXp: Math.round(totalXp / n),
    avgGold: Math.round(totalGold / n),
    avgStreak: Math.round((streakSum / n) * 10) / 10,
    verifiedCount,
    verifiedRatio: verifiedCount / n,
    activeTodayCount,
  };
}

function computeRoleSlices(users: AdminUserDto[]): RoleSlice[] {
  const counts: Record<string, number> = {};
  for (const u of users) {
    const role = u.role || 'STUDENT';
    counts[role] = (counts[role] || 0) + 1;
  }
  return Object.entries(counts).map(([role, value]) => ({
    name: ROLE_LABELS[role] || role,
    value,
  }));
}

function computeStreakBuckets(users: AdminUserDto[]): StreakBucket[] {
  const buckets: StreakBucket[] = [
    { bucket: '0', count: 0 },
    { bucket: '1-7', count: 0 },
    { bucket: '8-30', count: 0 },
    { bucket: '31+', count: 0 },
  ];
  for (const u of users) {
    const s = u.currentStreak || 0;
    if (s === 0) buckets[0].count += 1;
    else if (s <= 7) buckets[1].count += 1;
    else if (s <= 30) buckets[2].count += 1;
    else buckets[3].count += 1;
  }
  return buckets;
}

function topN(users: AdminUserDto[], key: 'totalXp' | 'currentStreak' | 'highestStreak' | 'totalGold', n: number): AdminUserDto[] {
  return [...users].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, n);
}

function buildActivityFeed(users: AdminUserDto[], feedbacks: FeedbackRow[], limit = 15): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const f of feedbacks) {
    const ts = new Date(f.createdAt).getTime();
    if (Number.isNaN(ts)) continue;
    const who = f.user?.name ? `${f.user.name} ` : '';
    items.push({
      id: `fb-${f.id}`,
      kind: 'feedback',
      timestamp: ts,
      title: `${who}gửi góp ý (${f.type || 'OTHER'})`,
      subtitle: (f.content || '').slice(0, 80),
      accent: '#ea580c',
    });
  }

  for (const u of users) {
    if (!u.lastXpGainedAt) continue;
    const ts = new Date(u.lastXpGainedAt).getTime();
    if (Number.isNaN(ts)) continue;
    items.push({
      id: `xp-${u.id}`,
      kind: 'xp_gain',
      timestamp: ts,
      title: `${u.name} đạt XP`,
      subtitle: `+${u.totalXp.toLocaleString('vi-VN')} XP tổng`,
      accent: '#c37938',
    });
  }

  return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export interface UseDashboardDataResult {
  data: DashboardData;
  loading: boolean;
  /** true nếu ít nhất 1 trong các endpoint quan trọng load được. */
  partial: boolean;
}

export function useDashboardData(): UseDashboardDataResult {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [partial, setPartial] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      // Fetch song song 3 nguồn; mỗi nguồn fail độc lập.
      const results = await Promise.allSettled([
        client.get('/api/admin/stats'),
        client.get('/api/admin/users'),
        client.get('/api/admin/feedback'),
      ]);

      if (!isMounted) return;

      let anyOk = false;

      if (results[0].status === 'fulfilled') {
        setStats(results[0].value.data as OverviewStats);
        anyOk = true;
      }
      if (results[1].status === 'fulfilled') {
        setUsers((results[1].value.data?.users ?? []) as AdminUserDto[]);
        anyOk = true;
      }
      if (results[2].status === 'fulfilled') {
        setFeedbacks((results[2].value.data ?? []) as FeedbackRow[]);
        anyOk = true;
      }

      setPartial(anyOk);
      setLoading(false);
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const computed = useMemo<DashboardData>(() => {
    const derived = computeDerived(users);
    return {
      stats,
      users,
      derived,
      roleSlices: computeRoleSlices(users),
      streakBuckets: computeStreakBuckets(users),
      topXp: topN(users, 'totalXp', 5),
      topStreak: topN(users, 'currentStreak', 5),
      topGold: topN(users, 'totalGold', 5),
      activityFeed: buildActivityFeed(users, feedbacks),
    };
  }, [stats, users, feedbacks]);

  return { data: computed, loading, partial };
}

export { ROLE_COLORS, ROLE_LABELS };
