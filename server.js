
const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// MOTOR BIZERRA V5.1 - STABILITY & PRECISION (FONT 12 - RODAPÉ)
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

app.use('/temp', express.static(TEMP_DIR));

// Quebra de linha para legenda 12px (máximo 40 caracteres para não estourar 540px)
function wrapSubtitle(text, maxChars = 40) {
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
    return lines.join('\n').replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:');
}

// Banco de frases curtas para legendas profissionais (tamanho 12)
const CAPTIONS = [
    "A disciplina é a base de todo sucesso.",
    "O conhecimento aplicado gera riqueza real.",
    "O segredo está na consistência diária.",
    "Mude sua mentalidade para mudar sua vida.",
    "O fracasso é o combustível dos campeões.",
    "Foque no longo prazo, o resto é distração.",
    "Sua rotina define o seu futuro financeiro.",
    "Trabalhe enquanto eles dormem, estude enquanto festejam.",
    "Oportunidades não surgem, você as cria.",
    "Seja a sua melhor versão todos os dias."
];

const generateHandler = async (req, res) => {
    const { videoUrl, userId, settings } = req.body;
    if (!videoUrl) return res.status(400).json({ error: "URL necessária" });

    const sessionID = Date.now();
    const inputPath = path.join(TEMP_DIR, `source_${sessionID}.mp4`);
    
    console.log(`[JOB] Motor V5.1 iniciado - FONT 12 - USER: ${userId}`);

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
            '--format "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"',
            '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"'
        ];

        if (fs.existsSync(COOKIES_PATH)) spoofArgs.push(`--cookies "${COOKIES_PATH}"`);

        const downloadCmd = `yt-dlp ${spoofArgs.join(' ')} --merge-output-format mp4 "${videoUrl}" -o "${inputPath}"`;

        exec(downloadCmd, { timeout: 120000 }, (error) => {
            if (error) {
                console.error("[ERROR] Download falhou:", error);
                return res.status(500).json({ error: "Download falhou. Verifique o link ou cookies.txt." });
            }

            try {
                const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
                const totalVideoDuration = parseFloat(durationInfo);
                const clips = [];
                
                // Reduzido para 4 clipes por vez para evitar TIMEOUT do servidor/navegador
                const numClips = 4; 

                for (let i = 0; i < numClips; i++) {
                    let finalDuration = Math.floor(Math.random() * (maxDur - minDur + 1) + minDur);
                    let startSec = Math.floor(Math.random() * (totalVideoDuration - finalDuration));
                    
                    const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                    const clipName = `clip_v51_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const rawText = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
                    const wrappedSubtitle = wrapSubtitle(rawText, 35); 
                    const color = settings?.subtitleStyle?.color || 'white';
                    
                    // FILTRO V5.1: ZERO TEXTO CENTRAL. 
                    // Fonte 12 (exata), posição rodapé, sem caixa (box=0) para visual clean.
                    const complexFilter = `[0:v]scale=w=540:h=960:force_original_aspect_ratio=increase,crop=540:960,setsar=1,drawtext=text='${wrappedSubtitle}':fontcolor=${color}:fontsize=12:x=(w-text_w)/2:y=h-100:shadowcolor=black@0.9:shadowx=1:shadowy=1:line_spacing=4[v]`;
                    
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 96k -y "${outputPath}"`;
                    
                    try {
                        execSync(cutCmd, { timeout: 90000 });
                        clips.push({
                            id: `clip-${sessionID}-${i}`,
                            title: `Corte Viral ${i+1}`,
                            videoUrl: `/temp/${clipName}`,
                            thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                            duration: finalDuration.toString()
                        });
                    } catch (e) { 
                        console.error(`[ERROR] Falha no corte ${i}:`, e.message);
                        continue; 
                    }
                }

                if (clips.length === 0) throw new Error("Nenhum clipe pôde ser gerado.");

                res.json({ status: "success", clips });
                
                // Limpeza agendada
                setTimeout(() => { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }, 300000);
            } catch (err) { 
                console.error("[ERROR] Processamento FFmpeg:", err);
                res.status(500).json({ error: "O vídeo é muito pesado ou o servidor esgotou a memória." }); 
            }
        });
    } catch (e) { 
        console.error("[ERROR] Falha geral Motor V5.1:", e);
        res.status(500).json({ error: "Falha crítica no Motor V5.1." }); 
    }
};

app.post('/api/generate-real-clips', generateHandler);
app.get('/health', (req, res) => res.json({ status: "running", engine: "V5.1-Speed" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Motor V5.1 (Fonte 12) Online na porta ${PORT}`));
