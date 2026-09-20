import React, { createContext, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../lib/store';
import LoadingScreen from './LoadingScreen';

interface AuthContextValue {
  user: ReturnType<typeof useAuthStore>['user'];
  setUser: ReturnType<typeof useAuthStore>['setUser'];
  logout: ReturnType<typeof useAuthStore>['logout'];
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/setup'];

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, logout, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

  useEffect(() => {
    if (isPublicRoute) return;

    const checkAuth = async () => {
      try {
        const setupData = await api.get('/auth/setup-check');
        if (setupData.setupRequired) {
          navigate('/setup', { replace: true });
          return;
        }
        const data = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        setUser(null);
        navigate('/login');
      }
    };
    checkAuth();
  }, [setUser, navigate, isPublicRoute]);

  if (!isPublicRoute && isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
