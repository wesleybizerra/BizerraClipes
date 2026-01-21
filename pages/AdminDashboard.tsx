
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types.ts';
import { api } from '../services/api.ts';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const data = await api.getAllUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateCredits = async (userId: string) => {
    const amount = parseInt(creditInputs[userId]);
    if (isNaN(amount) || amount === 0) return alert("Insira um valor válido (positivo ou negativo)");
    
    try {
      await api.updateUserCredits(userId, amount);
      alert(`Sucesso! ${amount} créditos processados para a conta.`);
      setCreditInputs(prev => ({ ...prev, [userId]: '' }));
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-10">
       <div className="max-w-7xl mx-auto">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
           <div>
             <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
               <i className="fa-solid fa-user-shield text-purple-500"></i>
               Painel Administrativo
             </h1>
             <p className="text-slate-400 mt-1">Gerencie usuários e saldos de créditos do sistema.</p>
           </div>
           <Link to="/dashboard" className="w-full md:w-auto bg-slate-900 border border-slate-800 hover:bg-slate-800 px-6 py-3 rounded-2xl font-bold transition flex items-center justify-center gap-2">
             <i className="fa-solid fa-house"></i>
             Voltar ao Dashboard
           </Link>
         </div>

         <div className="bg-slate-900 rounded-[32px] border border-slate-800 overflow-hidden shadow-2xl">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-widest font-bold">
                   <th className="px-6 py-5">Usuário / E-mail</th>
                   <th className="px-6 py-5">Saldo Atual</th>
                   <th className="px-6 py-5 text-right">Gestão de Créditos</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {loading ? (
                   <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-500">Carregando usuários...</td></tr>
                 ) : users.map(u => (
                   <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                     <td className="px-6 py-5">
                       <div className="font-bold text-white group-hover:text-purple-400 transition-colors">{u.name}</div>
                       <div className="text-sm text-slate-500">{u.email}</div>
                     </td>
                     <td className="px-6 py-5">
                       <span className="bg-green-500/10 text-green-500 px-4 py-1.5 rounded-full text-sm font-black border border-green-500/20 shadow-sm">
                         {u.credits} <span className="text-[10px] ml-1">CRÉDITOS</span>
                       </span>
                     </td>
                     <td className="px-6 py-5">
                       <div className="flex justify-end items-center gap-3">
                         <div className="relative">
                            <input 
                              type="number" 
                              placeholder="Ex: 100"
                              className="w-28 md:w-32 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                              value={creditInputs[u.id] || ''}
                              onChange={(e) => setCreditInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                            />
                         </div>
                         <button 
                           onClick={() => handleUpdateCredits(u.id)}
                           className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-purple-500/20 whitespace-nowrap"
                         >
                           Adicionar
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
         
         <div className="mt-8 text-center text-slate-500 text-sm">
            <i className="fa-solid fa-circle-info mr-2"></i>
            Valores negativos no campo de créditos subtraem o saldo do usuário.
         </div>
       </div>
    </div>
  );
};

export default AdminDashboard;
