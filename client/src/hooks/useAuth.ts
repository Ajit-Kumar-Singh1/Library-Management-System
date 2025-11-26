import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthUser extends User {
  permissions?: {
    menuItemId: number;
    canRead: boolean;
    canWrite: boolean;
    path: string;
  }[];
}

interface LoginCredentials {
  username: string;
  password: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error, refetch } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
    },
  });

  const hasPermission = (path: string, type: "read" | "write" = "read"): boolean => {
    if (!user) return false;
    if (user.role === "super_admin") return true;
    if (user.role === "admin") return true;
    
    const permission = user.permissions?.find(p => p.path === path);
    if (!permission) return false;
    
    if (type === "read") return permission.canRead;
    if (type === "write") return permission.canWrite;
    return false;
  };

  const canAccessMenu = (path: string): boolean => {
    return hasPermission(path, "read");
  };

  const canWrite = (path: string): boolean => {
    return hasPermission(path, "write");
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === "super_admin",
    isAdmin: user?.role === "admin" || user?.role === "super_admin",
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    hasPermission,
    canAccessMenu,
    canWrite,
    refetch,
  };
}
