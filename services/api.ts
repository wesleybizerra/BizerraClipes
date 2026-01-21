import { User, UserRole, SubscriptionPlan, Clip, GenerationSettings } from '../types.ts';
import { INITIAL_CREDITS, ADMIN_EMAIL } from '../constants.ts';

// Esta é a URL que aparece no seu dashboard do Railway. 
const RAILWAY_URL = 'https://bizerraclipes-production.up.railway.app'; 

const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:10000' 
  : RAILWAY_URL;

export const api = {
  checkHealth: async (): Promise<boolean> => {
    try {
      const url = `${BACKEND_URL}/health`;
      const response = await fetch(url, { 
        mode: 'cors',
        cache: 'no-store'
      });
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
    const endpoint = `${BACKEND_URL}/api/generate-real-clips`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ userId, videoUrl, settings }),
        });
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Erro ${response.status}: ${text || "Falha no servidor."}`);
        }
        
        const data = await response.json();
        
        if (!data.clips || data.clips.length === 0) {
            throw new Error("O servidor não retornou clipes.");
        }

        const realClips: Clip[] = data.clips.map((c: any) => ({
            ...c,
            videoUrl: c.videoUrl.startsWith('http') ? c.videoUrl : `${BACKEND_URL}${c.videoUrl}`
        }));

        // Salva localmente
        api.saveGeneratedClips(userId, realClips);
        
        // Tenta atualizar créditos (com auto-correção interna)
        try {
          await api.updateUserCredits(userId, -10);
        } catch (e) {
          console.warn("Falha ao debitar créditos, mas os clipes foram salvos.");
        }

        return realClips;
    } catch (e: any) {
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
      
      // Tenta encontrar por ID, e se falhar, tenta por e-mail (fallback)
      let userIndex = db.users.findIndex((u: any) => u.id === userId);
      
      // Se não achar pelo ID, tenta recuperar da sessão atual
      if (userIndex === -1) {
          const sessionUser = JSON.parse(localStorage.getItem('clipflow_user') || '{}');
          if (sessionUser.email) {
              userIndex = db.users.findIndex((u: any) => u.email === sessionUser.email);
          }
      }

      if (userIndex !== -1) {
          db.users[userIndex].credits += amount;
          if (db.users[userIndex].credits < 0) db.users[userIndex].credits = 0;
          
          localStorage.setItem('clipflow_db_v1', JSON.stringify(db));
          
          // Sincroniza também o usuário da sessão
          localStorage.setItem('clipflow_user', JSON.stringify(db.users[userIndex]));
          
          return db.users[userIndex];
      }
      
      // AUTO-CORREÇÃO: Se mesmo assim não achar, reconstrói o usuário baseado na sessão
      const sessionUser = JSON.parse(localStorage.getItem('clipflow_user') || 'null');
      if (sessionUser) {
          const repairedUser = { ...sessionUser, credits: INITIAL_CREDITS + amount };
          db.users.push(repairedUser);
          localStorage.setItem('clipflow_db_v1', JSON.stringify(db));
          return repairedUser;
      }

      throw new Error("Erro de integridade da conta. Por favor, saia e entre novamente.");
  }
};
