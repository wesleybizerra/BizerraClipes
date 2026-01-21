
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.tsx';

const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="bg-slate-950 min-h-screen text-white overflow-hidden">
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
          <i className="fa-solid fa-bolt text-green-500"></i>
          BIZERRA<span className="text-green-500"> CLIPES</span>
        </div>
        <div className="flex gap-6 items-center">
          {user ? (
            <Link to="/dashboard" className="bg-green-500 text-slate-950 px-5 py-2 rounded-full font-bold hover:bg-green-400 transition">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="font-semibold hover:text-green-500 transition">Login</Link>
              <Link to="/register" className="bg-white text-slate-950 px-5 py-2 rounded-full font-bold hover:bg-slate-200 transition">Começar Agora</Link>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="inline-block bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 mb-8 text-sm font-medium text-green-400 animate-bounce">
          ✨ Ganhe 70 créditos ao se cadastrar
        </div>

        <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tight">
          Transforme vídeos longos em <br/>
          <span className="text-green-500">Clipes Virais</span> com IA
        </h1>
        
        <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
          Crie cortes automáticos para TikTok, Reels e Shorts em segundos. 
          Nossa IA detecta os melhores momentos, legenda e edita tudo para você.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/register" className="w-full sm:w-auto bg-green-500 text-slate-950 px-10 py-5 rounded-2xl text-xl font-bold hover:scale-105 active:scale-95 transition shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            CRIAR MEU PRIMEIRO CLIPE
          </Link>
          <div className="flex items-center gap-3 px-6 py-4 text-slate-400 font-medium">
            <i className="fa-solid fa-check text-green-500"></i>
            Sem cartão de crédito necessário
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
