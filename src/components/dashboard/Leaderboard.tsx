// src/components/dashboard/Leaderboard.tsx
import type { AdminUserDto } from '../../types/api';

interface LeaderboardProps {
  topXp: AdminUserDto[];
  topStreak: AdminUserDto[];
  topGold: AdminUserDto[];
}

const MEDAL = ['#f59e0b', '#94a3b8', '#cd7f32']; // vàng / bạc / đồng

interface BoardProps {
  title: string;
  users: AdminUserDto[];
  icon: React.ReactNode;
  valueExtractor: (u: AdminUserDto) => string;
}

function Board({ title, users, icon, valueExtractor }: BoardProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {icon}
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#475569' }}>{title}</h4>
      </div>
      {users.length === 0 ? (
        <div style={{ fontSize: 12, color: '#94a3b8', padding: '12px 0' }}>Chưa có dữ liệu</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 10,
                background: i < 3 ? '#fafbff' : 'transparent',
                border: i < 3 ? '1px solid #eef2ff' : '1px solid transparent',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                  background: i < 3 ? MEDAL[i] : '#f1f5f9',
                  color: i < 3 ? '#ffffff' : '#64748b',
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #6c63ff, #4f46e5)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {u.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.name}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', whiteSpace: 'nowrap' }}>
                {valueExtractor(u)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Leaderboard({ topXp, topStreak, topGold }: LeaderboardProps) {
  return (
    <section>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
        Bảng xếp hạng
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Board
          title="Top XP"
          users={topXp}
          icon={<span style={{ fontSize: 16 }}>⚡</span>}
          valueExtractor={(u) => `${(u.totalXp || 0).toLocaleString('vi-VN')} XP`}
        />
        <Board
          title="Top chuỗi ngày (streak)"
          users={topStreak}
          icon={<span style={{ fontSize: 16 }}>🔥</span>}
          valueExtractor={(u) => `${u.currentStreak || 0} ngày`}
        />
        <Board
          title="Top Gold"
          users={topGold}
          icon={<span style={{ fontSize: 16 }}>💰</span>}
          valueExtractor={(u) => `${(u.totalGold || 0).toLocaleString('vi-VN')}`}
        />
      </div>
    </section>
  );
}
