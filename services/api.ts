import { User, UserRole, SubscriptionPlan, Clip, GenerationSettings } from '../types.ts';
import { INITIAL_CREDITS, ADMIN_EMAIL } from '../constants.ts';

// IMPORTANTE: Substitua pela URL que o Render te fornecer após o deploy (Ex: https://bizerra-backend.onrender.com)
const BACKEND_URL = "https://sua-url-no-render.onrender.com";

export const api = {
  getAllUsers: async (): Promise<User[]> => {
    const data = localStorage.getItem('clipflow_db_production_v1');
    const db = data ? JSON.parse(data) : { users: [] };
    return db.users;
  },

  register: async (email: string, name: string, password: string): Promise<User> => {
    const data = localStorage.getItem('clipflow_db_production_v1');
    const db = data ? JSON.parse(data) : { users: [] };
    
    if (db.users.find((u: any) => u.email === email)) {
      throw new Error("E-mail já cadastrado. Tente outro.");
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
    localStorage.setItem('clipflow_db_production_v1', JSON.stringify(db));
    return newUser;
  },

  generateClips: async (userId: string, videoUrl: string, settings: GenerationSettings): Promise<Clip[]> => {
    console.log(`[API] Solicitando geração de clipes para: ${videoUrl}`);
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/generate-real-clips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, videoUrl })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro no processamento do servidor");
        }
        
        const data = await response.json();
        console.log("[API] Resposta do servidor:", data);
    } catch (e) {
        console.error("[API] Falha ao conectar com o backend real. Verifique se o BACKEND_URL está correto e o servidor está online.");
        console.error("[API] Detalhes do erro:", e);
        // Opcional: Você pode optar por lançar o erro para o usuário ver na tela
        // throw e;
    }

    // Mantemos a simulação visual para que o app continue funcional durante os testes de infraestrutura
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const sampleVideos = [
      'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-lighting-in-the-rain-31242-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4'
    ];

    await api.updateUserCredits(userId, -10);

    return Array.from({ length: 20 }).map((_, i) => ({
      id: `clip-${i}-${Date.now()}`,
      title: `Corte Viral #${i + 1}`,
      thumbnail: `https://picsum.photos/seed/${i + 100}/400/700`,
      videoUrl: sampleVideos[i % sampleVideos.length],
      duration: settings.durationRange,
      startTime: i * 20,
      endTime: (i + 1) * 20
    }));
  },

  login: async (email: string, password?: string): Promise<User> => {
    const data = localStorage.getItem('clipflow_db_production_v1');
    const db = data ? JSON.parse(data) : { users: [] };
    const user = db.users.find((u: any) => u.email === email);
    
    if (!user) throw new Error("Usuário não encontrado");
    if (password && user.password && user.password !== password) {
      throw new Error("Senha incorreta");
    }
    
    return user;
  },
  
  updateUserCredits: async (userId: string, amount: number): Promise<User> => {
      const data = localStorage.getItem('clipflow_db_production_v1');
      const db = data ? JSON.parse(data) : { users: [] };
      const userIndex = db.users.findIndex((u: any) => u.id === userId);
      
      if (userIndex === -1) throw new Error("Usuário não encontrado");
      
      db.users[userIndex].credits += amount;
      localStorage.setItem('clipflow_db_production_v1', JSON.stringify(db));
      return db.users[userIndex];
  }
};