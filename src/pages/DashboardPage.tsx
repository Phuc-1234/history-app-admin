// src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import client from '../api/client';
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
import { FeedbackPanel } from '../components/content/FeedbackPanel';
import { ToastContainer } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import { Spinner } from '../components/ui/Spinner';
import {
  IconGrade,
  IconTopic,
  IconLesson,
  IconUser,
  IconVideo,
  IconQuestion,
  IconTest,
  IconMindMap,
  IconFlashcard
} from '../components/ui/Icons';

export type TabId = 'overview' | 'grades' | 'topics' | 'lessons' | 'sections' | 'nodes' | 'mindmaps' | 'flashcards' | 'users' | 'videos' | 'questions' | 'tests' | 'testpresets' | 'feedbacks';

interface OverviewStats {
  grades: number;
  topics: number;
  lessons: number;
  sections: number;
  users: number;
  videos: number;
  questions: number;
  tests: number;
  flashcards: number;
}

function OverviewPanel() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [gradesRes, usersRes, videosRes, questionsRes, testsRes, flashcardsRes] = await Promise.all([
          client.get('/api/content/grades'),
          client.get('/api/admin/users'),
          client.get('/api/admin/videos'),
          client.get('/api/admin/questions'),
          client.get('/api/admin/tests'),
          client.get('/api/admin/flashcards')
        ]);

        const grades = gradesRes.data.grades ?? [];
        const users = usersRes.data.users ?? [];
        const videos = videosRes.data.videos ?? [];
        const questions = questionsRes.data.questions ?? [];
        const tests = testsRes.data.tests ?? [];
        const flashcards = flashcardsRes.data.flashcards ?? [];

        let totalTopics = 0, totalLessons = 0, totalSections = 0;

        await Promise.all(
          grades.map(async (g: { id: number }) => {
            const topicsRes = await client.get(`/api/content/grades/${g.id}/topics`);
            const topics = topicsRes.data.topics ?? [];
            totalTopics += topics.length;

            await Promise.all(
              topics.map(async (t: { id: number }) => {
                const lessonsRes = await client.get(`/api/content/topics/${t.id}/lessons`);
                const lessons = lessonsRes.data.lessons ?? [];
                totalLessons += lessons.length;

                await Promise.all(
                  lessons.map(async (l: { id: number }) => {
                    const sectionsRes = await client.get(`/api/content/lessons/${l.id}/sections`);
                    totalSections += (sectionsRes.data.sections ?? []).length;
                  })
                );
              })
            );
          })
        );

        setStats({
          grades: grades.length,
          topics: totalTopics,
          lessons: totalLessons,
          sections: totalSections,
          users: users.length,
          videos: videos.length,
          questions: questions.length,
          tests: tests.length,
          flashcards: flashcards.length
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { icon: IconGrade, label: 'Khối lớp',     value: stats?.grades    ?? '—', accent: '#6c63ff', bg: '#f5f3ff', border: '#ddd6fe' },
    { icon: IconTopic, label: 'Chủ đề',       value: stats?.topics    ?? '—', accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { icon: IconLesson, label: 'Bài học',      value: stats?.lessons   ?? '—', accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { icon: IconMindMap, label: 'Sơ đồ tư duy', value: stats?.sections  ?? '—', accent: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
    { icon: IconFlashcard, label: 'Thẻ ghi nhớ', value: stats?.flashcards ?? '—', accent: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
    { icon: IconUser, label: 'Người dùng',    value: stats?.users     ?? '—', accent: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' },
    { icon: IconVideo, label: 'Video bài học',  value: stats?.videos    ?? '—', accent: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
    { icon: IconQuestion, label: 'Câu hỏi',       value: stats?.questions ?? '—', accent: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
    { icon: IconTest, label: 'Đề thi',        value: stats?.tests     ?? '—', accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Tổng quan</h2>
      <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>Thống kê nội dung hiện tại trong hệ thống</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 36 }}>
          {statCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div key={card.label} style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
                borderRadius: 20,
                padding: 24,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 32px ${card.border}88`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: '#ffffff',
                  border: `1px solid ${card.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  <IconComponent size={24} color={card.accent} />
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: 8 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 14, color: card.accent, fontWeight: 600 }}>{card.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface NavParams {
  gradeId?: number | null;
  topicId?: number | null;
  lessonId?: number | null;
  sectionId?: number | null;
  nodeId?: number | null;
}

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [navParams, setNavParams] = useState<NavParams>({});
  const { logout, user } = useAuthStore();
  const { toasts, addToast, removeToast } = useToast();

  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
      />
      <div 
        style={{ 
          flex: 1, 
          marginLeft: isMobile ? 0 : 240, 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          width: isMobile ? '100%' : 'calc(100% - 240px)',
          boxSizing: 'border-box',
          transition: 'margin-left 0.3s ease',
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
          maxWidth: 1200,
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
