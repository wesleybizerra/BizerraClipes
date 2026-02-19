import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './types.ts';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('clipflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  useEffect(() => {
    if (user) {
      refreshUser();
    }
  }, []);

  const login = async (email: string, password?: string) => {
    const { api } = await import('./services/api.ts');
    const userData = await api.login(email, password);
    setUser(userData);
    localStorage.setItem('clipflow_user', JSON.stringify(userData));
  };

  const register = async (email: string, name: string, password: string) => {
    const { api } = await import('./services/api.ts');
    const userData = await api.register(email, name, password);
    setUser(userData);
    localStorage.setItem('clipflow_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('clipflow_user');
  };

  const refreshUser = () => {
    if (!user) return;
    import('./services/api.ts').then(({ api }) => {
      // Usamos apenas o email para tentar atualizar o perfil,
      // se o servidor resetar, ele retornará 404 e limparemos o localstorage.
      api.login(user.email, user.password).then(userData => {
        setUser(userData);
        localStorage.setItem('clipflow_user', JSON.stringify(userData));
      }).catch((err) => {
        console.warn("Sessão perdida (Servidor reiniciou ou senha mudou):", err.message);
        // Opcional: Se quiser deslogar automaticamente quando o servidor resetar descomente a linha abaixo
        // logout();
      });
    });
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};