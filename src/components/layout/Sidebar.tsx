// src/components/layout/Sidebar.tsx
import type { TabId } from '../../pages/DashboardPage';

interface NavItem {
  id: TabId;
  label: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', icon: '◉', description: 'Dashboard' },
  { id: 'grades', label: 'Khối lớp', icon: '🎓', description: 'Grades' },
  { id: 'topics', label: 'Chủ đề', icon: '📚', description: 'Topics' },
  { id: 'lessons', label: 'Bài học', icon: '📖', description: 'Lessons' },
  { id: 'sections', label: 'Phần', icon: '📑', description: 'Sections' },
  { id: 'nodes', label: 'Nút kiến thức', icon: '🔷', description: 'Nodes' },
  { id: 'users', label: 'Người dùng', icon: '👥', description: 'Users' },
  { id: 'videos', label: 'Video bài học', icon: '🎥', description: 'Videos' },
  { id: 'questions', label: 'Ngân hàng câu hỏi', icon: '❓', description: 'Questions' },
  { id: 'tests', label: 'Đề thi', icon: '📝', description: 'Tests' },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  userName?: string;
  userRole?: string;
}

export function Sidebar({ activeTab, onTabChange, userName, userRole }: SidebarProps) {
  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100,
        boxShadow: '2px 0 12px rgba(15,23,42,0.05)',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6c63ff, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 4px 12px rgba(108,99,255,0.35)',
          }}>
            📜
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              Sử Ký
            </div>
            <div style={{ fontSize: 11, color: '#6c63ff', fontWeight: 700, letterSpacing: '0.05em' }}>
              ADMIN PANEL
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em', padding: '8px 8px 6px', textTransform: 'uppercase' }}>
          Quản lý nội dung
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                marginBottom: 2,
                textAlign: 'left',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(79,70,229,0.06))'
                  : 'transparent',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(108,99,255,0.2)' : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: 3, borderRadius: '0 3px 3px 0',
                  background: 'linear-gradient(#6c63ff, #4f46e5)',
                }} />
              )}
              <span style={{ fontSize: 17, width: 24, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              <div>
                <div style={{
                  fontSize: 14, fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#4f46e5' : '#475569',
                  lineHeight: 1.3,
                }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, color: isActive ? '#6c63ff' : '#94a3b8' }}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* User info */}
      <div style={{
        padding: '16px 16px',
        borderTop: '1px solid #f1f5f9',
        background: '#fafbff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6c63ff, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: '#fff',
            flexShrink: 0,
          }}>
            {userName?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userName ?? 'Admin'}
            </div>
            <div style={{ fontSize: 11, color: '#6c63ff', fontWeight: 600 }}>
              {userRole ?? 'ADMIN'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
