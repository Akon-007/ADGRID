import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole, MarketplaceBillboard, SignupParams } from '../types';

interface RouteValidationResult {
  authorized: boolean;
  status: number;
  redirectTo?: string;
  error?: string;
  user?: UserAccount;
}

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password?: string) => Promise<{ success: boolean; user?: UserAccount; redirectTo?: string; error?: string }>;
  signup: (params: SignupParams) => Promise<{ success: boolean; user?: UserAccount; redirectTo?: string; error?: string }>;
  logout: () => Promise<void>;
  validateRoute: (path: string) => Promise<RouteValidationResult>;
  activePurchaseBillboard: MarketplaceBillboard | null;
  setActivePurchaseBillboard: (billboard: MarketplaceBillboard | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('adgrid_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('adgrid_token');
  });

  const [activePurchaseBillboard, setActivePurchaseBillboard] = useState<MarketplaceBillboard | null>(null);

  // Sync token and user with localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('adgrid_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('adgrid_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('adgrid_token', token);
    } else {
      localStorage.removeItem('adgrid_token');
    }
  }, [token]);

  // Centralized login function
  const login = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; user?: UserAccount; redirectTo?: string; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToken(data.token);
        setCurrentUser(data.user);
        return {
          success: true,
          user: data.user,
          redirectTo: data.redirectTo || data.user.authorizedDashboard || '/admin/agency',
        };
      }

      return {
        success: false,
        error: data.error || 'Authentication failed. Please check your credentials.',
      };
    } catch {
      return {
        success: false,
        error: 'Authentication service is unavailable. Please try again when the platform is online.',
      };
    }
  };

  // Centralized sign up function
  const signup = async (
    params: SignupParams
  ): Promise<{ success: boolean; user?: UserAccount; redirectTo?: string; error?: string }> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToken(data.token);
        setCurrentUser(data.user);
        return {
          success: true,
          user: data.user,
          redirectTo: data.redirectTo || data.user.authorizedDashboard || '/admin/media-owner',
        };
      } else {
        return {
          success: false,
          error: data.error || 'Registration failed. Please check your inputs.',
        };
      }
    } catch {
      // Local fallback registration
      const userRole = params.role || 'Media Owner';
      let authorizedDashboard = '/admin/media-owner';
      let permissions = ['inventory:manage', 'billboards:create', 'billboards:export', 'bookings:view', 'yield:optimize'];

      if (userRole === 'Agency Admin') {
        authorizedDashboard = '/admin/agency';
        permissions = ['agency:all', 'campaigns:manage', 'operations:manage', 'finance:view', 'verification:approve'];
      } else if (userRole === 'Customer / Client Company') {
        authorizedDashboard = '/admin/client';
        permissions = ['client:tracker', 'client:campaigns', 'client:purchase', 'client:invoices', 'client:evidence'];
      } else if (userRole === 'Vendor') {
        authorizedDashboard = '/admin/vendor';
        permissions = ['jobs:assigned', 'jobs:update', 'earnings:view'];
      } else if (userRole === 'Field Agent') {
        authorizedDashboard = '/admin/field-agent';
        permissions = ['mobile-os:access', 'jobs:execute', 'evidence:upload', 'gps:verify'];
      } else if (userRole === 'Platform Admin') {
        authorizedDashboard = '/admin/platform';
        permissions = ['platform:superadmin', 'governance:all', 'audit:all', 'tenants:all'];
      }

      const newUser: UserAccount = {
        id: 'usr-reg-' + Math.random().toString(36).substring(2, 9),
        name: params.name.trim(),
        email: params.email.trim().toLowerCase(),
        role: userRole,
        organization: params.organization.trim(),
        title: params.title?.trim() || (userRole === 'Media Owner' ? 'Managing Director & Concessionaire' : 'Executive Administrator'),
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        permissions,
        authorizedDashboard,
      };

      const dummyToken = 'ao_local_' + Math.random().toString(36).substring(2);
      setToken(dummyToken);
      setCurrentUser(newUser);

      // Save to registered accounts list in localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('adgrid_registered_accounts') || '[]');
        existing.push(newUser);
        localStorage.setItem('adgrid_registered_accounts', JSON.stringify(existing));
      } catch {
        // ignore
      }

      return {
        success: true,
        user: newUser,
        redirectTo: authorizedDashboard,
      };
    }
  };

  // Validate route authorization on backend
  const validateRoute = async (path: string): Promise<RouteValidationResult> => {
    try {
      const response = await fetch('/api/auth/validate-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetPath: path }),
      });

      if (!response.ok) {
        throw new Error('Route validation unavailable');
      }

      const data = await response.json();
      return {
        authorized: data.authorized,
        status: data.status || response.status,
        redirectTo: data.redirectTo,
        error: data.error,
        user: data.user,
      };
    } catch {
      // Local fallback authorization check
      if (!currentUser) {
        if (path.startsWith('/admin/')) {
          return { authorized: false, status: 401, redirectTo: '/admin' };
        }
        return { authorized: true, status: 200 };
      }

      if (path === '/admin' || path === '/admin/') {
        return { authorized: true, status: 200, redirectTo: currentUser.authorizedDashboard };
      }

      const role = currentUser.role;
      if (path.startsWith('/admin/client') && role !== 'Customer / Client Company' && role !== 'Platform Admin') {
        return { authorized: false, status: 403, redirectTo: currentUser.authorizedDashboard };
      }
      if (path.startsWith('/admin/agency') && !['Agency Admin', 'Account Manager', 'Campaign Manager', 'Operations Manager', 'Finance Manager', 'Field Manager', 'Agency Staff', 'Platform Admin'].includes(role)) {
        return { authorized: false, status: 403, redirectTo: currentUser.authorizedDashboard };
      }
      if (path.startsWith('/admin/media-owner') && role !== 'Media Owner' && role !== 'Platform Admin') {
        return { authorized: false, status: 403, redirectTo: currentUser.authorizedDashboard };
      }
      if (path.startsWith('/admin/vendor') && role !== 'Vendor' && role !== 'Platform Admin') {
        return { authorized: false, status: 403, redirectTo: currentUser.authorizedDashboard };
      }
      if (path.startsWith('/admin/field-agent') && role !== 'Field Agent' && role !== 'Platform Admin') {
        return { authorized: false, status: 403, redirectTo: currentUser.authorizedDashboard };
      }
      if (path.startsWith('/admin/platform') && role !== 'Platform Admin') {
        return { authorized: false, status: 403, redirectTo: currentUser.authorizedDashboard };
      }

      return { authorized: true, status: 200, user: currentUser };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    } finally {
      setToken(null);
      setCurrentUser(null);
      localStorage.removeItem('adgrid_token');
      localStorage.removeItem('adgrid_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        token,
        login,
        signup,
        logout,
        validateRoute,
        activePurchaseBillboard,
        setActivePurchaseBillboard,
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
