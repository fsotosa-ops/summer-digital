import { create } from 'zustand';
import { Announcement } from '@/types';

interface ContentState {
  announcements: Announcement[];
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => void;
  // In a real app, logic for creating journeys/resources would talk to backend.
  // Here we simulate local state updates for the session.
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
    {
        id: '1',
        title: 'Nueva Funcionalidad de Gamificación',
        content: 'Ahora puedes ganar medallas y puntos por cada actividad completada. ¡Revisa tu perfil!',
        date: new Date().toISOString(),
        type: 'info',
        authorId: 'admin1'
    },
    {
        id: '2',
        title: 'Mantenimiento Programado',
        content: 'La plataforma estará en mantenimiento este domingo de 02:00 a 04:00 AM.',
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        type: 'alert',
        authorId: 'admin1'
    }
];

export const useContentStore = create<ContentState>((set) => ({
  announcements: MOCK_ANNOUNCEMENTS,
  addAnnouncement: (newAnnouncement) => set((state) => ({
    announcements: [
        { 
            ...newAnnouncement, 
            id: Math.random().toString(36).substr(2, 9), 
            date: new Date().toISOString() 
        }, 
        ...state.announcements
    ]
  })),
}));
