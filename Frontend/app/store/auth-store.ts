import { create } from "zustand";
import { api, UserResponse, OrganizationResponse, WorkspaceResponse, TokenResponse } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  organization: OrganizationResponse | null;
  workspace: WorkspaceResponse | null;
  permissions: string[];
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  isAuthenticated: boolean;

  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (data: {
    full_name: string;
    email: string;
    password: string;
    organization_name: string;
    role?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setActiveWorkspace: (workspace: WorkspaceResponse) => void;
  fetchCurrentUser: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("ricozviz_token") : null,
  user: null,
  organization: null,
  workspace: null,
  permissions: [],
  isLoading: false,
  isInitializing: true,
  error: null,
  isAuthenticated: false,

  clearError: () => set({ error: null }),
  setActiveWorkspace: (workspace: WorkspaceResponse) => set({ workspace }),

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const data: TokenResponse = await api.login(credentials);
      if (typeof window !== "undefined") {
        localStorage.setItem("ricozviz_token", data.access_token);
      }
      set({
        token: data.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      // Fetch full details (org, workspace, permissions)
      await get().fetchCurrentUser();
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Failed to sign in. Please verify your credentials.",
        isAuthenticated: false,
      });
      throw err;
    }
  },

  signup: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res: TokenResponse = await api.signup(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("ricozviz_token", res.access_token);
      }
      set({
        token: res.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      await get().fetchCurrentUser();
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Failed to create account.",
        isAuthenticated: false,
      });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ricozviz_token");
        localStorage.removeItem("ricozviz_user");
      }
      set({
        token: null,
        user: null,
        organization: null,
        workspace: null,
        permissions: [],
        isAuthenticated: false,
        error: null,
      });
    }
  },

  fetchCurrentUser: async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ricozviz_token") : null;
    if (!token) {
      set({ isInitializing: false, isAuthenticated: false, user: null });
      return false;
    }

    try {
      const me = await api.getMe();
      set({
        user: me.user,
        organization: me.organization,
        workspace: me.workspace,
        permissions: me.permissions,
        isAuthenticated: true,
        isInitializing: false,
      });
      return true;
    } catch (err) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ricozviz_token");
      }
      set({
        token: null,
        user: null,
        organization: null,
        workspace: null,
        permissions: [],
        isAuthenticated: false,
        isInitializing: false,
      });
      return false;
    }
  },
}));
