const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors({ origin: '*' }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.use('/temp', express.static(TEMP_DIR));

app.get('/health', (req, res) => {
    res.json({ status: "online", engine: "V2-LEGENDAS-PREMIUM" });
});

// Lista de Hooks Persuasivos e Emocionais para legendar os clipes
const VIRAL_HOOKS = [
    "ISSO VAI MUDAR SUA VIDA 😱",
    "VOCÊ NÃO VAI ACREDITAR...",
    "O SEGREDO QUE NÃO TE CONTAM 🤫",
    "ASSISTA ATÉ O FINAL ⏳",
    "ISSO FOI GENIAL! 🔥",
    "A PURA VERDADE SOBRE ISSO",
    "O MOMENTO MAIS IMPACTANTE",
    "VOCÊ PRECISA OUVIR ISSO 📣",
    "O CONSELHO DE 1 MILHÃO 💎",
    "NINGUÉM ESPERAVA POR ISSO",
    "FOI POR ISSO QUE ELE FEZ ISSO",
    "A MELHOR PARTE ESTÁ AQUI",
    "REVELEI O SEGREDO 🔓",
    "PARE TUDO E VEJA ISSO",
    "A REALIDADE DÓI, MAS É ISSO",
    "CONVENCIDO DO CONTRÁRIO?",
    "A EMOÇÃO TOMOU CONTA 🥺",
    "VOCÊ JÁ SABIA DISSO? 🤔",
    "NUNCA MAIS FAÇA ISSO!",
    "O TOPO É LOGO ALI 🚀"
];

const generateHandler = async (req, res) => {
    const { videoUrl, userId, settings } = req.body;
    
    if (!videoUrl) return res.status(400).json({ error: "URL é necessária" });

    const sessionID = Date.now();
    const inputPath = path.join(TEMP_DIR, `source_${sessionID}.mp4`);
    
    try {
        let clipDuration = 70; 
        if (settings && settings.durationRange) {
            const [min, max] = settings.durationRange.split('-').map(Number);
            clipDuration = Math.floor((min + max) / 2);
        }

        const ytDlpBaseCmd = `yt-dlp --no-check-certificates --no-playlist --user-agent "Mozilla/5.0"`;

        exec(`${ytDlpBaseCmd} --get-duration "${videoUrl}"`, (infoErr) => {
            if (infoErr) return res.status(500).json({ error: "Vídeo indisponível." });

            const downloadCmd = `${ytDlpBaseCmd} -f "bestvideo[height<=480]+bestaudio/best[height<=480]" --merge-output-format mp4 "${videoUrl}" -o "${inputPath}"`;

            exec(downloadCmd, (error) => {
                if (error) return res.status(500).json({ error: "Falha ao baixar vídeo." });

                try {
                    const clips = [];
                    const numberOfClips = 20;

                    for (let i = 0; i < numberOfClips; i++) {
                        const startSec = i * 25; 
                        const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                        const clipName = `clip_v2_${sessionID}_${i}.mp4`;
                        const outputPath = path.join(TEMP_DIR, clipName);
                        
                        const hook = VIRAL_HOOKS[i % VIRAL_HOOKS.length];
                        const color = settings?.subtitleStyle?.color || 'yellow';
                        
                        // COMANDO FFMPEG AVANÇADO:
                        // 1. Crop para 9:16 (Vertical)
                        // 2. Scale para 720x1280
                        // 3. Adiciona Legenda Persuasiva (Hook) no meio do vídeo com caixa de sombra
                        // 4. Aumenta saturação e contraste (Visual Chamativo)
                        const complexFilter = `[0:v]crop=ih*9/16:ih,scale=720:1280,eq=brightness=0.03:saturation=1.3:contrast=1.1,drawtext=text='${hook}':fontcolor=${color}:fontsize=45:x=(w-text_w)/2:y=(h-text_h)/2-100:box=1:boxcolor=black@0.6:boxborderw=15:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf[v]`;
                        
                        // Nota: Se rodar localmente e não tiver essa fonte, remova o fontfile. 
                        // No Railway Linux geralmente dejavu está presente.
                        
                        const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${clipDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a -c:v libx264 -preset superfast -crf 28 -c:a aac -y "${outputPath}"`;
                        
                        execSync(cutCmd);
                        
                        clips.push({
                            id: `clip-${sessionID}-${i}`,
                            title: hook,
                            videoUrl: `/temp/${clipName}`,
                            thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                            duration: clipDuration.toString(),
                            startTime: startSec,
                            endTime: startSec + clipDuration
                        });
                    }

                    res.json({ status: "success", clips });
                    setTimeout(() => { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }, 600000);

                } catch (err) {
                    console.error("[ERRO RENDER]:", err);
                    res.status(500).json({ error: "Erro na renderização das legendas." });
                }
            });
        });
    } catch (e) {
        res.status(500).json({ error: "Erro inesperado." });
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.post('/generate-real-clips', generateHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Motor V2 com Legendas Ativo na porta ${PORT}`);
});
