import { User } from '@/types';

const MOCK_USERS: Record<string, User> = {
  Participant: {
    id: 'u1',
    name: 'Valentina Muñoz',
    email: 'valentina@fundacionsummer.cl',
    role: 'Participant',
    oasisScore: 78,
    avatarUrl: 'https://i.pravatar.cc/150?u=1',
    lastConnection: new Date().toISOString(),
  },
  Subscriber: {
    id: 'u2',
    name: 'Carlos Nuevo',
    email: 'carlos@example.com',
    role: 'Subscriber',
    oasisScore: 0,
    avatarUrl: 'https://i.pravatar.cc/150?u=2',
    lastConnection: new Date().toISOString(),
  },
  Admin: {
    id: 'u3',
    name: 'Admin User',
    email: 'admin@fundacionsummer.cl',
    role: 'Admin',
    oasisScore: 100,
    avatarUrl: 'https://i.pravatar.cc/150?u=3',
    lastConnection: new Date().toISOString(),
  },
  SuperAdmin: {
    id: 'u4',
    name: 'Super Admin',
    email: 'super@fundacionsummer.cl',
    role: 'SuperAdmin',
    oasisScore: 100,
    avatarUrl: 'https://i.pravatar.cc/150?u=4',
    lastConnection: new Date().toISOString(),
  }
};

class MockAuthService {
  private static readonly LATENCY = 500;

  async login(role: string = 'Participant'): Promise<User> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_USERS[role] || MOCK_USERS['Participant']);
      }, MockAuthService.LATENCY);
    });
  }

  async getUserProfile(): Promise<User> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_USERS['Participant']);
      }, MockAuthService.LATENCY / 2);
    });
  }

  async logout(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 300);
    });
  }
}

export const authService = new MockAuthService();

