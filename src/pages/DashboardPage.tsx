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
import { UserPanel } from '../components/content/UserPanel';
import { VideoPanel } from '../components/content/VideoPanel';
import { QuestionPanel } from '../components/content/QuestionPanel';
import { TestPanel } from '../components/content/TestPanel';
import { ToastContainer } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import { Spinner } from '../components/ui/Spinner';
import {
  IconGrade,
  IconTopic,
  IconLesson,
  IconSection,
  IconUser,
  IconVideo,
  IconQuestion,
  IconTest
} from '../components/ui/Icons';

export type TabId = 'overview' | 'grades' | 'topics' | 'lessons' | 'sections' | 'nodes' | 'users' | 'videos' | 'questions' | 'tests';

interface OverviewStats {
  grades: number;
  topics: number;
  lessons: number;
  sections: number;
  users: number;
  videos: number;
  questions: number;
  tests: number;
}

function OverviewPanel() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [gradesRes, usersRes, videosRes, questionsRes, testsRes] = await Promise.all([
          client.get('/api/content/grades'),
          client.get('/api/admin/users'),
          client.get('/api/admin/videos'),
          client.get('/api/admin/questions'),
          client.get('/api/admin/tests')
        ]);

        const grades = gradesRes.data.grades ?? [];
        const users = usersRes.data.users ?? [];
        const videos = videosRes.data.videos ?? [];
        const questions = questionsRes.data.questions ?? [];
        const tests = testsRes.data.tests ?? [];

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
          tests: tests.length
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
    { icon: IconSection, label: 'Phần',         value: stats?.sections  ?? '—', accent: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
    { icon: IconUser, label: 'Người dùng',    value: stats?.users     ?? '—', accent: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' },
    { icon: IconVideo, label: 'Video bài học',  value: stats?.videos    ?? '—', accent: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
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

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { logout, user } = useAuthStore();
  const { toasts, addToast, removeToast } = useToast();

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':  return <OverviewPanel />;
      case 'grades':    return <GradePanel onToast={addToast} />;
      case 'topics':    return <TopicPanel onToast={addToast} />;
      case 'lessons':   return <LessonPanel onToast={addToast} />;
      case 'sections':  return <SectionPanel onToast={addToast} />;
      case 'nodes':     return <NodePanel onToast={addToast} />;
      case 'users':     return <UserPanel onToast={addToast} />;
      case 'videos':    return <VideoPanel onToast={addToast} />;
      case 'questions': return <QuestionPanel onToast={addToast} />;
      case 'tests':     return <TestPanel onToast={addToast} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb' }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={user?.name}
        userRole={user?.role}
      />
      <div style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar activeTab={activeTab} onLogout={handleLogout} />
        <main style={{ flex: 1, padding: '32px 36px', maxWidth: 1200 }}>
          {renderContent()}
        </main>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
