import { create } from "zustand";
import {
  api,
  UserResponse,
  OrganizationResponse,
  WorkspaceResponse,
  TokenResponse,
  OrganizationSummary,
} from "@/lib/api";

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  organization: OrganizationResponse | null;
  workspace: WorkspaceResponse | null;
  organizations: OrganizationSummary[];
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
    company_size?: string;
    industry?: string;
    role?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setActiveWorkspace: (workspace: WorkspaceResponse) => void;
  switchOrganization: (organizationId: string, workspaceId?: string) => Promise<void>;
  addWorkspace: (workspace: WorkspaceResponse) => void;
  fetchCurrentUser: () => Promise<boolean>;
  acceptInvitation: (token: string, data: { full_name: string; password: string }) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("ricozviz_token") : null,
  user: null,
  organization: null,
  workspace: null,
  organizations: [],
  permissions: [],
  isLoading: false,
  isInitializing: true,
  error: null,
  isAuthenticated: false,

  clearError: () => set({ error: null }),

  setActiveWorkspace: (workspace: WorkspaceResponse) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ricozviz_active_workspace_id", workspace.id);
    }
    set({ workspace });
  },

  switchOrganization: async (organizationId: string, workspaceId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.switchContext(organizationId, workspaceId);
      if (typeof window !== "undefined") {
        localStorage.setItem("ricozviz_token", res.access_token);
        localStorage.setItem("ricozviz_active_workspace_id", res.workspace_id);
      }
      set({
        token: res.access_token,
        organizations: res.organizations || [],
      });
      await get().fetchCurrentUser();
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Failed to switch organization context.",
      });
      throw err;
    }
  },

  addWorkspace: (workspace: WorkspaceResponse) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ricozviz_active_workspace_id", workspace.id);
    }
    set((state) => ({
      organization: state.organization
        ? {
            ...state.organization,
            workspaces: state.organization.workspaces?.some((w) => w.id === workspace.id)
              ? state.organization.workspaces
              : [...(state.organization.workspaces || []), workspace],
          }
        : null,
      workspace,
    }));
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const data: TokenResponse = await api.login(credentials);
      if (typeof window !== "undefined") {
        localStorage.setItem("ricozviz_token", data.access_token);
        localStorage.setItem("ricozviz_active_workspace_id", data.workspace_id);
      }
      set({
        token: data.access_token,
        organizations: data.organizations || [],
        isAuthenticated: true,
        isLoading: false,
      });
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
        localStorage.setItem("ricozviz_active_workspace_id", res.workspace_id);
      }
      set({
        token: res.access_token,
        organizations: res.organizations || [],
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

  acceptInvitation: async (token: string, data: { full_name: string; password: string }) => {
    set({ isLoading: true, error: null });
    try {
      const res: TokenResponse = await api.acceptInvitation(token, data);
      if (typeof window !== "undefined") {
        localStorage.setItem("ricozviz_token", res.access_token);
        localStorage.setItem("ricozviz_active_workspace_id", res.workspace_id);
      }
      set({
        token: res.access_token,
        organizations: res.organizations || [],
        isAuthenticated: true,
        isLoading: false,
      });
      await get().fetchCurrentUser();
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Failed to accept invitation.",
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
        localStorage.removeItem("ricozviz_active_workspace_id");
      }
      set({
        token: null,
        user: null,
        organization: null,
        workspace: null,
        organizations: [],
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
      if (typeof window !== "undefined" && me.workspace) {
        localStorage.setItem("ricozviz_active_workspace_id", me.workspace.id);
      }
      set({
        user: me.user,
        organization: me.organization,
        workspace: me.workspace,
        organizations: me.organizations || [],
        permissions: me.permissions,
        isAuthenticated: true,
        isInitializing: false,
      });
      return true;
    } catch (err) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ricozviz_token");
        localStorage.removeItem("ricozviz_active_workspace_id");
      }
      set({
        token: null,
        user: null,
        organization: null,
        workspace: null,
        organizations: [],
        permissions: [],
        isAuthenticated: false,
        isInitializing: false,
      });
      return false;
    }
  },
}));
