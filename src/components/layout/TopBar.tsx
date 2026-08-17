import { IS_LOCAL } from '../../api/client';
import { IconLogout } from '../ui/Icons';

const TAB_TITLES: Record<string, string> = {
  overview: 'Tổng quan',
  grades: 'Quản lý Khối lớp',
  topics: 'Quản lý Chủ đề',
  lessons: 'Quản lý Bài học',
  sections: 'Quản lý Phần',
  nodes: 'Quản lý Nút kiến thức',
};

interface TopBarProps {
  activeTab: string;
  onLogout: () => void;
  isMobile?: boolean;
  onToggleSidebar?: () => void;
}

export function TopBar({ activeTab, onLogout, isMobile, onToggleSidebar }: TopBarProps) {
  return (
    <header
      style={{
        height: 64,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
      }}
    >
      {/* Title + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
              borderRadius: 8,
              color: '#475569',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#0f172a' }}>
            {TAB_TITLES[activeTab] ?? activeTab}
          </h1>
          {!isMobile && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
              {IS_LOCAL ? 'Đã kết nối local' : 'Đã kết nối server'}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Logout */}
        <button
          id="logout-button"
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            color: '#dc2626',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fee2e2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fef2f2';
          }}
        >
          <IconLogout size={14} color="#dc2626" /> Đăng xuất
        </button>
      </div>
    </header>
  );
}
