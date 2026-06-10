// src/App.tsx
import './index.css';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  const { accessToken, user } = useAuthStore();

  const isAuthenticated = !!accessToken && !!user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  return isAuthenticated ? <DashboardPage /> : <LoginPage />;
}

export default App;
