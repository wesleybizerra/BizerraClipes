
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.tsx';
import { api } from '../services/api.ts';
import { Clip } from '../types.ts';

const ClipGallery: React.FC = () => {
    const { user } = useAuth();
    const [clips, setClips] = useState<Clip[]>([]);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const loadClips = async () => {
        if (!user) return;
        try {
            // Carrega clipes do usuário logado
            const data = await api.getClips(user.id);
            setClips(data);
        } catch (err) {
            console.error("Erro ao carregar galeria:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClips();
        // Simulando "tempo real" com um polling simples de 10 segundos
        const interval = setInterval(loadClips, 10000);
        return () => clearInterval(interval);
    }, [user]);

    if (!user) return null;

    const filteredClips = clips.filter(c =>
        c.title.toLowerCase().includes(filter.toLowerCase())
    );

    const downloadClip = (clip: Clip) => {
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
                    <Link to="/gerador" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition font-medium">
                        <i className="fa-solid fa-clapperboard w-5"></i> Gerar Clipes
                    </Link>
                    <Link to="/galeria" className="flex items-center gap-3 px-4 py-3 bg-green-500/10 text-green-500 rounded-xl font-bold">
                        <i className="fa-solid fa-layer-group w-5"></i> Galeria de Clipes
                    </Link>
                    <Link to="/planos" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition font-medium">
                        <i className="fa-solid fa-rocket w-5"></i> Planos
                    </Link>
                </nav>
                <div className="pt-6 border-t border-slate-800">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status do Motor</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-bold text-green-500">ONLINE</span>
                        </div>
                    </div>
                </div>
            </aside>

            <main className={`flex-grow p-6 md:p-10 transition-all duration-300 md:ml-72 ${mobileMenuOpen ? 'blur-md' : ''}`}>
                <div className="max-w-6xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl md:text-5xl font-black tracking-tighter">Minha Galeria</h1>
                                <span className="bg-green-500/10 text-green-500 text-[10px] font-black px-2 py-1 rounded border border-green-500/20 uppercase">Arquivos ativos por 20h</span>
                            </div>
                            <p className="text-slate-400">Todos os seus clipes gerados pela IA em um só lugar.</p>
                        </div>

                        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                                <input
                                    type="text"
                                    placeholder="Buscar clipe..."
                                    className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-green-500/50 outline-none transition text-sm"
                                    value={filter}
                                    onChange={e => setFilter(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={loadClips}
                                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 transition"
                                title="Atualizar"
                            >
                                <i className="fa-solid fa-rotate"></i>
                            </button>
                        </div>
                    </header>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center min-h-[40vh]">
                            <div className="w-12 h-12 border-4 border-slate-800 border-t-green-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500 font-bold">Sincronizando biblioteca...</p>
                        </div>
                    ) : clips.length === 0 ? (
                        <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-[40px] p-20 text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-600 text-3xl">
                                <i className="fa-solid fa-clapperboard"></i>
                            </div>
                            <h3 className="text-2xl font-black mb-2">Sua galeria está vazia</h3>
                            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Você ainda não gerou nenhum clipe viral. Comece agora mesmo usando nosso gerador de IA.</p>
                            <Link to="/gerador" className="bg-green-500 text-slate-950 px-10 py-4 rounded-2xl font-black hover:bg-green-400 transition-all inline-block">
                                IR PARA O GERADOR
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                            {filteredClips.map((clip) => (
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

                                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black border border-white/10 uppercase tracking-tighter">
                                            {clip.duration}s
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="font-black text-white text-sm mb-4 line-clamp-1">{clip.title}</h3>
                                        <button
                                            onClick={() => downloadClip(clip)}
                                            className="w-full bg-slate-950 hover:bg-green-500 hover:text-slate-950 text-white font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-800 hover:border-green-500 text-xs"
                                        >
                                            <i className="fa-solid fa-download"></i>
                                            BAIXAR MP4
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredClips.length > 0 && (
                        <p className="mt-12 text-center text-slate-600 text-xs font-medium">
                            Mostrando {filteredClips.length} de {clips.length} clipes gerados.
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ClipGallery;
