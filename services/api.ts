
import { User, UserRole, SubscriptionPlan, Clip, GenerationSettings } from '../types.ts';
import { INITIAL_CREDITS, ADMIN_EMAIL } from '../constants.ts';

const RAILWAY_URL = 'https://bizerraclipes-production.up.railway.app'; 

const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:10000' 
  : RAILWAY_URL;

export const api = {
  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`, { mode: 'cors', cache: 'no-store' });
      return response.ok;
    } catch (e) {
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
    if (db.users.find((u: any) => u.email === email)) throw new Error("E-mail já cadastrado.");
    const newUser: User = {
      id: `user-${Date.now()}`,
      email, name, password,
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
    return userId ? allClips.filter((c: any) => c.userId === userId) : allClips;
  },

  generateClips: async (userId: string, videoFile: File, settings: GenerationSettings): Promise<Clip[]> => {
    const endpoint = `${BACKEND_URL}/api/generate-real-clips`;
    
    // Usamos FormData para enviar arquivos
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('userId', userId);
    formData.append('settings', JSON.stringify(settings));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000); 

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            signal: controller.signal
            // Observação: Não definir 'Content-Type' manualmente ao usar FormData, 
            // o navegador fará isso automaticamente com o boundary correto.
        });
        
        clearTimeout(timeoutId);

        const text = await response.text();
        
        if (!response.ok) {
          let errorMsg = "O servidor encontrou um problema.";
          try {
            const errorObj = JSON.parse(text);
            errorMsg = errorObj.error || errorMsg;
          } catch (e) {
            errorMsg = text || errorMsg;
          }
          throw new Error(errorMsg);
        }
        
        const data = JSON.parse(text);
        const realClips: Clip[] = data.clips.map((c: any) => ({
            ...c,
            videoUrl: c.videoUrl.startsWith('http') ? c.videoUrl : `${BACKEND_URL}${c.videoUrl}`
        }));

        api.saveGeneratedClips(userId, realClips);
        api.updateUserCredits(userId, -10).catch(() => {});

        return realClips;
    } catch (e: any) {
        if (e.name === 'AbortError') {
          throw new Error("O processamento excedeu o tempo limite. Verifique sua galeria em alguns minutos.");
        }
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
      let userIndex = db.users.findIndex((u: any) => u.id === userId);
      
      if (userIndex === -1) {
          const sessionUser = JSON.parse(localStorage.getItem('clipflow_user') || '{}');
          if (sessionUser.email) userIndex = db.users.findIndex((u: any) => u.email === sessionUser.email);
      }

      if (userIndex !== -1) {
          db.users[userIndex].credits += amount;
          localStorage.setItem('clipflow_db_v1', JSON.stringify(db));
          localStorage.setItem('clipflow_user', JSON.stringify(db.users[userIndex]));
          return db.users[userIndex];
      }
      throw new Error("Usuário não encontrado");
  }
};
