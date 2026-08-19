// src/components/dashboard/DashboardSectionNav.tsx
import { useEffect, useState } from 'react';

export const DASHBOARD_SECTIONS = [
  { id: 'sec-overview', label: 'Tổng quan' },
  { id: 'sec-user-growth', label: 'Người dùng mới' },
  { id: 'sec-revenue', label: 'Doanh thu' },
  { id: 'sec-content-progress', label: 'Tiến độ nội dung' },
  { id: 'sec-activity', label: 'Hoạt động' },
  { id: 'sec-ai', label: 'AI' },
  { id: 'sec-users', label: 'Người dùng' },
  { id: 'sec-tests', label: 'Làm bài & câu hỏi' },
  { id: 'sec-leaderboard', label: 'Xếp hạng' },
  { id: 'sec-feed', label: 'Gần đây' },
] as const;

/** scroll-margin-top cho wrapper của từng section (chiều cao nav sticky + khe hở). */
export const SECTION_SCROLL_MARGIN = 76;

/**
 * Thanh điều hướng nội bộ của tab Tổng quan: bấm để cuộn tới section,
 * tự highlight section đang xem dựa vào IntersectionObserver.
 */
export function DashboardSectionNav() {
  const [active, setActive] = useState<string>(DASHBOARD_SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Chọn section gần đầu viewport nhất đang lọt vào "dải kích hoạt".
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );

    for (const s of DASHBOARD_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const handleClick = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 8,
        zIndex: 6,
        display: 'flex',
        gap: 4,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 5,
        overflowX: 'auto',
        boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
      }}
    >
      {DASHBOARD_SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => handleClick(s.id)}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: isActive ? '#c37938' : 'transparent',
              color: isActive ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
