import { User, Clip } from '../types.ts';

const RAILWAY_URL = 'https://bizerraclipes-production.up.railway.app';
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BACKEND_URL = isLocal ? 'http://localhost:8080' : RAILWAY_URL;

export const api = {
  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  login: async (email: string, password?: string): Promise<User> => {
    let response;
    try {
      console.log(`[API] Tentando acesso em: ${BACKEND_URL}/api/login`);
      response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch (networkError: any) {
      console.error("[ERRO DE REDE]:", networkError);
      throw new Error(`O servidor no Railway não respondeu. Certifique-se de que ${BACKEND_URL} está acessível.`);
    }

    if (!response.ok) {
      const err = await response.json();
      // Aqui mostramos a mensagem REAL do servidor (ex: "Senha incorreta")
      throw new Error(err.error || "Erro ao realizar login.");
    }

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
      throw new Error(err.error || "Erro no cadastro.");
    }
    return await response.json();
  },

  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users`);
      return await response.json();
    } catch (e) { return []; }
  },

  updateUserCredits: async (userId: string, amount: number): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}/credits`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    return await response.json();
  },

  createPreference: async (userId: string, planId: string, planName: string, price: number): Promise<string> => {
    const response = await fetch(`${BACKEND_URL}/api/create-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, planId, planName, price })
    });
    const data = await response.json();
    return data.init_point;
  },

  getJobStatus: async (jobId: string): Promise<any> => {
    const response = await fetch(`${BACKEND_URL}/api/jobs/${jobId}`);
    return await response.json();
  },

  saveGeneratedClips: (userId: string, clips: Clip[]) => {
    const data = localStorage.getItem('bizerra_clips_v10');
    const allClips = data ? JSON.parse(data) : [];
    const clipsWithMeta = clips.map(c => ({ ...c, userId, createdAt: new Date().toISOString() }));
    localStorage.setItem('bizerra_clips_v10', JSON.stringify([...clipsWithMeta, ...allClips]));
  },

  getClips: async (userId?: string): Promise<Clip[]> => {
    const data = localStorage.getItem('bizerra_clips_v10');
    const allClips = data ? JSON.parse(data) : [];
    return userId ? allClips.filter((c: any) => c.userId === userId) : allClips;
  },

  generateClips: async (userId: string, videoFile: File, onProgress?: (data: any) => void): Promise<Clip[]> => {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('userId', userId);

    const startResponse = await fetch(`${BACKEND_URL}/api/generate-real-clips`, {
      method: 'POST',
      body: formData
    });

    if (!startResponse.ok) throw new Error("Falha ao iniciar motor.");
    const { jobId } = await startResponse.json();

    return new Promise((resolve, reject) => {
      const check = async () => {
        try {
          const job = await api.getJobStatus(jobId);
          if (onProgress) onProgress(job);
          if (job.status === 'completed') {
            const realClips = job.clips.map((c: any) => ({
              ...c,
              videoUrl: `${BACKEND_URL}${c.videoUrl}`
            }));
            api.saveGeneratedClips(userId, realClips);
            await api.updateUserCredits(userId, -10);
            resolve(realClips);
          } else if (job.status === 'error') {
            reject(new Error(job.error));
          } else {
            setTimeout(check, 3000);
          }
        } catch (e) {
          reject(new Error("Perda de sinal com o motor."));
        }
      };
      check();
    });
  }
};