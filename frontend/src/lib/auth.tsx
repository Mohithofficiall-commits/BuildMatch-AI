import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserRole, AppUser } from '@/lib/types';
import { DEMO_HOMEOWNER_ID, DEMO_ENGINEER_USER_ID, DEMO_PLUMBER_USER_ID, DEMO_ELECTRICIAN_USER_ID, DEMO_MATERIAL_SHOP_USER_ID } from '@/lib/data';

interface AuthState {
  user: AppUser | null;
  login: (user: AppUser) => void;
  logout: () => void;
  demoLogin: (role: UserRole) => void;
}

const AuthContext = createContext<AuthState | null>(null);

const demoUsers: Record<UserRole, AppUser> = {
  homeowner: {
    id: DEMO_HOMEOWNER_ID,
    name: 'Nishi Sharma',
    email: 'nishi.sharma@example.com',
    role: 'homeowner',
    location: 'Coimbatore',
    phone: '+91 98765 43210',
    avatar_url: '/people/homeowner-1.jpg',
  },
  engineer: {
    id: DEMO_ENGINEER_USER_ID,
    name: 'Er. S. Karthik',
    email: 'karthik@buildmatch.ai',
    role: 'engineer',
    location: 'Coimbatore',
    phone: '+91 98422 12345',
    avatar_url: '/people/engineer-1.jpg',
  },
  plumber: {
    id: DEMO_PLUMBER_USER_ID,
    name: 'Rajesh Kumar',
    email: 'rajesh@buildmatch.ai',
    role: 'plumber',
    location: 'Coimbatore',
    phone: '+91 98765 43210',
    avatar_url: '/people/plumber-1.jpg',
  },
  electrician: {
    id: DEMO_ELECTRICIAN_USER_ID,
    name: 'Suresh Kumar',
    email: 'spark@buildmatch.ai',
    role: 'electrician',
    location: 'Coimbatore',
    phone: '+91 98765 43211',
    avatar_url: '/people/electrician-1.jpg',
  },
  material_shop: {
    id: DEMO_MATERIAL_SHOP_USER_ID,
    name: 'Mohan Lal',
    email: 'buildmart@buildmatch.ai',
    role: 'material_shop',
    location: 'Coimbatore',
    phone: '+91 98765 43212',
    avatar_url: '/people/shop-1.jpg',
  },
  admin: {
    id: 'a1000000-0000-0000-0000-000000000002',
    name: 'Admin User',
    email: 'admin@buildmatch.ai',
    role: 'admin',
    location: 'Bengaluru',
    phone: '+91 90000 11111',
    avatar_url: '/people/admin-1.jpg',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  const login = useCallback((u: AppUser) => setUser(u), []);
  const logout = useCallback(() => setUser(null), []);
  const demoLogin = useCallback((role: UserRole) => setUser(demoUsers[role]), []);

  return <AuthContext.Provider value={{ user, login, logout, demoLogin }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
