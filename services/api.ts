import { User, Clip } from '../types.ts';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BACKEND_URL = isLocal ? 'http://localhost:8080' : window.location.origin;

export const api = {
  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      return response.ok;
    } catch (e) { return false; }
  },

  login: async (email: string, password?: string): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Erro desconhecido." }));
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
      const err = await response.json().catch(() => ({ error: "Erro no cadastro." }));
      throw new Error(err.error);
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
    if (data.error) throw new Error(data.error);
    return data.init_point;
  },

  getJobStatus: async (jobId: string): Promise<any> => {
    const response = await fetch(`${BACKEND_URL}/api/jobs/${jobId}`);
    if (!response.ok) throw new Error("Servidor ocupado...");
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

  generateClips: async (userId: string, videoFile: File, startTime: number, endTime: number, clipDuration: number, onProgress?: (data: any) => void): Promise<Clip[]> => {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('userId', userId);
    formData.append('startTime', startTime.toString());
    formData.append('endTime', endTime.toString());
    formData.append('clipDuration', clipDuration.toString());

    const startResponse = await fetch(`${BACKEND_URL}/api/generate-real-clips`, {
      method: 'POST',
      body: formData
    });

    if (!startResponse.ok) {
      const err = await startResponse.json().catch(() => ({ error: "O Motor não respondeu." }));
      throw new Error(err.error);
    }

    const { jobId } = await startResponse.json();
    let retryCount = 0;
    const MAX_RETRIES = 5;

    return new Promise((resolve, reject) => {
      const check = async () => {
        try {
          const job = await api.getJobStatus(jobId);
          retryCount = 0; // Reseta retentativas se o servidor respondeu

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
            reject(new Error("O Motor falhou ao processar os cortes."));
          } else {
            setTimeout(check, 4000); // Polling a cada 4s para ser mais leve
          }
        } catch (e) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            reject(new Error("Conexão instável com o motor. Verifique os logs do Railway."));
          } else {
            console.warn(`Tentativa de reconexão ${retryCount}/${MAX_RETRIES}...`);
            setTimeout(check, 5000);
          }
        }
      };
      check();
    });
  }
};