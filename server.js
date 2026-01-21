
const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// MOTOR BIZERRA V4.5 - PRECISION UI (FONTE 13 + AUTO-WRAP)
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

app.use('/temp', express.static(TEMP_DIR));

// Função para quebrar o texto em linhas para caber no vídeo 540px com fonte 13
function wrapText(text, maxChars = 25) {
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
    // Escapa caracteres especiais para o FFmpeg
    return lines.join('\n').replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:');
}

const VIRAL_HOOKS = [
    "VOCÊ NÃO VAI ACREDITAR NO QUE ACONTECEU HOJE! 😱",
    "ESTE SEGREDO VAI MUDAR SUA VIDA FINANCEIRA 🤫",
    "PARE TUDO O QUE ESTÁ FAZENDO E ASSISTA! 🔥",
    "O MINDSET EXATO DOS MAIORES CAMPEÕES 🧠",
    "O MOMENTO QUE MUDOU MINHA CARREIRA... ⏳",
    "A PURA VERDADE QUE NINGUÉM TE CONTA 📣",
    "ASSISTA ATÉ O FINAL, VALE CADA SEGUNDO! 💎",
    "VOCÊ JÁ SABIA DISSO? DEIXE SEU COMENTÁRIO 🤔",
    "O CONSELHO QUE VALE MAIS DE 1 MILHÃO 🚀",
    "MOMENTO EMOCIONANTE: VEJA A REAÇÃO DELE 🥺"
];

const generateHandler = async (req, res) => {
    const { videoUrl, userId, settings } = req.body;
    if (!videoUrl) return res.status(400).json({ error: "URL necessária" });

    const sessionID = Date.now();
    const inputPath = path.join(TEMP_DIR, `source_${sessionID}.mp4`);
    console.log(`[JOB] Motor V4.5 iniciado para ${userId} - FONT 13`);

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
            if (error) return res.status(500).json({ error: "Bloqueio do YouTube. Verifique seu cookies.txt" });

            try {
                const durationInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString().trim();
                const totalVideoDuration = parseFloat(durationInfo);
                const clips = [];

                for (let i = 0; i < 10; i++) {
                    let finalDuration = Math.floor(Math.random() * (maxDur - minDur + 1) + minDur);
                    let startSec = Math.min(i * (totalVideoDuration / 10), totalVideoDuration - finalDuration);
                    
                    const timestamp = new Date(startSec * 1000).toISOString().substr(11, 8);
                    const clipName = `clip_v45_${sessionID}_${i}.mp4`;
                    const outputPath = path.join(TEMP_DIR, clipName);
                    
                    const rawHook = VIRAL_HOOKS[i % VIRAL_HOOKS.length];
                    const wrappedHook = wrapText(rawHook, 22); // Garante que caiba no 540px
                    const color = settings?.subtitleStyle?.color || 'yellow';
                    
                    // FILTRO V4.5: Fonte 13 com quebra de linha (fix_bounds=1) e centralização perfeita
                    const complexFilter = `[0:v]scale=w='if(gt(a,9/16),-1,540)':h='if(gt(a,9/16),960,-1)',crop=540:960,setsar=1,drawtext=text='${wrappedHook}':fontcolor=${color}:fontsize=13:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.6:boxborderw=10:borderw=1:bordercolor=black:line_spacing=5[v]`;
                    
                    const cutCmd = `ffmpeg -ss ${timestamp} -i "${inputPath}" -t ${finalDuration} -filter_complex "${complexFilter}" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -crf 26 -c:a aac -y "${outputPath}"`;
                    
                    try {
                        execSync(cutCmd, { stdio: 'ignore' });
                        clips.push({
                            id: `clip-${sessionID}-${i}`,
                            title: rawHook,
                            videoUrl: `/temp/${clipName}`,
                            thumbnail: `https://picsum.photos/seed/${sessionID + i}/400/700`,
                            duration: finalDuration.toString()
                        });
                    } catch (e) { continue; }
                }

                res.json({ status: "success", clips });
                setTimeout(() => { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }, 120000);
            } catch (err) { res.status(500).json({ error: "Erro no processamento FFmpeg." }); }
        });
    } catch (e) { res.status(500).json({ error: "Falha no motor V4.5." }); }
};

app.post('/api/generate-real-clips', generateHandler);
app.get('/health', (req, res) => res.json({ status: "ok", engine: "V4.5-Precision" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Motor V4.5 (Fonte 13) Rodando na porta ${PORT}`));
