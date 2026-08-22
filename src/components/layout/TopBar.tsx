import { IconLogout } from '../ui/Icons';

interface PanelTitle {
  vn: string;
  en: string;
}

const TAB_INFO: Record<string, PanelTitle> = {
  overview: { vn: 'Tổng quan', en: 'Dashboard' },
  grades: { vn: 'Quản lý Khối lớp', en: 'Grades' },
  topics: { vn: 'Quản lý Chủ đề', en: 'Topics' },
  lessons: { vn: 'Quản lý Bài học', en: 'Lessons' },
  sections: { vn: 'Quản lý Phần', en: 'Lesson Content' },
  nodes: { vn: 'Quản lý Nút kiến thức', en: 'Knowledge Nodes' },
  mindmaps: { vn: 'Sơ đồ tư duy', en: 'Mindmaps' },
  flashcards: { vn: 'Thẻ lật', en: 'Flashcards' },
  users: { vn: 'Quản lý Người dùng', en: 'Users' },
  videos: { vn: 'Video bài học', en: 'Videos' },
  questions: { vn: 'Ngân hàng câu hỏi', en: 'Questions' },
  tests: { vn: 'Quản lý Đề thi', en: 'Tests' },
  testpresets: { vn: 'Cấu hình mẫu đề', en: 'Test Presets' },
  tiers: { vn: 'Cấp danh hiệu', en: 'Tiers' },
  rewardrules: { vn: 'Quản lý phần thưởng', en: 'Reward Rules' },
  itemdefinitions: { vn: 'Danh mục vật phẩm', en: 'Item Definitions' },
  packages: { vn: 'Bảng giá & Gói nạp', en: 'Gold & Pro Packages' },
  feedbacks: { vn: 'Góp ý người dùng', en: 'User Feedbacks' },
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
          {(() => {
            const info = TAB_INFO[activeTab] || { vn: activeTab, en: '' };
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {info.vn}
                </h1>
                {info.en && (
                  <div style={{ fontSize: isMobile ? 11 : 12, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>
                    {info.en}
                  </div>
                )}
              </div>
            );
          })()}
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
