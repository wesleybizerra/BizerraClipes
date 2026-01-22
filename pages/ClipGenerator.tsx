
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import { Clip, GenerationSettings } from '../types';

const ClipGenerator: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [status, setStatus] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 500 * 1024 * 1024) {
        alert("O vídeo excede o limite de 500MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return alert("Selecione um arquivo de vídeo.");
    if (user.credits < 10) return navigate('/planos');

    setIsProcessing(true);
    setStatus('Iniciando Motor V9.0 Limpo...');
    
    try {
      const statuses = [
        'Enviando vídeo para o servidor...',
        'Motor V9.0: Escaneando cenas de impacto...',
        'Gerando 10 variações de cortes verticais...',
        'Renderizando Pack em Alta Qualidade...',
        'Removendo poluição visual...',
        'Finalizando seu projeto...'
      ];

      let statusIdx = 0;
      const interval = setInterval(() => {
        if (statusIdx < statuses.length) {
          setStatus(statuses[statusIdx]);
          statusIdx++;
        }
      }, 15000); 

      const generated = await api.generateClips(user.id, selectedFile, {
        durationRange: '61-180',
        subtitleStyle: { color: 'white', size: 'small', hasShadow: false }
      });
      
      clearInterval(interval);
      setClips(generated);
      refreshUser();
    } catch (err: any) {
      alert("Aviso: " + err.message);
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white relative">
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="relative w-full max-w-md aspect-[9/16] bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedVideo(null)} className="absolute top-6 right-6 z-10 bg-white/10 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md">
              <i className="fa-solid fa-xmark text-lg"></i>
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
            <h1 className="text-3xl md:text-5xl font-black tracking-tight flex items-center gap-3">
               Motor V9.0 <span className="bg-green-500 text-slate-950 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">CLEAN ENGINE</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Extração de 10 clipes verticais limpos, sem textos ou marcas d'água.</p>
          </header>

          {!isProcessing && clips.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 max-w-4xl mx-auto shadow-2xl">
              <div className="space-y-8 text-center">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      w-full border-2 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center cursor-pointer transition-all
                      ${selectedFile ? 'border-green-500 bg-green-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950'}
                    `}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
                    <i className={`fa-solid ${selectedFile ? 'fa-check-circle text-green-500' : 'fa-film text-slate-700'} text-6xl mb-6`}></i>
                    <p className={`text-xl font-bold ${selectedFile ? 'text-white' : 'text-slate-500'}`}>
                      {selectedFile ? selectedFile.name : 'Selecione seu Vídeo Original'}
                    </p>
                    <p className="text-slate-600 mt-2 text-sm font-medium">O motor gerará automaticamente 10 cortes limpos.</p>
                  </div>

                <div className="pt-4">
                  <button onClick={handleGenerate} className="w-full bg-green-500 text-slate-950 font-black text-2xl py-7 rounded-3xl hover:bg-green-400 transition-all shadow-2xl flex items-center justify-center gap-4">
                    <i className="fa-solid fa-bolt-lightning"></i>
                    GERAR OS 10 CLIPES LIMPOS
                  </button>
                  <p className="text-slate-500 mt-4 text-xs font-bold uppercase tracking-widest">Custo: 10 Créditos por Pack</p>
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
              <div className="w-24 h-24 border-[8px] border-slate-800 border-t-green-500 rounded-full animate-spin mb-8"></div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">{status}</h2>
              <p className="text-slate-500 font-medium max-w-md">Gerando clipes de alta fidelidade em 9:16. Mantenha esta aba aberta.</p>
            </div>
          )}

          {clips.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black text-green-500 uppercase tracking-tighter">Pack de 10 Clipes Finalizado</h2>
                <button onClick={() => { setClips([]); setSelectedFile(null); }} className="text-slate-500 hover:text-white font-bold text-xs uppercase underline">Novo Projeto</button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {clips.map((clip) => (
                  <div key={clip.id} className="bg-slate-900 border border-slate-800 rounded-[24px] overflow-hidden group hover:border-green-500 transition-all shadow-xl">
                    <div className="aspect-[9/16] relative bg-black">
                      <img src={clip.thumbnail} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <button onClick={() => setSelectedVideo(clip.videoUrl)} className="w-12 h-12 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-2xl">
                           <i className="fa-solid fa-play"></i>
                         </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <button onClick={() => {
                          const link = document.createElement('a');
                          link.href = clip.videoUrl;
                          link.download = `bizerra_clean_${clip.id}.mp4`;
                          link.click();
                      }} className="w-full bg-slate-950 hover:bg-green-500 hover:text-slate-950 text-white font-black py-2.5 rounded-xl transition text-[9px] border border-slate-800 uppercase tracking-widest">
                        Download MP4
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
