
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import { Clip } from '../types';

const ClipGenerator: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [jobProgress, setJobProgress] = useState({ percent: 0, current: 0, total: 10, status: '' });
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return alert("Selecione um vídeo.");
    if (user.credits < 10) return navigate('/planos');

    setIsProcessing(true);
    setJobProgress({ percent: 0, current: 0, total: 10, status: 'IA Invocando Neurônios...' });

    try {
      const generated = await api.generateClips(user.id, selectedFile, (job) => {
        let statusMsg = '';
        switch (job.status) {
          case 'analyzing': statusMsg = 'Gemini analisando ganchos virais...'; break;
          case 'processing': statusMsg = `Renderizando clipe ${job.currentClip} de ${job.totalClips}...`; break;
          default: statusMsg = 'Finalizando Pack...';
        }
        setJobProgress({
          percent: job.progress,
          current: job.currentClip,
          total: job.totalClips,
          status: statusMsg
        });
      });

      setClips(generated);
      refreshUser();
    } catch (err: any) {
      alert("Erro no Motor: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="relative w-full max-w-sm aspect-[9/16] bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <video src={selectedVideo} className="w-full h-full object-cover" controls autoPlay crossOrigin="anonymous" />
            <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 bg-white/10 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md">
              <i className="fa-solid fa-xmark"></i>
            </button>
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

      <main className="flex-grow p-6 md:p-10 md:ml-72">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-black tracking-tight mb-2">Novo Projeto Viral</h1>
            <div className="flex items-center gap-3">
              <span className="bg-purple-500/10 text-purple-400 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-purple-500/20">Gemini AI Detection</span>
              <span className="bg-green-500/10 text-green-400 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-green-500/20">V10 Motor Active</span>
            </div>
          </header>

          {!isProcessing && clips.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all ${selectedFile ? 'border-green-500 bg-green-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950'}`}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
                <i className={`fa-solid ${selectedFile ? 'fa-circle-check text-green-500' : 'fa-cloud-arrow-up text-slate-700'} text-5xl mb-4`}></i>
                <p className="text-lg font-bold text-slate-400">{selectedFile ? selectedFile.name : 'Clique para subir seu vídeo original'}</p>
                <p className="text-xs text-slate-600 mt-2">MP4, MOV ou AVI (Máx 500MB)</p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedFile}
                className="w-full mt-8 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:hover:bg-green-500 text-slate-950 font-black text-xl py-6 rounded-3xl transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                GERAR 10 CLIPES INTELIGENTES
              </button>
              <p className="text-center mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Custo: 10 Créditos • Tempo médio: 2 min</p>
            </div>
          )}

          {isProcessing && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-12 text-center animate-pulse">
              <div className="relative w-40 h-40 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black">{jobProgress.percent}%</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{jobProgress.current}/10</span>
                </div>
              </div>
              <h2 className="text-2xl font-black mb-2 tracking-tighter uppercase">{jobProgress.status}</h2>
              <p className="text-slate-500 max-w-xs mx-auto text-sm">Nossa IA está trabalhando pesado para encontrar os melhores momentos. Não feche esta página.</p>
            </div>
          )}

          {clips.length > 0 && (
            <div className="animate-in zoom-in duration-500">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-green-500 uppercase italic tracking-tighter">Pack de Viralização Gerado!</h2>
                <button onClick={() => { setClips([]); setSelectedFile(null); setIsProcessing(false); }} className="text-xs font-bold text-slate-500 hover:text-white underline">Novo vídeo</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {clips.map(clip => (
                  <div key={clip.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-green-500 transition-all">
                    <div className="aspect-[9/16] relative bg-black">
                      <img src={clip.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform" />
                      <button onClick={() => setSelectedVideo(clip.videoUrl)} className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-white text-slate-950 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <i className="fa-solid fa-play ml-1"></i>
                        </div>
                      </button>
                    </div>
                    <div className="p-3">
                      <a href={clip.videoUrl} download className="block w-full text-center bg-slate-950 py-2 rounded-lg text-[10px] font-black hover:bg-green-500 hover:text-slate-950 transition-colors">BAIXAR MP4</a>
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
