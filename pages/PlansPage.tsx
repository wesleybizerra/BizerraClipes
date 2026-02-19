
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PLANS } from '../constants.ts';
import { useAuth } from '../AuthContext.tsx';
import { api } from '../services/api.ts';

const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handlePurchase = async (plan: any) => {
    if (!user) return alert("Você precisa estar logado.");

    setLoadingPlanId(plan.id);
    try {
      const checkoutUrl = await api.createPreference(user.id, plan.id, plan.name, plan.price);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      alert("Erro ao iniciar pagamento: " + err.message);
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-16">
          <Link to="/dashboard" className="bg-slate-900 border border-slate-800 hover:bg-slate-800 px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2 order-2 md:order-1">
            <i className="fa-solid fa-arrow-left"></i> Dashboard
          </Link>
          <div className="text-center md:text-right order-1 md:order-2">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Escolha seu Poder ⚡</h1>
            <p className="text-slate-400 mt-2 font-medium">Recarregue seus créditos com segurança via Mercado Pago.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`
                bg-slate-900 border p-8 md:p-10 rounded-[40px] flex flex-col relative overflow-hidden transition-all duration-300 hover:translate-y-[-8px]
                ${plan.highlight ? 'border-green-500/50 shadow-[0_20px_50px_rgba(34,197,94,0.1)]' : 'border-slate-800'}
              `}
            >
              {plan.highlight && (
                <div className="absolute top-6 right-6 bg-green-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                  {plan.highlight}
                </div>
              )}

              <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">{plan.description}</p>

              <div className="mb-8">
                <span className="text-5xl font-black">R${plan.price.toFixed(2)}</span>
                <span className="text-slate-500 font-bold ml-2">/único</span>
              </div>

              <div className="space-y-4 mb-10">
                <div className="flex items-center gap-3 font-bold text-sm">
                  <i className="fa-solid fa-check text-green-500"></i>
                  {plan.credits} Créditos de Geração
                </div>
                <div className="flex items-center gap-3 font-bold text-sm">
                  <i className="fa-solid fa-check text-green-500"></i>
                  Acesso Vitalício aos Clipes
                </div>
                <div className="flex items-center gap-3 font-bold text-sm">
                  <i className="fa-solid fa-check text-green-500"></i>
                  Processamento em 4K (Se original)
                </div>
              </div>

              <button
                onClick={() => handlePurchase(plan)}
                disabled={loadingPlanId !== null}
                className={`
                  mt-auto w-full font-black py-5 rounded-[24px] transition-all active:scale-95 flex items-center justify-center gap-2
                  ${plan.highlight ? 'bg-green-500 text-slate-950 hover:bg-green-400' : 'bg-white text-slate-950 hover:bg-slate-200'}
                  disabled:opacity-50
                `}
              >
                {loadingPlanId === plan.id ? (
                  <i className="fa-solid fa-circle-notch animate-spin text-xl"></i>
                ) : (
                  <>
                    <i className="fa-solid fa-shield-check text-xl"></i>
                    OBTER AGORA
                  </>
                )}
              </button>
              <p className="text-[10px] text-center mt-4 text-slate-600 font-bold uppercase tracking-widest">
                Pagamento Seguro via Mercado Pago
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
