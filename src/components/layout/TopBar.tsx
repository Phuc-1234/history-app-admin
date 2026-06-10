// src/components/layout/TopBar.tsx
import { BASE_URL } from '../../api/client';
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
}

export function TopBar({ activeTab, onLogout }: TopBarProps) {
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
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
      }}
    >
      {/* Title + breadcrumb */}
      <div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
          {TAB_TITLES[activeTab] ?? activeTab}
        </h1>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
          {BASE_URL}
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
