
import React from 'react';
import { Link } from 'react-router-dom';
import { PLANS } from '../constants.ts';

const PlansPage: React.FC = () => {
  const WHATSAPP_LINKS: Record<string, string> = {
    'CLASSIC': 'https://api.whatsapp.com/send/?phone=5571981574664&text=Bom+dia%2C+Boa+tarde%2C+Boa+noite.+Quero+o+Plano+Classico+de+R$10.00&type=phone_number&app_absent=0',
    'MEDIUM': 'https://api.whatsapp.com/send/?phone=5571981574664&text=Bom+dia%2C+Boa+tarde%2C+Boa+noite.+Quero+o+Plano+Medio+de+R$20.00&type=phone_number&app_absent=0',
    'PROFESSIONAL': 'https://api.whatsapp.com/send/?phone=5571981574664&text=Bom+dia%2C+Boa+tarde%2C+Boa+noite.+Quero+o+Plano+Profissional+de+R$30.00&type=phone_number&app_absent=0'
  };

  const handleWhatsAppRedirect = (planId: string) => {
    const link = WHATSAPP_LINKS[planId];
    if (link) {
      window.open(link, '_blank');
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
             <p className="text-slate-400 mt-2 font-medium">Multiplique seu alcance em tempo recorde.</p>
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
                  Processamento Prioritário
                </div>
                <div className="flex items-center gap-3 font-bold text-sm">
                  <i className="fa-solid fa-check text-green-500"></i>
                  Legendas Premium AI
                </div>
              </div>

              <button 
                onClick={() => handleWhatsAppRedirect(plan.id)}
                className={`
                  mt-auto w-full font-black py-5 rounded-[24px] transition-all active:scale-95 flex items-center justify-center gap-2
                  ${plan.highlight ? 'bg-green-500 text-slate-950 hover:bg-green-400' : 'bg-white text-slate-950 hover:bg-slate-200'}
                `}
              >
                <i className="fa-brands fa-whatsapp text-xl"></i>
                OBTER AGORA
              </button>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center bg-slate-900/50 border border-slate-800/50 rounded-[40px] p-10 max-w-4xl mx-auto">
          <h4 className="text-xl font-black mb-4 italic">Por que investir?</h4>
          <p className="text-slate-400 text-sm leading-relaxed">
            Cada geração custa apenas 10 créditos. Com o plano profissional, você consegue criar 300 clipes virais. 
            Se apenas 1 clipe viralizar, seu investimento já se pagou centenas de vezes. 
            <strong> O tempo é seu ativo mais precioso. Automatize-o com Bizerra Clipes.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
