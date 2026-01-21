
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import { Clip, GenerationSettings } from '../types';

const ClipGenerator: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [videoInput, setVideoInput] = useState('');
  const [duration, setDuration] = useState<GenerationSettings['durationRange']>('61-90');
  const [subtitleColor, setSubtitleColor] = useState('yellow');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [status, setStatus] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!user) return null;

  const durationOptions: { label: string; value: GenerationSettings['durationRange'] }[] = [
    { label: '61 a 90s', value: '61-90' },
    { label: '90 a 120s', value: '90-120' },
    { label: '120 a 150s', value: '120-150' },
    { label: '150 a 180s', value: '150-180' },
    { label: '60 a 180s (Misto)', value: '60-180' },
  ];

  const handleGenerate = async () => {
    if (!videoInput) return alert("Insira um link do YouTube");
    if (!videoInput.includes('youtube.com') && !videoInput.includes('youtu.be')) {
        return alert("Por favor, insira um link válido do YouTube.");
    }
    if (user.credits < 10) return navigate('/planos');

    setIsProcessing(true);
    setStatus('Iniciando Motor V4.0...');
    
    try {
      const statuses = [
        'Ativando Anti-Block V4.0...',
        'Injetando Cookies de Autenticação...',
        'Simulando Tráfego Residencial...',
        'Extraindo vídeo do YouTube...',
        'Reduzindo Legendas para Tamanho 13...',
        'Processando cortes virais...',
        'Codificando UltraFast MP4...',
        'Finalizando pack de 10 clipes...'
      ];

      let statusIdx = 0;
      const interval = setInterval(() => {
        if (statusIdx < statuses.length) {
          setStatus(statuses[statusIdx]);
          statusIdx++;
        }
      }, 8000); 

      const generated = await api.generateClips(user.id, videoInput, {
        durationRange: duration,
        subtitleStyle: { color: subtitleColor, size: 'small', hasShadow: true }
      });
      
      clearInterval(interval);
      setClips(generated);
      refreshUser();
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  const downloadClip = (clip: Clip) => {
    const a = document.createElement('a');
    a.href = clip.videoUrl;
    a.download = `${clip.title.replace(/\s+/g, '_')}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white relative">
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="relative w-full max-w-md aspect-[9/16] bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedVideo(null)} className="absolute top-6 right-6 z-10 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
            <video src={selectedVideo} className="w-full h-full object-cover" controls autoPlay />
          </div>
        </div>
      )}

      <aside className="fixed h-full z-40 bg-slate-900 border-r border-slate-800 p-6 flex flex-col w-72 hidden md:flex">
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
          <Link to="/galeria" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition font-medium">
            <i className="fa-solid fa-layer-group w-5"></i> Galeria
          </Link>
        </nav>
      </aside>

      <main className="flex-grow p-6 md:p-10 transition-all duration-300 md:ml-72">
        <div className="max-w-6xl mx-auto">
          <header className="mb-10">
            <div className="flex items-center gap-4">
               <h1 className="text-3xl md:text-5xl font-black tracking-tight">Motor V4.0 (Pro)</h1>
               <span className="bg-green-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase">Anti-Block</span>
            </div>
            <p className="text-slate-500 mt-2 font-medium">Processamento blindado contra bloqueios do YouTube.</p>
          </header>

          {!isProcessing && clips.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 max-w-4xl mx-auto shadow-2xl">
              <div className="space-y-8">
                <div>
                  <label className="block text-xl font-black mb-4 flex items-center gap-2">
                    <i className="fa-brands fa-youtube text-red-500 text-2xl"></i>
                    URL do Vídeo
                  </label>
                  <input 
                    type="text"
                    placeholder="Cole o link do YouTube aqui..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-6 focus:ring-2 focus:ring-green-500/50 outline-none transition text-lg font-medium"
                    value={videoInput}
                    onChange={e => setVideoInput(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Duração do Corte</label>
                    <div className="grid grid-cols-2 gap-2">
                      {durationOptions.slice(0, 4).map(opt => (
                        <button 
                          key={opt.value} 
                          onClick={() => setDuration(opt.value)} 
                          className={`py-3 rounded-xl border text-[11px] font-black transition-all ${duration === opt.value ? 'bg-green-500 text-slate-950 border-green-500' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Estilo das Legendas (Font 13)</label>
                    <div className="flex gap-3">
                      {['yellow', 'cyan', 'white', '#ff0055'].map(c => (
                        <button 
                          key={c} 
                          onClick={() => setSubtitleColor(c)} 
                          className={`w-10 h-10 rounded-xl border-2 transition-all ${subtitleColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`} 
                          style={{ backgroundColor: c }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button onClick={handleGenerate} className="w-full bg-green-500 text-slate-950 font-black text-2xl py-7 rounded-3xl hover:bg-green-400 transition-all shadow-2xl shadow-green-500/30 flex items-center justify-center gap-4 group">
                    <i className="fa-solid fa-shield-halved group-hover:rotate-12 transition-transform"></i>
                    GERAR AGORA (BLINDADO)
                  </button>
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-in fade-in duration-500">
              <div className="relative mb-12 scale-125">
                <div className="w-24 h-24 border-[8px] border-slate-800 border-t-green-500 rounded-full animate-spin"></div>
                <i className="fa-solid fa-bolt text-green-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl animate-pulse"></i>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">{status}</h2>
              <p className="text-slate-500 max-w-md mx-auto font-medium">O motor V4.0 está usando sessões autenticadas para garantir que o YouTube não bloqueie seu processo.</p>
            </div>
          )}

          {clips.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-in zoom-in duration-500">
              {clips.map((clip, idx) => (
                <div key={clip.id} className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden group hover:border-green-500/40 transition-all">
                  <div className="aspect-[9/16] relative bg-black">
                    <img src={clip.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40 backdrop-blur-[2px]">
                       <button onClick={() => setSelectedVideo(clip.videoUrl)} className="w-16 h-16 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition">
                         <i className="fa-solid fa-play ml-1"></i>
                       </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-[11px] font-bold text-white mb-4 line-clamp-2 leading-tight uppercase tracking-tight">{clip.title}</h3>
                    <button onClick={() => downloadClip(clip)} className="w-full bg-slate-950 hover:bg-green-500 hover:text-slate-950 text-white font-black py-4 rounded-2xl transition text-[10px] border border-slate-800 uppercase flex items-center justify-center gap-2">
                      <i className="fa-solid fa-cloud-arrow-down text-sm"></i> BAIXAR MP4
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClipGenerator;
