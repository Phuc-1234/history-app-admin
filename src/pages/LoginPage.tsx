import { useState } from 'react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import {
  IconAlert,
  IconOverview,
  IconGrade,
  IconTopic,
  IconLesson,
  IconSection,
  IconMindMap,
  IconFlashcard,
  IconUser,
  IconVideo,
  IconQuestion,
  IconTest,
  IconTarget,
  IconTier,
  IconSparkles,
  IconInventory,
  IconPackagePricing,
  IconFeedback,
} from '../components/ui/Icons';
import type { UserProfile } from '../types/api';
import { APP_CONFIG } from '../config';

const FLOATING_BACKGROUND_ICONS = [
  { Icon: IconOverview, top: '4%', left: '6%', size: 76, opacity: 0.16, anim: 'floatSlow1', duration: '13s', delay: '0s' },
  { Icon: IconGrade, top: '12%', left: '84%', size: 92, opacity: 0.18, anim: 'floatSlow2', duration: '17s', delay: '-3s' },
  { Icon: IconTopic, top: '24%', left: '10%', size: 68, opacity: 0.15, anim: 'floatSlow2', duration: '15s', delay: '-5s' },
  { Icon: IconLesson, top: '76%', left: '5%', size: 96, opacity: 0.18, anim: 'floatSlow1', duration: '19s', delay: '-2s' },
  { Icon: IconSection, top: '44%', left: '3%', size: 64, opacity: 0.15, anim: 'floatSlow1', duration: '16s', delay: '-7s' },
  { Icon: IconMindMap, top: '6%', left: '42%', size: 84, opacity: 0.16, anim: 'floatSlow2', duration: '18s', delay: '-4s' },
  { Icon: IconFlashcard, top: '88%', left: '22%', size: 72, opacity: 0.16, anim: 'floatSlow1', duration: '14s', delay: '-1s' },
  { Icon: IconUser, top: '34%', left: '90%', size: 80, opacity: 0.18, anim: 'floatSlow1', duration: '16s', delay: '-6s' },
  { Icon: IconVideo, top: '60%', left: '86%', size: 88, opacity: 0.17, anim: 'floatSlow2', duration: '20s', delay: '-8s' },
  { Icon: IconQuestion, top: '82%', left: '80%', size: 104, opacity: 0.19, anim: 'floatSlow1', duration: '15s', delay: '-3s' },
  { Icon: IconTest, top: '16%', left: '24%', size: 64, opacity: 0.15, anim: 'floatSlow2', duration: '13s', delay: '-9s' },
  { Icon: IconTarget, top: '68%', left: '16%', size: 76, opacity: 0.16, anim: 'floatSlow2', duration: '17s', delay: '-4s' },
  { Icon: IconTier, top: '20%', left: '70%', size: 72, opacity: 0.15, anim: 'floatSlow1', duration: '15s', delay: '-2s' },
  { Icon: IconSparkles, top: '50%', left: '78%', size: 76, opacity: 0.17, anim: 'floatSlow2', duration: '12s', delay: '-5s' },
  { Icon: IconInventory, top: '90%', left: '50%', size: 84, opacity: 0.17, anim: 'floatSlow1', duration: '16s', delay: '-7s' },
  { Icon: IconPackagePricing, top: '3%', left: '64%', size: 64, opacity: 0.15, anim: 'floatSlow1', duration: '14s', delay: '-6s' },
  { Icon: IconFeedback, top: '66%', left: '66%', size: 68, opacity: 0.15, anim: 'floatSlow2', duration: '18s', delay: '-10s' },
  // Extra icons for denser coverage
  { Icon: IconOverview, top: '56%', left: '12%', size: 60, opacity: 0.14, anim: 'floatSlow2', duration: '16s', delay: '-8s' },
  { Icon: IconQuestion, top: '10%', left: '20%', size: 72, opacity: 0.16, anim: 'floatSlow1', duration: '15s', delay: '-4s' },
  { Icon: IconTest, top: '46%', left: '92%', size: 64, opacity: 0.15, anim: 'floatSlow1', duration: '14s', delay: '-11s' },
  { Icon: IconSparkles, top: '82%', left: '38%', size: 80, opacity: 0.17, anim: 'floatSlow2', duration: '17s', delay: '-2s' },
  { Icon: IconGrade, top: '38%', left: '20%', size: 68, opacity: 0.15, anim: 'floatSlow1', duration: '19s', delay: '-5s' },
  { Icon: IconTopic, top: '74%', left: '72%', size: 76, opacity: 0.16, anim: 'floatSlow2', duration: '15s', delay: '-9s' },
  { Icon: IconMindMap, top: '2%', left: '80%', size: 70, opacity: 0.15, anim: 'floatSlow1', duration: '16s', delay: '-1s' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    setError('');
    try {
      setLoading(true);
      const res = await client.post('/api/auth/login', { email, password });
      const data = res.data;

      if (data.status !== 'success') {
        setError(data.error ?? 'Đăng nhập thất bại');
        return;
      }

      const profile = data.profile;
      let role = profile?.role;

      // Fallback: If role is not returned in the login response, check database permissions by probing an admin endpoint
      if (!role && data.session?.accessToken) {
        try {
          await client.get('/api/admin/users', {
            params: { limit: 1 },
            headers: { Authorization: `Bearer ${data.session.accessToken}` }
          });
          // Request succeeded, meaning requireAdmin middleware passed the user
          role = 'SUPER_ADMIN';
        } catch (err: any) {
          const status = err?.response?.status;
          const details = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unknown';
          console.error(`Admin check failed: Status ${status}, Details: ${details}`, err);
          setError(`Đăng nhập thành công nhưng kiểm tra quyền Admin thất bại (Status: ${status}, Lỗi: ${details})`);
          role = undefined;
          return;
        }
      }

      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        setError(`Tài khoản của bạn không có quyền truy cập Admin Dashboard. Quyền hiện tại: "${role || 'không tìm thấy'}" - Kết nối tới API: "${client.defaults.baseURL || 'Trống'}"`);
        return;
      }

      const userProfile: UserProfile = {
        id: profile.id,
        name: profile.name,
        email,
        role,
        totalGold: profile.totalGold ?? 0,
        totalXp: profile.totalXp ?? 0,
        profileImgUrl: profile.profileImgUrl ?? null,
      };

      login(data.session.accessToken, data.session.refreshToken, userProfile);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? 'Đăng nhập thất bại';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    padding: '13px 16px',
    color: '#0f172a',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f0ff 0%, #f8f9fc 40%, #fff7f0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Rotating Dong Son Drums */}
      <div
        style={{
          position: 'fixed',
          top: -100,
          left: -140,
          width: 560,
          height: 560,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'spin 40s linear infinite',
          willChange: 'transform',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#c37938',
            WebkitMaskImage: 'url(/trongdong_dongson.png)',
            maskImage: 'url(/trongdong_dongson.png)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            opacity: 0.18,
          }}
        />
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: -160,
          right: -200,
          width: 800,
          height: 800,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'spin 40s linear infinite',
          willChange: 'transform',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#E5A93B',
            WebkitMaskImage: 'url(/trongdong_dongson.png)',
            maskImage: 'url(/trongdong_dongson.png)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            opacity: 0.15,
          }}
        />
      </div>

      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: -120, left: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(195,121,56,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -100, right: -80, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(166,98,40,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '40%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,168,212,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Floating faint background icons */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {FLOATING_BACKGROUND_ICONS.map((item, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: item.top,
              left: item.left,
              color: '#c37938',
              opacity: item.opacity,
              animation: `${item.anim} ${item.duration} ease-in-out infinite alternate`,
              animationDelay: item.delay,
              willChange: 'transform',
            }}
          >
            <item.Icon size={item.size} />
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src="/logo-main.png"
            alt="Sắc Sử Logo"
            style={{
              width: 72,
              height: 72,
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto 16px',
              border: 'none'
            }}
          />
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
            <span>Sắc Sử admin</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>v{APP_CONFIG.VERSION}</span>
          </h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 15 }}>
            Đăng nhập để quản lý nội dung
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: 36,
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 60px rgba(15,23,42,0.1)',
        }}>
          <form onSubmit={handleLogin}>
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10, padding: '12px 14px',
                marginBottom: 20, color: '#dc2626', fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <IconAlert size={16} color="#dc2626" /> {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = '#c37938';
                  e.target.style.boxShadow = '0 0 0 3px rgba(195,121,56,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                Mật khẩu
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = '#c37938';
                  e.target.style.boxShadow = '0 0 0 3px rgba(195,121,56,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <Button
              type="submit"
              loading={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
            >
              Đăng nhập
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#94a3b8' }}>
          chỉ dành cho tài khoản ADMIN hoặc SUPER ADMIN
        </p>
      </div>
    </div>
  );
}
