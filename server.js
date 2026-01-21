
const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// MOTOR BIZERRA V5.0 - MINIMALIST PRO (ONLY SUBTITLES - SIZE 13)
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

app.use('/temp', express.static(TEMP_DIR));

// Função de quebra de linha otimizada para legendas de rodapé (máx 35 caracteres por linha para fonte 13)
function wrapSubtitle(text, maxChars = 35) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = "";

    words.forEach(word => {
        if ((currentLine + word).length <= maxChars) {
            currentLine += (currentLine ? " " : "") + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    });
    lines.push(currentLine);
    // Escapa para o FFmpeg - Substitui ":" por "\:" e "'" por "'"
    return lines.join('\n').replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:');
}

// Hooks convertidos em legendas dinâmicas (serão exibidas no rodapé)
const CAPTIONS = [
    "A sabedoria começa no momento que você decide ouvir.",
    "O sucesso é a soma de pequenos esforços repetidos diariamente.",
    "Mude seus hábitos e você mudará o seu destino agora.",
    "A disciplina é a ponte entre seus objetivos e conquistas.",
    "Não espere por oportunidades, crie cada uma delas.",
    "O conhecimento só tem valor quando é colocado em prática.",
    "O fracasso é apenas uma oportunidade de começar de novo.",
    "Foque no processo e o resultado virá naturalmente.",
    "Sua mente é sua ferramenta mais poderosa para o enriquecimento.",
    "A consistência vence o talento em qualquer dia da semana."
];

const generateHandler = async (req, res) => {
    const { videoUrl, userId, settings } = req.body;
    if (!videoUrl) return res.status(400).json({ error: "URL necessária" });

    const sessionID = Date.now();
    const inputPath = path.join(TEMP_DIR, `source_${sessionID}.mp4`);
    console.log(`[JOB] Motor V5.0 - Subtitles Only - Font 13`);

    try {
        let minDur = 61, maxDur = 90;
        if (settings?.durationRange) {
            const parts = settings.durationRange.split('-').map(Number);
            minDur = parts[0];
            maxDur = parts[1] || parts[0];
        }

        let spoofArgs = [
            '--no-check-certificates',
            '--geo-bypass',
            '--format-sort "res:480,ext:mp4:m4a"',
            '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"'
        ];

        if (fs.existsSync(COOKIES_PATH)) spoofArgs.push(`--cookies "${COOKIES_PATH}"`);

        const downloadCmd = `yt-dlp -f "bestvideo[height<=480]+bestaudio/best" ${spoofArgs.join(' ')} --merge-output-format mp4 "${videoUrl}" -o "${inputPath}"`;

        exec(downloadCmd, (error) => {
            if (error) return res.status(500).json({ error: "YouTube bloqueou o acesso. Use cookies.txt." });

            try {
                const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
                const totalVideoDuration = parseFloat(durationInfo);
                const clips = [];

                for (let i = 0; i < 10; i++) {
                    let finalDuration = Math.floor(Math.random() * (maxDur - minDur + 1) + minDur);
                    let startSec = Math.min(i * (totalVideoDuration / 11), totalVideoDuration - finalDuration);
                    
                    const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                    const clipName = `clip_v50_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const rawText = CAPTIONS[i % CAPTIONS.length];
                    const wrappedSubtitle = wrapSubtitle(rawText, 32); 
                    const color = settings?.subtitleStyle?.color || 'white';
                    
                    // FILTRO V5.0: SEM TEXTO NO MEIO. Legenda apenas no rodapé (y=h-80), tamanho 13 fixo.
                    // box=0 para remover o fundo preto e usar apenas shadow/outline profissional.
                    const complexFilter = `[0:v]scale=w='if(gt(a,9/16),-1,540)':h='if(gt(a,9/16),960,-1)',crop=540:960,setsar=1,drawtext=text='${wrappedSubtitle}':fontcolor=${color}:fontsize=13:x=(w-text_w)/2:y=h-120:shadowcolor=black@0.8:shadowx=2:shadowy=2:line_spacing=4[v]`;
                    
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 24 -c:a aac -b:a 128k -y "${outputPath}"`;
                    
                    try {
                        execSync(cutCmd, { stdio: 'ignore' });
                        clips.push({
                            id: `clip-${sessionID}-${i}`,
                            title: `Corte Viral ${i+1}`,
                            videoUrl: `/temp/${clipName}`,
                            thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                            duration: finalDuration.toString()
                        });
                    } catch (e) { continue; }
                }

                res.json({ status: "success", clips });
                setTimeout(() => { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }, 180000);
            } catch (err) { res.status(500).json({ error: "Erro FFmpeg." }); }
        });
    } catch (e) { res.status(500).json({ error: "Erro Motor V5.0." }); }
};

app.post('/api/generate-real-clips', generateHandler);
app.get('/health', (req, res) => res.json({ status: "ready", model: "V5.0-Subtitle-Only" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Motor V5.0 ONLINE - Somente Legendas (13px)`));
