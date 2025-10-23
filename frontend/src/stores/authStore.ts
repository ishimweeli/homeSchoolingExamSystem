import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: string;
  avatar?: string;
  subscription?: {
    tier: string;
    status: string;
    startDate: string;
    endDate: string;
  };
}

interface Organization {
  id: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  organizations: Organization[];
  activeOrg: Organization | null;

login: (emailOrUsername: string, password: string) => Promise<{
  user: User;
  token: string;
  refreshToken: string;
  organizations: Organization[];
}>;

register: (data: {
  email: string;
  password: string;
  name: string;
  username?: string;
  role?: string;
  inviteCode?: string; 
}) => Promise<void>;

  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { name?: string; username?: string; avatar?: string }) => Promise<void>;
  fetchOrganizations: () => Promise<void>;
  switchOrganization: (orgId: string) => void;

  clearError: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      organizations: [],
      activeOrg: null,

login: async (emailOrUsername, password) => {
  set({ isLoading: true, error: null });
  try {
    const result = await api.login(emailOrUsername, password); // result has { user, token, refreshToken, organizations }
    set({ 
      user: result.user, 
      isAuthenticated: true, 
      isLoading: false,
      organizations: result.organizations
    });
    return result; // ✅ return the result
  } catch (error: any) {
    set({
      error: error.response?.data?.message || 'Login failed',
      isLoading: false,
    });
    throw error;
  }
},

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await api.register(data);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        api.logout();
        set({ user: null, isAuthenticated: false, error: null, activeOrg: null });
      },

      fetchProfile: async () => {
        set({ isLoading: true });
        try {
          const user = await api.getProfile();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const user = await api.updateProfile(data);
          set({ user, isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Update failed',
            isLoading: false,
          });
          throw error;
        }
      },

fetchOrganizations: async () => {
  try {
    const res = await api.getOrganizations();
    console.log('API Response:', res); // Debug log
    
    // Handle the response structure: { success: true, organizations: [...] }
    const orgs = res?.organizations || [];
    
    console.log('Parsed Organizations:', orgs); // Debug log
    console.log('Organizations length:', orgs.length); // Debug log

    set({ organizations: orgs });

    if (orgs.length > 0) {
      const storedOrgString = localStorage.getItem('activeOrg');
      let active = orgs[0]; // Default to first org
      
      // Try to restore previously selected org
      if (storedOrgString) {
        try {
          const storedOrg = JSON.parse(storedOrgString);
          const foundOrg = orgs.find((o: Organization) => o.id === storedOrg.id);
          if (foundOrg) {
            active = foundOrg;
          }
        } catch (e) {
          console.error('Failed to parse stored org:', e);
        }
      }

      console.log('Setting active org:', active); // Debug log
      set({ activeOrg: active });
      localStorage.setItem('activeOrg', JSON.stringify(active));
    } else {
      set({ activeOrg: null });
      localStorage.removeItem('activeOrg');
    }
  } catch (err) {
    console.error('Failed to load organizations', err);
    set({ organizations: [], activeOrg: null });
  }
},


      switchOrganization: (orgId: string) => {
        const org = get().organizations.find(o => o.id === orgId) || null;
        set({ activeOrg: org });
        if (org) {
          localStorage.setItem('activeOrg', JSON.stringify(org));
        }
      },

      clearError: () => set({ error: null }),

      clearAuth: () => {
        set({ user: null, isAuthenticated: false, error: null, isLoading: false, activeOrg: null });
        localStorage.removeItem('activeOrg');
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        activeOrg: state.activeOrg,
      }),
    }
  )
);

// Automatically clear auth when token expires
api.onTokenExpired(() => {
  useAuthStore.getState().clearAuth();
});
