// src/components/dashboard/StatsCards.tsx
import type { CSSProperties } from 'react';
import type { OverviewDerivedStats, OverviewStats } from '../../types/api';
import {
  IconGrade,
  IconTopic,
  IconLesson,
  IconUser,
  IconVideo,
  IconQuestion,
  IconTest,
  IconMindMap,
  IconFlashcard,
  IconSparkles,
  IconXP,
  IconGold,
  IconFlame,
  IconCheck,
  IconClock,
} from '../ui/Icons';

interface StatsCardsProps {
  stats: OverviewStats | null;
  derived: OverviewDerivedStats | null;
}

const cardStyle = (bg: string, border: string): CSSProperties => ({
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 20,
  padding: 24,
  transition: 'transform 0.2s, box-shadow 0.2s',
  cursor: 'default',
});

function StatIconWrap({ children, border }: { children: React.ReactNode; border: string }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: '#ffffff',
        border: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {children}
    </div>
  );
}

export function StatsCards({ stats, derived }: StatsCardsProps) {
  const statCards = [
    { icon: IconGrade, label: 'Khối lớp', value: stats?.grades ?? '—', accent: '#c37938', bg: 'rgba(195, 121, 56, 0.06)', border: 'rgba(195, 121, 56, 0.15)' },
    { icon: IconTopic, label: 'Chủ đề', value: stats?.topics ?? '—', accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { icon: IconLesson, label: 'Bài học', value: stats?.lessons ?? '—', accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { icon: IconMindMap, label: 'Sơ đồ tư duy', value: stats?.sections ?? '—', accent: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
    { icon: IconFlashcard, label: 'Thẻ ghi nhớ', value: stats?.flashcards ?? '—', accent: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
    { icon: IconUser, label: 'Người dùng', value: stats?.users ?? '—', accent: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' },
    { icon: IconVideo, label: 'Video bài học', value: stats?.videos ?? '—', accent: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
    { icon: IconQuestion, label: 'Câu hỏi', value: stats?.questions ?? '—', accent: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
    { icon: IconTest, label: 'Đề thi', value: stats?.tests ?? '—', accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    { icon: IconSparkles, label: 'Phần thưởng', value: stats?.rewardRules ?? '—', accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  ];

  const kpiCards = derived
    ? [
        { icon: IconXP, label: 'Trung bình XP', value: derived.avgXp.toLocaleString('vi-VN'), accent: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
        { icon: IconGold, label: 'Trung bình Gold', value: derived.avgGold.toLocaleString('vi-VN'), accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
        { icon: IconFlame, label: 'Trung bình streak', value: `${derived.avgStreak} ngày`, accent: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
        { icon: IconCheck, label: 'Đã xác thực', value: `${Math.round(derived.verifiedRatio * 100)}%`, accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
        { icon: IconClock, label: 'Active hôm nay', value: derived.activeTodayCount, accent: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
      ]
    : [];

  return (
    <div>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
        Tổng quan nội dung
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.label}
              style={cardStyle(card.bg, card.border)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 12px 32px ${card.border}88`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <StatIconWrap border={card.border}>
                <IconComponent size={24} color={card.accent} />
              </StatIconWrap>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: 8 }}>
                {card.value}
              </div>
              <div style={{ fontSize: 13, color: card.accent, fontWeight: 600 }}>{card.label}</div>
            </div>
          );
        })}
      </div>

      {kpiCards.length > 0 && (
        <>
          <h3 style={{ margin: '28px 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Chỉ số người dùng
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {kpiCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={card.label}
                  style={{
                    ...cardStyle(card.bg, card.border),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: '#ffffff',
                        border: `1px solid ${card.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComponent size={18} color={card.accent} />
                    </div>
                    <div style={{ fontSize: 12, color: card.accent, fontWeight: 600 }}>{card.label}</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {card.value}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
