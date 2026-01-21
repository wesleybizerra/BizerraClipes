
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.tsx';
import { UserRole, SubscriptionPlan } from '../types.ts';
import { api } from '../services/api.ts';

const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Lógica para capturar retorno de pagamento (Real ou Simulado)
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get('payment');
    const mockPlan = params.get('mock_plan');

    if (paymentStatus === 'success' && user) {
      if (mockPlan) {
        // Se for uma simulação (sem backend), adicionamos créditos manualmente para teste
        const mockCredits: Record<string, number> = { 'CLASSIC': 1000, 'MEDIUM': 2000, 'PROFESSIONAL': 3000 };
        api.updateUserCredits(user.id, mockCredits[mockPlan] || 0).then(() => {
          alert("SIMULAÇÃO: Pagamento aprovado! Créditos adicionados com sucesso.");
          window.history.replaceState({}, '', window.location.pathname + window.location.hash);
          refreshUser();
        });
      } else {
        alert("Pagamento processado com sucesso! Seus créditos serão atualizados em instantes.");
        refreshUser();
      }
    }
  }, [location, user]);

  if (!user) return null;

  const NavigationLinks = () => (
    <div className="space-y-2">
      <Link 
        to="/dashboard" 
        onClick={() => setMobileMenuOpen(false)}
        className="flex items-center gap-3 px-4 py-3.5 bg-green-500/10 text-green-500 rounded-2xl font-bold transition-all border border-green-500/10"
      >
        <i className="fa-solid fa-house-chimney w-5"></i> Início
      </Link>
      <Link 
        to="/gerador" 
        onClick={() => setMobileMenuOpen(false)}
        className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:bg-slate-800 hover:text-white rounded-2xl transition-all"
      >
        <i className="fa-solid fa-clapperboard w-5"></i> Gerar Clipes
      </Link>
      <Link 
        to="/planos" 
        onClick={() => setMobileMenuOpen(false)}
        className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:bg-slate-800 hover:text-white rounded-2xl transition-all"
      >
        <i className="fa-solid fa-rocket w-5"></i> Planos
      </Link>
      {user.role === UserRole.ADMIN && (
        <Link 
          to="/admin" 
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-3 px-4 py-3.5 text-purple-400 hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-purple-500/20"
        >
          <i className="fa-solid fa-user-shield w-5"></i> Admin
        </Link>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-white relative">
      {/* Overlay Mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Header Mobile Fixo */}
      <div className="md:hidden fixed top-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md z-30 flex justify-between items-center border-b border-slate-800">
        <div className="text-xl font-black tracking-tighter flex items-center gap-2">
          <i className="fa-solid fa-bolt text-green-500"></i>
          BIZERRA<span className="text-green-500">CLIPES</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="bg-slate-900 border border-slate-800 w-10 h-10 rounded-xl text-green-500 flex items-center justify-center"
        >
          <i className="fa-solid fa-bars-staggered"></i>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 z-50 bg-slate-900 border-r border-slate-800 p-6 flex flex-col transition-all duration-300 shadow-2xl
        ${mobileMenuOpen ? 'left-0 w-[280px]' : '-left-full w-[280px]'} 
        md:left-0 md:w-72
      `}>
        <div className="flex justify-between items-center mb-10">
          <Link to="/" className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-bolt text-green-500"></i>
            BIZERRA<span className="text-green-500"> CLIPES</span>
          </Link>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-white">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <nav className="flex-grow">
          <NavigationLinks />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3.5 text-red-400 hover:bg-red-400/10 rounded-2xl transition-all font-bold">
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-10 pt-24 md:pt-10 transition-all duration-300 md:ml-72">
        <div className="max-w-6xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Fala, {user.name}! 🚀</h1>
            <p className="text-slate-400 mt-2 text-base md:text-lg">Pronto para viralizar hoje?</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[32px] shadow-lg hover:border-green-500/30 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 text-xl">
                  <i className="fa-solid fa-coins"></i>
                </div>
                <Link to="/planos" className="text-[10px] font-black text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg uppercase hover:bg-green-500 hover:text-slate-950 transition-colors">Recarregar</Link>
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Seu Saldo</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-5xl md:text-6xl font-black text-white">{user.credits}</h3>
                <span className="text-slate-500 font-bold text-xs uppercase">Créditos</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[32px] shadow-lg hover:border-blue-500/30 transition-all">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 text-xl mb-6">
                <i className="fa-solid fa-crown"></i>
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Assinatura</p>
              <h3 className="text-2xl md:text-3xl font-black text-white">{user.plan}</h3>
            </div>

            <Link to="/gerador" className="bg-green-500 hover:bg-green-400 p-6 md:p-8 rounded-[32px] shadow-2xl transition-all group overflow-hidden relative flex flex-col justify-between min-h-[160px]">
              <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-black text-slate-950 leading-none tracking-tighter">CRIAR<br/>CLIPES</h3>
                <p className="text-slate-950/70 font-bold mt-2 text-xs flex items-center gap-2">
                  Começar produção <i className="fa-solid fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
                </p>
              </div>
              <i className="fa-solid fa-bolt absolute -bottom-4 -right-4 text-8xl text-slate-950/10 -rotate-12 group-hover:scale-110 transition-all"></i>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
