
import { User, Clip, GenerationSettings } from '../types.ts';

const RAILWAY_URL = 'https://bizerraclipes-production.up.railway.app'; 
const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:10000' : RAILWAY_URL;

export const api = {
  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`, { mode: 'cors' });
      return response.ok;
    } catch (e) { return false; }
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await fetch(`${BACKEND_URL}/api/users`);
    if (!response.ok) return [];
    return await response.json();
  },

  register: async (email: string, name: string, password: string): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao cadastrar.");
    }
    return await response.json();
  },

  login: async (email: string, password?: string): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Login inválido.");
    }
    return await response.json();
  },

  updateUserCredits: async (userId: string, amount: number): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}/credits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    });
    if (!response.ok) throw new Error("Erro ao atualizar créditos no servidor.");
    return await response.json();
  },

  createPreference: async (userId: string, planId: string, planName: string, price: number): Promise<string> => {
    const response = await fetch(`${BACKEND_URL}/api/create-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, planId, planName, price })
    });
    if (!response.ok) throw new Error("Erro ao gerar link de pagamento.");
    const data = await response.json();
    return data.init_point;
  },

  // Galeria ainda usa localStorage para os clipes do usuário por performance, mas credits vêm do server
  saveGeneratedClips: (userId: string, clips: Clip[]) => {
    const data = localStorage.getItem('clipflow_clips_v1');
    const allClips = data ? JSON.parse(data) : [];
    const clipsWithMeta = clips.map(c => ({ ...c, userId, createdAt: new Date().toISOString() }));
    localStorage.setItem('clipflow_clips_v1', JSON.stringify([...clipsWithMeta, ...allClips]));
  },

  getClips: async (userId?: string): Promise<Clip[]> => {
    const data = localStorage.getItem('clipflow_clips_v1');
    const allClips = data ? JSON.parse(data) : [];
    return userId ? allClips.filter((c: any) => c.userId === userId) : allClips;
  },

  generateClips: async (userId: string, videoFile: File, settings: GenerationSettings): Promise<Clip[]> => {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('userId', userId);

    const response = await fetch(`${BACKEND_URL}/api/generate-real-clips`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) throw new Error("Erro no processamento do vídeo.");
    
    const data = await response.json();
    const realClips: Clip[] = data.clips.map((c: any) => ({
        ...c,
        videoUrl: `${BACKEND_URL}${c.videoUrl}`
    }));

    api.saveGeneratedClips(userId, realClips);
    await api.updateUserCredits(userId, -10); // Descontar 10 créditos no SERVIDOR

    return realClips;
  }
};
