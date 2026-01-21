const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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
    res.json({ status: "online", version: "2.1-SPEED-BOOST" });
});

const VIRAL_HOOKS = [
    "VOCÊ NÃO VAI ACREDITAR NO QUE ACONTECEU! 😱",
    "O SEGREDO REVELADO PARA VOCÊ 🤫",
    "PARE TUDO E ASSISTA ISSO AGORA! 🔥",
    "ISSO VAI MUDAR SUA FORMA DE PENSAR 🧠",
    "O MOMENTO QUE NINGUÉM ESPERAVA... ⏳",
    "A PURA VERDADE QUE ELES ESCONDEM 📣",
    "ASSISTA ATÉ O FINAL, VALE A PENA! 💎",
    "VOCÊ JÁ SABIA DISSO? COMENTE ABAIXO 🤔",
    "O CONSELHO QUE VALE 1 MILHÃO DE REAIS 🚀",
    "EMOCIONANTE: VEJA A REAÇÃO DELE 🥺"
];

const generateHandler = async (req, res) => {
    const { videoUrl, userId, settings } = req.body;
    
    if (!videoUrl) return res.status(400).json({ error: "URL é necessária" });

    const sessionID = Date.now();
    const inputPath = path.join(TEMP_DIR, `source_${sessionID}.mp4`);
    
    console.log(`[JOB] Iniciando geração para ${userId} - Vídeo: ${videoUrl}`);

    try {
        let clipDuration = 60; 
        if (settings && settings.durationRange) {
            const [min, max] = settings.durationRange.split('-').map(Number);
            clipDuration = min || 60;
        }

        // Baixa em 360p/480p para ser MUITO mais rápido e evitar timeouts
        const downloadCmd = `yt-dlp -f "bestvideo[height<=480]+bestaudio/best[height<=480]" --no-check-certificates --merge-output-format mp4 "${videoUrl}" -o "${inputPath}"`;

        console.log("[STEP 1] Baixando vídeo...");
        exec(downloadCmd, (error) => {
            if (error) {
                console.error("[ERROR] Download falhou:", error);
                return res.status(500).json({ error: "Falha ao baixar o vídeo do YouTube." });
            }

            console.log("[STEP 2] Download concluído. Iniciando renderização de 10 clipes...");
            
            try {
                const clips = [];
                const numberOfClips = 10; // Reduzido para garantir que responda a tempo

                for (let i = 0; i < numberOfClips; i++) {
                    const startSec = i * 40; // Espaçamento maior entre cortes
                    const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                    const clipName = `clip_v21_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const hook = VIRAL_HOOKS[i % VIRAL_HOOKS.length];
                    const color = settings?.subtitleStyle?.color || 'yellow';
                    
                    // Filtro otimizado: Vertical 9:16 + Cores + Legenda Centralizada
                    // Removido 'fontfile' específico para usar o padrão do sistema e evitar erros
                    const complexFilter = `[0:v]crop=ih*9/16:ih,scale=720:1280,eq=brightness=0.05:saturation=1.4:contrast=1.2,drawtext=text='${hook}':fontcolor=${color}:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.7:boxborderw=10[v]`;
                    
                    // preset=ultrafast e crf=32 para máxima velocidade
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${clipDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a -c:v libx264 -preset ultrafast -crf 32 -c:a aac -b:a 128k -y "${outputPath}"`;
                    
                    console.log(`[RENDER] Processando clipe ${i+1}/${numberOfClips}...`);
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

                console.log("[SUCCESS] Todos os clipes foram gerados!");
                res.json({ status: "success", clips });

                // Limpeza do arquivo original após 5 min
                setTimeout(() => { 
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
                    console.log(`[CLEANUP] Arquivo fonte ${sessionID} removido.`);
                }, 300000);

            } catch (err) {
                console.error("[ERRO RENDER]:", err);
                res.status(500).json({ error: "O servidor demorou muito para processar. Tente um vídeo mais curto." });
            }
        });
    } catch (e) {
        console.error("[CRITICAL]:", e);
        res.status(500).json({ error: "Erro crítico no servidor." });
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.post('/generate-real-clips', generateHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Motor de Alta Velocidade V2.1 Ativo na porta ${PORT}`);
});
