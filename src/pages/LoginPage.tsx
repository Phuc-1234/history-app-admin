// src/pages/LoginPage.tsx
import { useState } from 'react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import type { UserProfile } from '../types/api';

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
      const role = profile?.role;

      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        setError('Tài khoản của bạn không có quyền truy cập Admin Dashboard');
        return;
      }

      const userProfile: UserProfile = {
        id: profile.id,
        name: profile.name,
        email,
        role,
        totalGold: profile.totalGold ?? 0,
        totalXp: profile.totalXp ?? 0,
      };

      login(data.session.accessToken, userProfile);
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
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: -120, left: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -100, right: -80, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '40%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,168,212,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #6c63ff, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 16px',
            boxShadow: '0 12px 32px rgba(108,99,255,0.35)',
          }}>
            📜
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Sử Ký Admin
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
                <span>⚠</span> {error}
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
                  e.target.style.borderColor = '#6c63ff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)';
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
                  e.target.style.borderColor = '#6c63ff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)';
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
          Chỉ dành cho tài khoản có quyền ADMIN
        </p>
      </div>
    </div>
  );
}
