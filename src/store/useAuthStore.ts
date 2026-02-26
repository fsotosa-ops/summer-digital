import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import { authService } from '@/services/auth.service';
import { calculateRank } from '@/lib/gamification';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  viewMode: 'admin' | 'participant';
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  requestPasswordRecovery: (email: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>;
  addPoints: (points: number) => void;
  awardMedal: (medalId: string) => void;
  setViewMode: (mode: 'admin' | 'participant') => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      viewMode: 'admin' as const,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.login(email, password);
          const rank = calculateRank(user.oasisScore);
          set({ user: { ...user, rank }, isLoading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error de autenticación';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      register: async (email: string, password: string, fullName?: string) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(email, password, fullName);
          set({ isLoading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error en el registro';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      requestPasswordRecovery: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await authService.requestPasswordRecovery(email);
          set({ isLoading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error al enviar correo';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      setUser: (user: User) => {
        const rank = calculateRank(user.oasisScore);
        set({ user: { ...user, rank }, error: null });
      },

      logout: async () => {
        set({ isLoading: true });
        await authService.logout();
        set({ user: null, isLoading: false, error: null });
      },

      initializeSession: async () => {
        const currentUser = get().user;
        if (!currentUser) return;

        try {
          const user = await authService.refreshSession();
          if (user) {
            const rank = calculateRank(user.oasisScore);
            set({ user: { ...user, rank } });
          }
          // Si user es null (error de API), NO limpiamos la sesión.
          // Mantenemos el usuario cacheado y dejamos que las llamadas
          // subsiguientes manejen errores de auth naturalmente.
        } catch {
          // No limpiar user en error - mantener sesión cacheada.
          // El 401 handler del apiClient redirigirá si realmente no hay auth.
        }
      },

      addPoints: (points: number) => {
        const currentUser = get().user;
        if (currentUser) {
          const newScore = Math.min(currentUser.oasisScore + points, 100);
          const newRank = calculateRank(newScore);
          set({
            user: {
              ...currentUser,
              oasisScore: newScore,
              rank: newRank
            }
          });
        }
      },

      setViewMode: (mode: 'admin' | 'participant') => {
        set({ viewMode: mode });
      },

      awardMedal: (medalId: string) => {
        const currentUser = get().user;
        if (currentUser) {
          if (currentUser.medals.some(m => m.id === medalId)) return;

          const newMedal = {
            id: medalId,
            name: medalId === 'first_workshop' ? 'Primer Taller' : 'Logro Desbloqueado',
            description: 'Has completado una actividad importante.',
            dateEarned: new Date().toISOString()
          };

          set({
            user: {
              ...currentUser,
              medals: [...currentUser.medals, newMedal]
            }
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, viewMode: state.viewMode }),
    }
  )
);
