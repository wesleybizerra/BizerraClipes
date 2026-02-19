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

  const [rangeStart, setRangeStart] = useState<number>(0);
  const [rangeEnd, setRangeEnd] = useState<number>(600);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return alert("Por favor, selecione um arquivo de vídeo.");
    if (user.credits < 10) return navigate('/planos');
    if (rangeEnd <= rangeStart) return alert("O tempo final deve ser maior que o inicial.");

    setIsProcessing(true);
    setJobProgress({ percent: 0, current: 0, total: 10, status: 'Iniciando Motor...' });

    try {
      const generated = await api.generateClips(user.id, selectedFile, rangeStart, rangeEnd, (job) => {
        let statusMsg = job.status === 'processing'
          ? `Renderizando Clipe ${job.current_clip} de 10...`
          : 'Analisando vídeo e ganchos...';

        setJobProgress({
          percent: job.progress || 0,
          current: job.current_clip || 0,
          total: 10,
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

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
            <h1 className="text-4xl font-black tracking-tight mb-2 italic">LABORATÓRIO VIRAL</h1>
            <div className="flex items-center gap-3">
              <span className="bg-green-500 text-slate-950 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">Motor V10 Ativo</span>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Cortes de 15 segundos</span>
            </div>
          </header>

          {!isProcessing && clips.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all ${selectedFile ? 'border-green-500 bg-green-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950'}`}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
                <i className={`fa-solid ${selectedFile ? 'fa-circle-check text-green-500' : 'fa-film text-slate-700'} text-5xl mb-4`}></i>
                <p className="text-lg font-bold text-slate-400">{selectedFile ? selectedFile.name : 'Selecione o vídeo original para cortar'}</p>
              </div>

              {selectedFile && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-950 rounded-3xl border border-slate-800 animate-in zoom-in duration-300">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Início do Intervalo</label>
                      <span className="text-green-500 font-mono font-bold">{formatSeconds(rangeStart)}</span>
                    </div>
                    <input
                      type="range" min="0" max="3600" value={rangeStart}
                      onChange={(e) => setRangeStart(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fim do Intervalo</label>
                      <span className="text-green-500 font-mono font-bold">{formatSeconds(rangeEnd)}</span>
                    </div>
                    <input
                      type="range" min="0" max="3600" value={rangeEnd}
                      onChange={(e) => setRangeEnd(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-4 bg-green-500/5 p-4 rounded-2xl border border-green-500/10">
                    <i className="fa-solid fa-wand-magic-sparkles text-green-500"></i>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      O motor irá extrair automaticamente <span className="text-white font-bold">10 cortes estratégicos</span> entre os tempos selecionados.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!selectedFile}
                className="w-full mt-8 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:hover:bg-green-500 text-slate-950 font-black text-xl py-6 rounded-3xl transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                GERAR MEU PACK DE 10 CLIPES
              </button>
              <p className="text-center mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Custo: 10 Créditos • Processamento Real-Time</p>
            </div>
          )}

          {isProcessing && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-12 text-center animate-in zoom-in duration-300">
              <div className="relative w-48 h-48 mx-auto mb-10">
                <div className="absolute inset-0 border-[6px] border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-green-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black">{jobProgress.percent}%</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">{jobProgress.current} de 10</span>
                </div>
              </div>
              <h2 className="text-3xl font-black mb-3 tracking-tighter uppercase italic text-green-500">{jobProgress.status}</h2>
              <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">Nossa IA está recortando os melhores momentos. Isso pode levar alguns minutos dependendo do tamanho do vídeo.</p>
            </div>
          )}

          {clips.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex justify-between items-center mb-8 bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter">PACK GERADO COM SUCESSO! 🚀</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase">10 clipes prontos para suas redes sociais</p>
                </div>
                <button onClick={() => { setClips([]); setSelectedFile(null); setIsProcessing(false); }} className="bg-white text-slate-950 px-6 py-2 rounded-xl text-xs font-black hover:bg-slate-200 transition">NOVO PROJETO</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {clips.map((clip, idx) => (
                  <div key={clip.id} className="group bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden hover:border-green-500 transition-all shadow-xl">
                    <div className="aspect-[9/16] relative bg-black overflow-hidden">
                      <img src={clip.thumbnail} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-110 transition duration-500" />
                      <button onClick={() => setSelectedVideo(clip.videoUrl)} className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white text-slate-950 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-2xl">
                          <i className="fa-solid fa-play ml-1"></i>
                        </div>
                      </button>
                      <div className="absolute top-4 left-4 bg-green-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded">#{idx + 1}</div>
                    </div>
                    <div className="p-4 bg-slate-950">
                      <a href={clip.videoUrl} download className="block w-full text-center bg-slate-900 border border-slate-800 py-3 rounded-2xl text-[10px] font-black hover:bg-green-500 hover:text-slate-950 transition-all">BAIXAR CLIPE</a>
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