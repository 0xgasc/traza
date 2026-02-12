'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  apiPost,
  apiGet,
  setAccessToken,
  setRefreshToken,
  getAccessToken,
  clearTokens,
} from './api';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  platformRole: 'USER' | 'SUPER_ADMIN';
  planTier?: string;
  createdAt?: string;
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    planTier: string;
    status: string;
    role: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  currentOrg: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  switchOrg: (orgId: string) => Promise<void>;
}

// Decode JWT to extract org context
function decodeToken(token: string): {
  orgId?: string;
  orgRole?: string;
  platformRole?: string;
  isImpersonating?: boolean;
} | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Decode token to get org context
      const decoded = decodeToken(token);

      const data = await apiGet<{
        id: string;
        email: string;
        name: string;
        platformRole: 'USER' | 'SUPER_ADMIN';
        planTier?: string;
        createdAt?: string;
        organizations?: Array<{
          id: string;
          name: string;
          slug: string;
          planTier: string;
          status: string;
          role: string;
        }>;
      }>('/api/v1/auth/me');

      setUser(data);

      // Set current org from token or first active org
      if (decoded?.orgId && data.organizations) {
        const org = data.organizations.find(o => o.id === decoded.orgId);
        if (org) {
          setCurrentOrg({
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: org.role,
          });
        }
      } else if (data.organizations && data.organizations.length > 0) {
        const activeOrg = data.organizations.find(o => o.status === 'ACTIVE');
        if (activeOrg) {
          setCurrentOrg({
            id: activeOrg.id,
            name: activeOrg.name,
            slug: activeOrg.slug,
            role: activeOrg.role,
          });
        }
      }
    } catch {
      clearTokens();
      setUser(null);
      setCurrentOrg(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const data = await apiPost<{
      accessToken?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
      user: User;
      organization?: Organization;
    }>('/api/v1/auth/login', { email, password });

    const accessToken = data.accessToken || data.access_token || '';
    const refreshToken = data.refreshToken || data.refresh_token || '';

    setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    setUser(data.user);

    if (data.organization) {
      setCurrentOrg(data.organization);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await apiPost<{
      accessToken?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
      user: User;
    }>('/api/v1/auth/register', { email, password, name });

    const accessToken = data.accessToken || data.access_token || '';
    const refreshToken = data.refreshToken || data.refresh_token || '';

    setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    setUser(data.user);
    setCurrentOrg(null); // New users don't have an org yet
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setCurrentOrg(null);
    window.location.href = '/login';
  };

  const switchOrg = async (orgId: string) => {
    const result = await apiPost<{
      accessToken: string;
      organization: Organization;
    }>('/api/v1/organizations/switch', { orgId });

    setAccessToken(result.accessToken);
    setCurrentOrg(result.organization);
  };

  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg,
        isAuthenticated: !!user,
        isLoading,
        isSuperAdmin,
        login,
        register,
        logout,
        switchOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
