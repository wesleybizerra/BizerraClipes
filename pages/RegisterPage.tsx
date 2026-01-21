
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.tsx';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      return setError('A senha deve ter pelo menos 6 caracteres');
    }
    setLoading(true);
    setError('');
    try {
      await register(email, name, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Falha ao criar conta. Tente outro e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative">
      <Link to="/" className="absolute top-8 left-8 text-slate-400 hover:text-white transition flex items-center gap-2 font-bold">
        <i className="fa-solid fa-arrow-left"></i>
        Voltar ao Início
      </Link>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-10">
          <Link to="/" className="text-2xl font-black tracking-tighter flex items-center justify-center gap-2 mb-6">
            <i className="fa-solid fa-bolt text-green-500"></i>
            BIZERRA<span className="text-green-500"> CLIPES</span>
          </Link>
          <h2 className="text-3xl font-bold text-white">Criar Conta</h2>
          <p className="text-slate-400 mt-2">Comece a viralizar seus vídeos agora</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm font-medium">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Seu Nome</label>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input 
                type="text" 
                placeholder="Como quer ser chamado?"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">E-mail</label>
            <div className="relative">
              <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input 
                type="email" 
                placeholder="exemplo@email.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Senha</label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-slate-950 font-black py-4 rounded-xl hover:bg-green-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
          >
            {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'CRIAR CONTA E GANHAR CRÉDITOS'}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 text-sm">
          Já tem uma conta? <Link to="/login" className="text-green-500 font-bold hover:underline">Fazer login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
