import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import util from 'util';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

const initDB = async () => {
  try {
    if (!process.env.DATABASE_URL) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        credits INTEGER DEFAULT 70, role TEXT DEFAULT 'USER', plan TEXT DEFAULT 'FREE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, user_id TEXT, status TEXT, progress INTEGER,
        current_clip INTEGER, total_clips INTEGER, clips JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Banco de Dados e Tabelas Prontas!");
  } catch (err) { console.error("❌ Erro DB Inicialização:", err.message); }
};
initDB();

app.use(cors());
app.use(express.json());

const DIST_PATH = path.join(__dirname, 'dist');
app.use(express.static(DIST_PATH));

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
app.use('/temp', express.static(TEMP_DIR));

app.get('/health', (req, res) => res.json({ status: "ok", engine: "V10-Bizerra-UltraRobust" }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 800 * 1024 * 1024 } });

// Função para pegar duração real do vídeo
async function getVideoDuration(filePath) {
  try {
    const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
    return parseFloat(stdout);
  } catch (e) {
    console.error("Erro ffprobe:", e);
    return 0;
  }
}

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
  const jobID = `job_${Date.now()}`;
  const userId = req.body.userId;
  const TOTAL_CLIPS_TARGET = 10;

  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

  try {
    await pool.query(
      'INSERT INTO jobs (id, user_id, status, progress, current_clip, total_clips, clips) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [jobID, userId, 'analyzing', 0, 0, TOTAL_CLIPS_TARGET, JSON.stringify([])]
    );
    res.json({ jobId: jobID });

    // Processamento em Background
    (async () => {
      const inputPath = req.file.path;
      const generatedClips = [];

      try {
        const actualDuration = await getVideoDuration(inputPath);
        console.log(`🎬 Vídeo Recebido. Duração Real: ${actualDuration}s`);

        if (actualDuration <= 0) throw new Error("Não foi possível ler a duração do vídeo.");

        let customStart = Math.max(0, parseInt(req.body.startTime) || 0);
        let customEnd = Math.min(actualDuration, parseInt(req.body.endTime) || actualDuration);

        // Se o usuário selecionou um range menor que o necessário para 10 clips de 15s
        // o sistema ajusta o tempo de cada clipe para caber.
        const rangeDuration = customEnd - customStart;
        const clipDuration = Math.min(15, rangeDuration / TOTAL_CLIPS_TARGET);
        const intervalStep = rangeDuration / TOTAL_CLIPS_TARGET;

        console.log(`⚙️ Config: Start=${customStart}, End=${customEnd}, Step=${intervalStep}s, ClipLen=${clipDuration}s`);

        await pool.query('UPDATE jobs SET status = $1 WHERE id = $2', ['processing', jobID]);

        for (let i = 0; i < TOTAL_CLIPS_TARGET; i++) {
          const clipID = `${jobID}_${i}`;
          const outName = `clip_${clipID}.mp4`;
          const outPath = path.join(TEMP_DIR, outName);

          // Garante que o start não ultrapasse o fim do vídeo
          const startTime = Math.min(customStart + (i * intervalStep), actualDuration - clipDuration);

          console.log(`⏳ Gerando Clipe ${i + 1}/10 em ${startTime.toFixed(2)}s...`);

          // Comando otimizado para Railway (mais rápido e gasta menos CPU)
          const ffmpegCmd = `ffmpeg -ss ${startTime} -t ${clipDuration} -i "${inputPath}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset superfast -crf 28 -c:a aac -b:a 64k -y "${outPath}"`;

          await execPromise(ffmpegCmd, { timeout: 60000 }); // 60s timeout por clipe

          generatedClips.push({
            id: clipID,
            title: `Viral Clip #${i + 1} (${Math.floor(startTime)}s)`,
            videoUrl: `/temp/${outName}`,
            thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
            duration: Math.floor(clipDuration).toString()
          });

          const progressPercent = Math.round(((i + 1) / TOTAL_CLIPS_TARGET) * 100);
          await pool.query(
            'UPDATE jobs SET progress = $1, current_clip = $2, clips = $3 WHERE id = $4',
            [progressPercent, i + 1, JSON.stringify(generatedClips), jobID]
          );
        }

        await pool.query('UPDATE jobs SET status = $1, progress = 100 WHERE id = $2', ['completed', jobID]);
        console.log(`✅ Pack Finalizado com Sucesso para o Job ${jobID}`);

      } catch (e) {
        console.error(`❌ Erro Processamento Job ${jobID}:`, e.message);
        await pool.query('UPDATE jobs SET status = $1 WHERE id = $2', ['error', jobID]);
      } finally {
        if (fs.existsSync(inputPath)) {
          try { fs.unlinkSync(inputPath); } catch (err) { console.error("Erro ao deletar original:", err); }
        }
      }
    })();
  } catch (e) {
    console.error("Erro API principal:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    if (password && user.password !== password) return res.status(401).json({ error: "Senha incorreta." });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const id = `user-${Date.now()}`;
    const result = await pool.query(
      'INSERT INTO users (id, name, email, password, credits, role, plan) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id, name, email, password, 70, 'USER', 'FREE']
    );
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: "Email já cadastrado." });
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users', async (req, res) => {
  const r = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  res.json(r.rows);
});

app.put('/api/users/:id/credits', async (req, res) => {
  const r = await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING *', [req.body.amount, req.params.id]);
  res.json(r.rows[0]);
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    res.json(r.rows[0] || { status: 'not_found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(DIST_PATH, 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Motor V10-Ultra Robust rodando na porta ${PORT}`));