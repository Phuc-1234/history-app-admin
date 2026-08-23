// src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { GradePanel } from '../components/content/GradePanel';
import { TopicPanel } from '../components/content/TopicPanel';
import { LessonPanel } from '../components/content/LessonPanel';
import { SectionPanel } from '../components/content/SectionPanel';
import { NodePanel } from '../components/content/NodePanel';
import { MindMapPanel } from '../components/content/MindMapPanel';
import { FlashcardPanel } from '../components/content/FlashcardPanel';
import { UserPanel } from '../components/content/UserPanel';
import { VideoPanel } from '../components/content/VideoPanel';
import { QuestionPanel } from '../components/content/QuestionPanel';
import { TestPanel } from '../components/content/TestPanel';
import { TestPresetPanel } from '../components/content/TestPresetPanel';
import { RewardRulePanel } from '../components/content/RewardRulePanel';
import { FeedbackPanel } from '../components/content/FeedbackPanel';
import { ItemDefinitionPanel } from '../components/content/ItemDefinitionPanel';
import { PackagePricingPanel } from '../components/content/PackagePricingPanel';
import { TierPanel } from '../components/content/TierPanel';
import { OverviewPanel } from '../components/dashboard/OverviewPanel';
import { ToastContainer } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';

export type TabId = 'overview' | 'grades' | 'topics' | 'lessons' | 'sections' | 'nodes' | 'mindmaps' | 'flashcards' | 'users' | 'videos' | 'questions' | 'tests' | 'testpresets' | 'tiers' | 'feedbacks' | 'rewardrules' | 'itemdefinitions' | 'packages';

export interface NavParams {
  gradeId?: number | null;
  topicId?: number | null;
  lessonId?: number | null;
  sectionId?: number | null;
  nodeId?: number | null;
}

const VALID_TABS: TabId[] = [
  'overview', 'grades', 'topics', 'lessons', 'sections', 'nodes',
  'mindmaps', 'flashcards', 'users', 'videos', 'questions', 'tests',
  'testpresets', 'tiers', 'feedbacks', 'rewardrules', 'itemdefinitions', 'packages'
];



function getInitialTab(): TabId {
  const hash = window.location.hash.replace('#', '') as TabId;
  if (hash && VALID_TABS.includes(hash)) {
    return hash;
  }
  const saved = localStorage.getItem('admin_active_tab') as TabId;
  if (saved && VALID_TABS.includes(saved)) {
    return saved;
  }
  return 'overview';
}

export function DashboardPage() {
  const [activeTab, setActiveTabState] = useState<TabId>(getInitialTab);
  const [navParams, setNavParams] = useState<NavParams>({});

  const setActiveTab = (tab: TabId) => {
    setActiveTabState(tab);
    window.location.hash = tab;
    localStorage.setItem('admin_active_tab', tab);
  };

  const { logout, user } = useAuthStore();
  const { toasts, addToast, removeToast } = useToast();

  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const newVal = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(newVal));
      return newVal;
    });
  };

  // Sync hash changes if user uses browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabId;
      if (hash && VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
        localStorage.setItem('admin_active_tab', hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Initialize and handle resize on client
  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const handleNavigate = (tab: TabId, params?: NavParams) => {
    if (params) {
      setNavParams((prev) => ({ ...prev, ...params }));
    }
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':  return <OverviewPanel />;
      case 'grades':    return <GradePanel onToast={addToast} onNavigate={handleNavigate} />;


      case 'topics':    return <TopicPanel onToast={addToast} navParams={navParams} onNavigate={handleNavigate} />;
      case 'lessons':   return <LessonPanel onToast={addToast} navParams={navParams} onNavigate={handleNavigate} />;
      case 'sections':  return <SectionPanel onToast={addToast} navParams={navParams} onNavigate={handleNavigate} />;
      case 'nodes':     return <NodePanel onToast={addToast} />;
      case 'mindmaps':  return <MindMapPanel onToast={addToast} navParams={navParams} onNavigate={handleNavigate} />;
      case 'flashcards': return <FlashcardPanel onToast={addToast} navParams={navParams} onNavigate={handleNavigate} />;
      case 'users':     return <UserPanel onToast={addToast} />;
      case 'videos':    return <VideoPanel onToast={addToast} />;
      case 'questions': return <QuestionPanel onToast={addToast} />;
      case 'tests':     return <TestPanel onToast={addToast} />;
      case 'testpresets': return <TestPresetPanel onToast={addToast} />;
      case 'tiers':     return <TierPanel onToast={addToast} />;
      case 'rewardrules': return <RewardRulePanel onToast={addToast} />;
      case 'itemdefinitions': return <ItemDefinitionPanel onToast={addToast} />;
      case 'packages':  return <PackagePricingPanel onToast={addToast} />;
      case 'feedbacks': return <FeedbackPanel onToast={addToast} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb', position: 'relative' }}>
      {/* Mobile Sidebar Drawer backdrop overlay */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
          }}
        />
      )}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (isMobile) {
            setSidebarOpen(false);
          }
        }}
        userName={user?.name}
        userRole={user?.role}
        userAvatar={user?.profileImgUrl}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div 
        style={{ 
          flex: 1, 
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? 68 : 240), 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          width: isMobile ? '100%' : `calc(100% - ${sidebarCollapsed ? 68 : 240}px)`,
          boxSizing: 'border-box',
          transition: 'margin-left 0.3s ease, width 0.3s ease',
        }}
      >
        <TopBar 
          activeTab={activeTab} 
          onLogout={handleLogout}
          isMobile={isMobile}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main style={{
          flex: 1,
          padding: isMobile ? '20px 16px' : '32px 36px',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {renderContent()}
        </main>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
