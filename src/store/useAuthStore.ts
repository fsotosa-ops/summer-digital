import { create } from 'zustand';
import { User } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  login: async (role?: string) => {
    set({ isLoading: true });
    try {
      const user = await authService.login(role);
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Login failed', error);
    }
  },
  logout: async () => {
    set({ isLoading: true });
    await authService.logout();
    set({ user: null, isLoading: false });
  },
}));
