import { User, UserRole, SubscriptionPlan, Clip, GenerationSettings } from '../types.ts';
import { INITIAL_CREDITS, ADMIN_EMAIL } from '../constants.ts';

// Esta é a URL que aparece no seu dashboard do Railway. 
// Certifique-se de que NÃO há barras no final.
const RAILWAY_URL = 'https://bizerraclipes-production.up.railway.app'; 

const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:10000' 
  : RAILWAY_URL;

export const api = {
  checkHealth: async (): Promise<boolean> => {
    try {
      const url = `${BACKEND_URL}/health`;
      console.log("Checking health at:", url);
      const response = await fetch(url, { 
        mode: 'cors',
        cache: 'no-store'
      });
      return response.ok;
    } catch (e) {
      console.error("Health Check Failed:", e);
      return false;
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    const data = localStorage.getItem('clipflow_db_v1');
    const db = data ? JSON.parse(data) : { users: [] };
    return db.users;
  },

  register: async (email: string, name: string, password: string): Promise<User> => {
    const data = localStorage.getItem('clipflow_db_v1');
    const db = data ? JSON.parse(data) : { users: [] };
    
    if (db.users.find((u: any) => u.email === email)) {
      throw new Error("E-mail já cadastrado.");
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      password,
      credits: INITIAL_CREDITS,
      role: email === ADMIN_EMAIL ? UserRole.ADMIN : UserRole.USER,
      plan: SubscriptionPlan.FREE,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    localStorage.setItem('clipflow_db_v1', JSON.stringify(db));
    return newUser;
  },

  saveGeneratedClips: (userId: string, clips: Clip[]) => {
    const data = localStorage.getItem('clipflow_clips_v1');
    const allClips = data ? JSON.parse(data) : [];
    const clipsWithMeta = clips.map(c => ({ ...c, userId, createdAt: new Date().toISOString() }));
    localStorage.setItem('clipflow_clips_v1', JSON.stringify([...clipsWithMeta, ...allClips]));
  },

  getClips: async (userId?: string): Promise<Clip[]> => {
    const data = localStorage.getItem('clipflow_clips_v1');
    const allClips = data ? JSON.parse(data) : [];
    if (userId) {
      return allClips.filter((c: any) => c.userId === userId);
    }
    return allClips;
  },

  generateClips: async (userId: string, videoUrl: string, settings: GenerationSettings): Promise<Clip[]> => {
    // IMPORTANTE: Aqui garantimos que a URL seja absoluta para o Railway
    const endpoint = `${BACKEND_URL}/api/generate-real-clips`;
    
    console.log("-----------------------------------------");
    console.log("🚀 INICIANDO GERAÇÃO DE CLIPES");
    console.log("📍 ENDPOINT:", endpoint);
    console.log("📽️ VÍDEO:", videoUrl);
    console.log("-----------------------------------------");

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ userId, videoUrl, settings }),
        });
        
        console.log("📥 STATUS DA RESPOSTA:", response.status);
        
        if (!response.ok) {
          const text = await response.text();
          console.error("❌ ERRO NO SERVIDOR:", text);
          
          if (response.status === 404) {
             throw new Error(`O caminho /api/generate-real-clips não foi encontrado no servidor Railway. Verifique se o código do backend foi atualizado com sucesso.`);
          }
          throw new Error(`Erro ${response.status}: ${text || "Falha desconhecida no servidor."}`);
        }
        
        const data = await response.json();
        
        if (!data.clips || data.clips.length === 0) {
            throw new Error("O servidor respondeu, mas não gerou nenhum clipe.");
        }

        const realClips: Clip[] = data.clips.map((c: any) => ({
            ...c,
            videoUrl: c.videoUrl.startsWith('http') ? c.videoUrl : `${BACKEND_URL}${c.videoUrl}`
        }));

        api.saveGeneratedClips(userId, realClips);
        await api.updateUserCredits(userId, -10);
        return realClips;
    } catch (e: any) {
        console.error("🔥 ERRO CRÍTICO NA API:", e);
        throw e;
    }
  },

  login: async (email: string, password?: string): Promise<User> => {
    const data = localStorage.getItem('clipflow_db_v1');
    const db = data ? JSON.parse(data) : { users: [] };
    const user = db.users.find((u: any) => u.email === email);
    if (!user) throw new Error("Usuário não encontrado");
    return user;
  },
  
  updateUserCredits: async (userId: string, amount: number): Promise<User> => {
      const data = localStorage.getItem('clipflow_db_v1');
      const db = data ? JSON.parse(data) : { users: [] };
      const userIndex = db.users.findIndex((u: any) => u.id === userId);
      if (userIndex !== -1) {
          db.users[userIndex].credits += amount;
          localStorage.setItem('clipflow_db_v1', JSON.stringify(db));
          return db.users[userIndex];
      }
      throw new Error("Usuário não encontrado");
  }
};
