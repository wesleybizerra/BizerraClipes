
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.tsx';
import { api } from '../services/api.ts';
import { Clip, GenerationSettings } from '../types.ts';

const ClipGenerator: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [videoInput, setVideoInput] = useState('');
  const [duration, setDuration] = useState<GenerationSettings['durationRange']>('30-60');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [status, setStatus] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!user) return null;

  const handleGenerate = async () => {
    if (!videoInput) return alert("Insira um link do YouTube para começar");
    if (user.credits < 10) return navigate('/planos');

    setIsProcessing(true);
    setStatus('Iniciando processamento...');
    
    try {
      const statuses = [
        'Baixando vídeo do YouTube...',
        'IA analisando momentos de retenção...',
        'Identificando ganchos virais...',
        'Gerando legendas dinâmicas...',
        'Finalizando 20 cortes estratégicos...'
      ];

      for (const msg of statuses) {
        setStatus(msg);
        await new Promise(r => setTimeout(r, 1500));
      }

      const generated = await api.generateClips(user.id, videoInput, {
        durationRange: duration,
        subtitleStyle: { color: '#ffffff', size: 'large', hasShadow: true }
      });
      
      setClips(generated);
      refreshUser();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  const downloadClip = (clip: Clip) => {
    // Usando fetch para baixar o blob e forçar o download real
    fetch(clip.videoUrl)
      .then(resp => resp.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${clip.title.replace(/\s+/g, '_')}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(() => {
        // Fallback caso o fetch falhe por CORS em vídeos externos
        const link = document.createElement('a');
        link.href = clip.videoUrl;
        link.target = "_blank";
        link.download = `${clip.title}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white relative">
      {/* Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-[9/16] bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl">
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-6 right-6 z-10 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
            <video 
              src={selectedVideo} 
              className="w-full h-full object-cover" 
              controls 
              autoPlay
            />
          </div>
        </div>
      )}

      {/* Mobile Toggle */}
      <button 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-6 right-6 z-50 bg-green-500 text-slate-950 w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
      >
        <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
      </button>

      <aside className={`
        fixed h-full z-40 bg-slate-900 border-r border-slate-800 p-6 flex flex-col transition-all duration-300
        ${mobileMenuOpen ? 'left-0 w-full' : '-left-full w-72'} 
        md:left-0 md:w-72
      `}>
        <Link to="/" className="text-2xl font-black tracking-tighter flex items-center gap-2 mb-12">
          <i className="fa-solid fa-bolt text-green-500"></i>
          BIZERRA<span className="text-green-500"> CLIPES</span>
        </Link>
        <nav className="space-y-2 flex-grow">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition font-medium">
            <i className="fa-solid fa-house-chimney w-5"></i> Dashboard
          </Link>
          <Link to="/gerador" className="flex items-center gap-3 px-4 py-3 bg-green-500/10 text-green-500 rounded-xl font-bold">
            <i className="fa-solid fa-clapperboard w-5"></i> Gerar Clipes
          </Link>
          <Link to="/planos" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition font-medium">
            <i className="fa-solid fa-rocket w-5"></i> Planos
          </Link>
        </nav>
        <div className="pt-6 border-t border-slate-800">
           <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-xs text-slate-500 font-black uppercase">Saldo: {user.credits} Créditos</span>
            </div>
        </div>
      </aside>

      <main className={`flex-grow p-6 md:p-10 transition-all duration-300 md:ml-72 ${mobileMenuOpen ? 'blur-md' : ''}`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl md:text-5xl font-black">Gerador</h1>
            <Link to="/dashboard" className="hidden md:flex bg-slate-900 border border-slate-800 hover:bg-slate-800 px-6 py-2.5 rounded-xl font-bold transition items-center gap-2 text-sm">
              <i className="fa-solid fa-arrow-left"></i> Sair do Gerador
            </Link>
          </div>

          {!isProcessing && clips.length === 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 md:p-10">
                <label className="block text-xl font-black mb-6">1. Link do YouTube</label>
                <div className="flex flex-col gap-6">
                  <div className="relative group">
                    <i className="fa-brands fa-youtube absolute left-6 top-1/2 -translate-y-1/2 text-3xl text-red-600"></i>
                    <input 
                      type="text"
                      placeholder="Cole o link do vídeo aqui (ex: youtube.com/watch?v=...)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-16 pr-6 py-6 focus:ring-2 focus:ring-green-500/50 outline-none transition shadow-inner text-lg font-medium"
                      value={videoInput}
                      onChange={e => setVideoInput(e.target.value)}
                    />
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-2 px-2">
                    <i className="fa-solid fa-circle-info text-green-500"></i>
                    A IA analisará o vídeo e extrairá automaticamente os 20 melhores cortes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 md:p-10">
                  <label className="block text-xl font-black mb-6">2. Duração dos Cortes</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['30-60', '60-90', '90-120', '120-150', '150-180'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d as any)}
                        className={`px-3 py-4 rounded-xl font-black text-sm transition-all ${duration === d ? 'bg-green-500 text-slate-950 scale-105' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-600'}`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 md:p-10 flex flex-col justify-center gap-4">
                  <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-500"><i className="fa-solid fa-bolt"></i></div>
                    <div><p className="font-bold text-sm">Corte Automático</p><p className="text-xs text-slate-500">Extração de 20 cortes virais</p></div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500"><i className="fa-solid fa-closed-captioning"></i></div>
                    <div><p className="font-bold text-sm">Legendas Dinâmicas</p><p className="text-xs text-slate-500">Inclusas em todos os vídeos</p></div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                className="w-full bg-green-500 text-slate-950 font-black text-xl md:text-2xl py-6 rounded-[32px] hover:bg-green-400 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_rgba(34,197,94,0.3)] flex items-center justify-center gap-4 group"
              >
                <i className="fa-solid fa-wand-magic-sparkles group-hover:rotate-12 transition-transform"></i>
                GERAR 20 CORTES VIRAIS (10 CRÉDITOS)
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
              <div className="relative mb-10">
                <div className="w-32 h-32 border-8 border-slate-800 border-t-green-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center font-black text-green-500">IA</div>
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter uppercase">{status}</h2>
              <p className="text-slate-400 text-lg md:text-xl max-w-md mx-auto">Nossa IA está trabalhando pesado para criar os melhores cortes para você.</p>
            </div>
          )}

          {clips.length > 0 && (
            <div className="animate-in fade-in duration-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">Sua Fábrica de Virais 🚀</h2>
                <button 
                  onClick={() => {setClips([]); setVideoInput('');}}
                  className="bg-white text-slate-950 px-8 py-3 rounded-full font-black hover:bg-slate-200 transition-all active:scale-95 text-sm"
                >
                  NOVO VÍDEO
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clips.map((clip) => (
                  <div key={clip.id} className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden group hover:border-green-500/50 hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-300">
                    <div className="aspect-[9/16] relative bg-black overflow-hidden">
                      <img src={clip.thumbnail} alt={clip.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition duration-700" />
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 bg-black/40 backdrop-blur-[2px]">
                        <button 
                          onClick={() => setSelectedVideo(clip.videoUrl)}
                          className="w-16 h-16 bg-white text-slate-950 rounded-full text-2xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-transform"
                        >
                          <i className="fa-solid fa-play ml-1"></i>
                        </button>
                      </div>

                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black border border-white/10">
                        {clip.duration}s
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-black text-white text-base mb-5 line-clamp-1">{clip.title}</h3>
                      <button 
                        onClick={() => downloadClip(clip)}
                        className="w-full bg-slate-950 hover:bg-green-500 hover:text-slate-950 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-800 hover:border-green-500"
                      >
                        <i className="fa-solid fa-download"></i>
                        BAIXAR MP4
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClipGenerator;
