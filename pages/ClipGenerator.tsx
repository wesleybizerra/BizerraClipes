
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import { Clip, GenerationSettings } from '../types';

const ClipGenerator: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<GenerationSettings['durationRange']>('61-180');
  const [subtitleColor, setSubtitleColor] = useState('white');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [status, setStatus] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  if (!user) return null;

  const durationOptions: { label: string; value: GenerationSettings['durationRange'] }[] = [
    { label: '61 a 90s', value: '61-90' },
    { label: '90 a 120s', value: '90-120' },
    { label: '120 a 150s', value: '120-150' },
    { label: '150 a 180s', value: '150-180' },
    { label: '61 a 180s (Pro)', value: '61-180' },
    { label: 'Misto', value: '60-180' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 300 * 1024 * 1024) {
        alert("Vídeo muito pesado! Limite de 300MB para vídeos de 3 minutos.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return alert("Selecione um vídeo para enviar");
    if (user.credits < 10) return navigate('/planos');

    setIsProcessing(true);
    setStatus('Iniciando Motor V7.0 (10 Clipes)...');
    
    try {
      const statuses = [
        'Enviando arquivo para processamento Pro...',
        'Motor V7.0: Analisando padrões de fala...',
        'Gerando 10 variações de cortes...',
        'Aplicando Legendas Fonte 13 (High Precision)...',
        'Renderizando clipe 1 a 5...',
        'Renderizando clipe 6 a 10...',
        'Limpando camadas de vídeo para visual clean...',
        'Finalizando pack de 10 clipes...'
      ];

      let statusIdx = 0;
      const interval = setInterval(() => {
        if (statusIdx < statuses.length) {
          setStatus(statuses[statusIdx]);
          statusIdx++;
        }
      }, 15000); 

      const generated = await api.generateClips(user.id, selectedFile, {
        durationRange: duration,
        subtitleStyle: { color: subtitleColor, size: 'small', hasShadow: true }
      });
      
      clearInterval(interval);
      setClips(generated);
      refreshUser();
    } catch (err: any) {
      alert("Erro na produção: " + err.message);
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
            <h1 className="text-3xl md:text-5xl font-black tracking-tight flex items-center gap-3">
               Motor V7.0 <span className="bg-green-500 text-slate-950 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">10 Clipes Ativado</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium italic">Legendas Tamanho 13 • Duração até 180s • Zero Textos Fixos</p>
          </header>

          {!isProcessing && clips.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 max-w-4xl mx-auto shadow-2xl">
              <div className="space-y-8">
                <div>
                  <label className="block text-xl font-black mb-4 flex items-center gap-2">Vídeo Base para 10 Cortes</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      w-full border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all
                      ${selectedFile ? 'border-green-500 bg-green-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950'}
                    `}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
                    <i className={`fa-solid ${selectedFile ? 'fa-check-circle text-green-500' : 'fa-film text-slate-700'} text-5xl mb-4`}></i>
                    <p className={`text-lg font-bold ${selectedFile ? 'text-white' : 'text-slate-500'}`}>
                      {selectedFile ? selectedFile.name : 'Escolha o arquivo para os 10 clipes'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Tempo de cada clipe</label>
                    <div className="grid grid-cols-2 gap-2">
                      {durationOptions.map(opt => (
                        <button 
                          key={opt.value} 
                          onClick={() => setDuration(opt.value)} 
                          className={`py-3 rounded-xl border text-[11px] font-black transition-all ${duration === opt.value ? 'bg-green-500 text-slate-950 border-green-500' : 'bg-slate-950 text-slate-500 border-slate-800'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Cor das Letras (13px)</label>
                    <div className="flex gap-3">
                      {['white', 'yellow', '#4ade80', '#ff00ff'].map(c => (
                        <button 
                          key={c} 
                          onClick={() => setSubtitleColor(c)} 
                          className={`w-10 h-10 rounded-xl border-2 transition-all ${subtitleColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40'}`} 
                          style={{ backgroundColor: c }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button onClick={handleGenerate} className="w-full bg-green-500 text-slate-950 font-black text-2xl py-7 rounded-3xl hover:bg-green-400 transition-all shadow-2xl flex items-center justify-center gap-4">
                    <i className="fa-solid fa-bolt-lightning"></i>
                    GERAR 10 CLIPES PRO
                  </button>
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="w-24 h-24 border-[8px] border-slate-800 border-t-green-500 rounded-full animate-spin mb-8"></div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">{status}</h2>
              <p className="text-slate-500 font-medium max-w-md">Gerar 10 clipes de até 180s é uma tarefa pesada. Isso levará alguns minutos. Relaxe, nós avisaremos quando terminar.</p>
            </div>
          )}

          {clips.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-green-500">RESULTADO: 10 CLIPES GERADOS</h2>
                <button onClick={() => setClips([])} className="text-slate-500 hover:text-white font-bold text-xs uppercase tracking-widest">Novo Upload</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {clips.map((clip) => (
                  <div key={clip.id} className="bg-slate-900 border border-slate-800 rounded-[24px] overflow-hidden group hover:border-green-500 transition-all">
                    <div className="aspect-[9/16] relative bg-black">
                      <img src={clip.thumbnail} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <button onClick={() => setSelectedVideo(clip.videoUrl)} className="w-12 h-12 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-2xl">
                           <i className="fa-solid fa-play"></i>
                         </button>
                      </div>
                      <div className="absolute top-3 left-3 bg-green-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded italic">
                        {clip.duration}s
                      </div>
                    </div>
                    <div className="p-3">
                      <button onClick={() => {
                          const a = document.createElement('a');
                          a.href = clip.videoUrl;
                          a.download = `bizerra_pro_${clip.id}.mp4`;
                          a.click();
                      }} className="w-full bg-slate-950 hover:bg-green-500 hover:text-slate-950 text-white font-black py-2.5 rounded-xl transition text-[9px] border border-slate-800 uppercase">
                        Download
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
