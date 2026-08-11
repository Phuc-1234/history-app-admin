// src/components/dashboard/ActivityFeed.tsx
import type { ActivityItem } from '../../types/api';

interface ActivityFeedProps {
  items: ActivityItem[];
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} tuần trước`;
  const month = Math.floor(day / 30);
  return `${month} tháng trước`;
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 20,
      }}
    >
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
        Hoạt động gần đây
      </h3>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: '#94a3b8', padding: '16px 0', textAlign: 'center' }}>
          Chưa có hoạt động gần đây
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 4px',
                borderBottom: idx === items.length - 1 ? 'none' : '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: `${item.accent}15`,
                  color: item.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                {item.kind === 'feedback' ? '💬' : '⚡'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
                  {item.title}
                </div>
                {item.subtitle && (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.subtitle}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {formatRelative(item.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
