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
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const wakeUpServer = async () => {
      const isOnline = await api.checkHealth();
      setServerStatus(isOnline ? 'online' : 'offline');
    };
    wakeUpServer();
  }, []);

  if (!user) return null;

  const handleGenerate = async () => {
    if (!videoInput) return alert("Insira um link do YouTube para começar");
    if (user.credits < 10) return navigate('/planos');

    setIsProcessing(true);
    setStatus('Iniciando Motor de Renderização V2...');
    
    try {
      const statuses = [
        'Baixando vídeo original...',
        'Aplicando Filtros de Cor Viral...',
        'Formatando para Vertical (9:16)...',
        'Injetando Legendas Persuasivas e Emocionais...',
        'Finalizando Renderização de Alta Performance...'
      ];

      let statusIdx = 0;
      const interval = setInterval(() => {
        if (statusIdx < statuses.length) {
          setStatus(statuses[statusIdx]);
          statusIdx++;
        }
      }, 10000); // Demora mais pois agora há re-encoding real

      const generated = await api.generateClips(user.id, videoInput, {
        durationRange: duration,
        subtitleStyle: { color: subtitleColor, size: 'large', hasShadow: true }
      });
      
      clearInterval(interval);
      setClips(generated);
      refreshUser();
    } catch (err: any) {
      alert(`ERRO: ${err.message}`);
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
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="relative w-full max-w-md aspect-[9/16] bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl">
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-6 right-6 z-10 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition"
            >
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
            <h1 className="text-3xl md:text-5xl font-black">Criador Viral Premium</h1>
            <p className="text-slate-500 mt-2 font-medium">Corte, Legenda e Formatação 9:16 Automática.</p>
          </header>

          {!isProcessing && clips.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
              <div className="space-y-8">
                <div>
                  <label className="block text-xl font-black mb-4">Link do Vídeo do YouTube</label>
                  <input 
                    type="text"
                    placeholder="https://youtube.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-6 focus:ring-2 focus:ring-green-500/50 outline-none transition text-lg"
                    value={videoInput}
                    onChange={e => setVideoInput(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-4 uppercase">Duração</label>
                    <div className="flex gap-2">
                      {['61-90', '91-120'].map(r => (
                        <button key={r} onClick={() => setDuration(r as any)} className={`flex-1 py-3 rounded-xl border font-bold text-xs ${duration === r ? 'bg-green-500 text-slate-950 border-green-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>{r}s</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-4 uppercase">Cor da Legenda</label>
                    <div className="flex gap-3">
                      {['yellow', 'white', 'cyan', 'lime'].map(c => (
                        <button 
                          key={c} 
                          onClick={() => setSubtitleColor(c)} 
                          className={`w-10 h-10 rounded-full border-2 ${subtitleColor === c ? 'border-white scale-110' : 'border-transparent opacity-50'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  className="w-full bg-green-500 text-slate-950 font-black text-xl py-6 rounded-2xl hover:bg-green-400 transition-all shadow-xl shadow-green-500/20 flex items-center justify-center gap-4"
                >
                  <i className="fa-solid fa-magic"></i>
                  GERAR 20 CLIPES LEGENDADOS
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="w-20 h-20 border-[6px] border-slate-800 border-t-green-500 rounded-full animate-spin mb-8"></div>
              <h2 className="text-3xl font-black text-green-500 mb-4">{status}</h2>
              <p className="text-slate-500">Estamos re-processando o vídeo com legendas premium. Isso leva cerca de 2 a 5 minutos.</p>
            </div>
          )}

          {clips.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-700">
              {clips.map((clip, idx) => (
                <div key={clip.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden group hover:border-green-500/40 transition-all">
                  <div className="aspect-[9/16] relative bg-black">
                    <img src={clip.thumbnail} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                       <button onClick={() => setSelectedVideo(clip.videoUrl)} className="w-14 h-14 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition">
                         <i className="fa-solid fa-play ml-1"></i>
                       </button>
                    </div>
                    <div className="absolute top-4 left-4 bg-green-500 text-slate-950 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">Viral #{idx + 1}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-xs font-bold text-slate-400 mb-3 line-clamp-1">{clip.title}</h3>
                    <button onClick={() => downloadClip(clip)} className="w-full bg-slate-950 hover:bg-green-500 hover:text-slate-950 text-white font-black py-3 rounded-xl transition text-[10px] border border-slate-800">
                      <i className="fa-solid fa-download mr-1"></i> BAIXAR MP4
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
