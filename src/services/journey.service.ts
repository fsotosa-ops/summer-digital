import { Journey } from '@/types';

const MOCK_JOURNEYS: Journey[] = [
    {
        id: 'journey-1',
        title: 'Taller Oasis',
        description: 'Un viaje de autoconocimiento y conexión.',
        status: 'active',
        category: 'Talleres',
        progress: 40,
        nodes: [
            { id: 'node-1', title: 'Bienvenida', description: 'Introducción al programa', type: 'video', status: 'completed', x: 10, y: 50, connections: ['node-2'] },
            { id: 'node-2', title: 'Cuestionario Inicial', description: 'Evaluación de expectativas', type: 'typeform', externalUrl: 'https://form.typeform.com/to/example', status: 'completed', x: 30, y: 50, connections: ['node-3'] },
            { id: 'node-3', title: 'Primer Taller', description: 'Dinámica grupal', type: 'workshop', status: 'available', x: 50, y: 50, connections: ['node-4'] },
            { id: 'node-4', title: 'Reflexión', description: 'Video de cierre', type: 'video', status: 'locked', x: 70, y: 50, connections: ['node-5'] },
            { id: 'node-5', title: 'Desafío Final', description: 'Comparte tu experiencia', type: 'challenge', status: 'locked', x: 90, y: 50, connections: [] },
        ]
    },
    {
        id: 'journey-2',
        title: 'Comunicación Empática',
        description: 'Aprende a comunicarte mejor con tu entorno.',
        status: 'active',
        category: 'Habilidades',
        progress: 10,
        nodes: [
            { id: 'j2-node-1', title: 'Intro a la Empatía', description: 'Fundamentos básicos', type: 'video', status: 'completed', x: 20, y: 30, connections: ['j2-node-2'] },
            { id: 'j2-node-2', title: 'Roleplay Virtual', description: 'Práctica interactiva', type: 'workshop', status: 'available', x: 50, y: 50, connections: ['j2-node-3'] },
            { id: 'j2-node-3', title: 'Quiz de Escucha', description: 'Evalúa tu aprendizaje', type: 'quiz', status: 'locked', x: 80, y: 70, connections: [] },
        ]
    },
    {
        id: 'journey-3',
        title: 'Bienvenida Pro',
        description: 'Onboarding para nuevos miembros.',
        status: 'completed',
        category: 'Onboarding',
        progress: 100,
        nodes: [
            { id: 'j3-node-1', title: 'Misión y Visión', description: 'Nuestros valores', type: 'video', status: 'completed', x: 20, y: 50, connections: ['j3-node-2'] },
            { id: 'j3-node-2', title: 'Tus Herramientas', description: 'Recursos disponibles', type: 'article', status: 'completed', x: 50, y: 50, connections: ['j3-node-3'] },
            { id: 'j3-node-3', title: 'Checklist Final', description: 'Confirma tu inicio', type: 'quiz', status: 'completed', x: 80, y: 50, connections: [] },
        ]
    }
];

export const journeyService = {
  fetchJourneys: async (): Promise<Journey[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800)); 
    return MOCK_JOURNEYS;
  },

  completeNode: async (nodeId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
     // In a real app, this would call an API
     console.log(`Node ${nodeId} completed`);
  }
};
