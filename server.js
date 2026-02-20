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
    console.log("✅ Banco de Dados sincronizado.");
  } catch (err) { console.error("❌ Erro DB:", err.message); }
};
initDB();

app.use(cors());
app.use(express.json());

const DIST_PATH = path.join(__dirname, 'dist');
app.use(express.static(DIST_PATH));

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
app.use('/temp', express.static(TEMP_DIR));

app.get('/health', (req, res) => res.json({ status: "ok", engine: "V12-Bizerra-Nitro" }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 800 } });

async function getVideoDuration(filePath) {
  try {
    const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
    const duration = parseFloat(stdout);
    return isNaN(duration) ? 0 : duration;
  } catch (e) {
    console.error("ffprobe error:", e);
    return 0;
  }
}

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
  const jobID = `job_${Date.now()}`;
  const userId = req.body.userId;
  const TOTAL_CLIPS = 10;

  if (!req.file) return res.status(400).json({ error: "Arquivo não detectado." });

  try {
    await pool.query(
      'INSERT INTO jobs (id, user_id, status, progress, current_clip, total_clips, clips) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [jobID, userId, 'analyzing', 0, 0, TOTAL_CLIPS, JSON.stringify([])]
    );

    // Retorno imediato para evitar timeout de conexão HTTP
    res.json({ jobId: jobID });

    // Processamento Seguro em Background
    (async () => {
      const inputPath = req.file.path;
      const generatedClips = [];

      try {
        const actualDuration = await getVideoDuration(inputPath);
        if (actualDuration <= 0) throw new Error("Falha ao ler duração do vídeo.");

        let startTimeLimit = Math.max(0, parseInt(req.body.startTime) || 0);
        let endTimeLimit = Math.min(actualDuration, parseInt(req.body.endTime) || actualDuration);
        let targetDuration = Math.min(59, Math.max(15, parseInt(req.body.clipDuration) || 15));

        const range = endTimeLimit - startTimeLimit;
        // Cálculo de passo: distribui os 10 clipes dentro do range selecionado
        // Se o range for menor que 10 clipes, eles vão se sobrepor automaticamente
        const intervalStep = range > targetDuration ? (range - targetDuration) / (TOTAL_CLIPS - 1 || 1) : 0;

        console.log(`🚀 JOB ${jobID}: Range ${startTimeLimit}-${endTimeLimit}s | Clipe: ${targetDuration}s | Passo: ${intervalStep}s`);

        for (let i = 0; i < TOTAL_CLIPS; i++) {
          const clipID = `${jobID}_${i}`;
          const outName = `clip_${clipID}.mp4`;
          const outPath = path.join(TEMP_DIR, outName);

          const startAt = Math.min(startTimeLimit + (i * intervalStep), actualDuration - targetDuration);

          // IMPORTANTE: -ss ANTES de -i para Seek Ultra-Rápido
          const ffmpegCmd = `ffmpeg -y -ss ${startAt} -t ${targetDuration} -i "${inputPath}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset superfast -crf 27 -c:a aac -b:a 128k "${outPath}"`;

          await execPromise(ffmpegCmd, { timeout: 180000 }); // 3 min por clipe máx

          generatedClips.push({
            id: clipID,
            title: `Clipe Viral #${i + 1}`,
            videoUrl: `/temp/${outName}`,
            thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400",
            duration: targetDuration.toString()
          });

          const progress = Math.round(((i + 1) / TOTAL_CLIPS) * 100);
          await pool.query(
            'UPDATE jobs SET progress = $1, current_clip = $2, clips = $3, status = $4 WHERE id = $5',
            [progress, i + 1, JSON.stringify(generatedClips), 'processing', jobID]
          );
        }

        await pool.query('UPDATE jobs SET status = $1, progress = 100 WHERE id = $2', ['completed', jobID]);
        console.log(`✅ JOB ${jobID} COMPLETO.`);

      } catch (innerError) {
        console.error(`❌ ERRO NO MOTOR (Job ${jobID}):`, innerError.message);
        await pool.query('UPDATE jobs SET status = $1 WHERE id = $2', ['error', jobID]);
      } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      }
    })();

  } catch (e) {
    console.error("Erro na rota de geração:", e.message);
    res.status(500).json({ error: "Falha ao iniciar o motor de vídeo." });
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
  } catch (e) { res.status(500).json({ error: "E-mail já cadastrado." }); }
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
  const r = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
  res.json(r.rows[0] || { status: 'not_found' });
});

app.get('*', (req, res) => res.sendFile(path.join(DIST_PATH, 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Motor V12 Online na porta ${PORT}`));