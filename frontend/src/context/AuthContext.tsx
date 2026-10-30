import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserResponse, UserRole } from '../types';
import { loginUser, fetchCurrentUser, logoutUser } from '../services/api';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  role: UserRole;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_CREDENTIALS: Record<UserRole, { user: string; pass: string }> = {
  ADMIN: { user: 'admin', pass: 'Admin@Aquora2026!' },
  OFFICER: { user: 'officer', pass: 'Officer@Ksdma2026!' },
  INSPECTOR: { user: 'inspector', pass: 'Inspector@Kwa2026!' },
  VIEWER: { user: 'viewer', pass: 'Viewer@Aquora2026!' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(() => {
    const saved = localStorage.getItem('aquora_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aquora_token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // If token exists, refresh profile
    if (token) {
      fetchCurrentUser(token).then((res) => {
        if (res) {
          setUser(res);
          localStorage.setItem('aquora_user', JSON.stringify(res));
        } else {
          // Token expired or invalid
          setUser(null);
          setToken(null);
          localStorage.removeItem('aquora_token');
          localStorage.removeItem('aquora_user');
        }
      });
    } else {
      // Default to officer role on initial demo load if none selected
      switchRole('OFFICER').catch(() => {});
    }
  }, []);

  const login = async (username: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await loginUser(username, pass);
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('aquora_token', res.access_token);
      localStorage.setItem('aquora_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setToken(null);
      setUser(null);
      localStorage.removeItem('aquora_token');
      localStorage.removeItem('aquora_user');
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (targetRole: UserRole) => {
    const creds = DEFAULT_CREDENTIALS[targetRole];
    if (creds) {
      await login(creds.user, creds.pass);
    }
  };

  const role: UserRole = user?.role || 'VIEWER';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        role,
        login,
        logout,
        switchRole,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

