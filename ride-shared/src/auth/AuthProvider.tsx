"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, isApiError } from "../api/client";
import { keys } from "../api/query";
import type { components } from "../api/schema.d";

type AuthUser = components["schemas"]["AuthUser"];
type UserRole = AuthUser["role"];

interface SessionState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends SessionState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requireRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [loginError, setLoginError] = useState<Error | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: keys.me(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/v1/auth/me");
      if (error) throw error;
      return data?.result ?? null;
    },
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 60_000,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      setLoginError(null);
      const { data, error } = await apiClient.POST("/v1/auth/login", {
        body: { email, password },
      });
      if (error) {
        setLoginError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
      if (data?.result) {
        queryClient.setQueryData(keys.me(), data.result);
      }
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await apiClient.POST("/v1/auth/logout", {});
    queryClient.setQueryData(keys.me(), null);
    queryClient.clear();
  }, [queryClient]);

  const requireRole = useCallback(
    (...roles: UserRole[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  useEffect(() => {
    void loginError;
  }, [loginError]);

  const value: AuthContextValue = {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    requireRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession must be used inside <AuthProvider>");
  return { user: ctx.user, isLoading: ctx.isLoading, isAuthenticated: ctx.isAuthenticated };
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function requireRole(...roles: UserRole[]): (user: AuthUser | null) => boolean {
  return (user) => {
    if (!user) return false;
    return roles.includes(user.role);
  };
}
