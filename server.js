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

// Configuração do Pool com timeout para evitar travamentos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const initDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("⚠️ DATABASE_URL ausente. Rodando sem persistência de DB.");
      return;
    }
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
    console.log("✅ Banco de Dados Pronto.");
  } catch (err) {
    console.error("❌ Erro ao conectar no DB do Railway:", err.message);
  }
};
initDB();

app.use(cors());
app.use(express.json());

const DIST_PATH = path.join(__dirname, 'dist');
app.use(express.static(DIST_PATH));

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
app.use('/temp', express.static(TEMP_DIR));

app.get('/health', (req, res) => res.json({ status: "ok", memory: process.memoryUsage().rss }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    cb(null, `upload-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 500 } });

async function getVideoDuration(filePath) {
  try {
    const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
    return parseFloat(stdout) || 0;
  } catch (e) {
    return 0;
  }
}

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
  const jobID = `job_${Date.now()}`;
  const userId = req.body.userId;
  const TOTAL_CLIPS = 10;

  if (!req.file) return res.status(400).json({ error: "Vídeo não recebido." });

  try {
    await pool.query(
      'INSERT INTO jobs (id, user_id, status, progress, current_clip, total_clips, clips) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [jobID, userId, 'analyzing', 0, 0, TOTAL_CLIPS, JSON.stringify([])]
    );

    res.json({ jobId: jobID });

    // Worker Process
    (async () => {
      const inputPath = req.file.path;
      const generatedClips = [];

      try {
        const actualDuration = await getVideoDuration(inputPath);
        if (actualDuration <= 0) throw new Error("Erro ao ler o vídeo.");

        let sStart = Math.max(0, parseInt(req.body.startTime) || 0);
        let sEnd = Math.min(actualDuration, parseInt(req.body.endTime) || actualDuration);
        let clipLen = Math.min(59, Math.max(15, parseInt(req.body.clipDuration) || 15));

        const range = sEnd - sStart;
        const step = range > clipLen ? (range - clipLen) / (TOTAL_CLIPS - 1 || 1) : 0;

        for (let i = 0; i < TOTAL_CLIPS; i++) {
          const outPath = path.join(TEMP_DIR, `clip_${jobID}_${i}.mp4`);
          const startAt = Math.min(sStart + (i * step), actualDuration - clipLen);

          // CRITICAL RAILWAY OPTIMIZATION:
          // -threads 1: Evita que o FFmpeg use toda a CPU e o Railway mate o processo.
          // -preset ultrafast: Minimiza o tempo de CPU por clipe.
          // -crf 28: Balanço entre qualidade e velocidade de processamento.
          const ffmpegCmd = `ffmpeg -y -ss ${startAt} -t ${clipLen} -i "${inputPath}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset ultrafast -crf 28 -threads 1 -c:a aac -b:a 128k "${outPath}"`;

          await execPromise(ffmpegCmd, { timeout: 300000 }); // 5 min timeout

          generatedClips.push({
            id: `${jobID}_${i}`,
            title: `Clip Viral #${i + 1}`,
            videoUrl: `/temp/clip_${jobID}_${i}.mp4`,
            thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400",
            duration: clipLen.toString()
          });

          const prog = Math.round(((i + 1) / TOTAL_CLIPS) * 100);
          await pool.query(
            'UPDATE jobs SET progress = $1, current_clip = $2, clips = $3, status = $4 WHERE id = $5',
            [prog, i + 1, JSON.stringify(generatedClips), 'processing', jobID]
          );
        }

        await pool.query('UPDATE jobs SET status = $1, progress = 100 WHERE id = $2', ['completed', jobID]);

      } catch (err) {
        console.error("Erro no Worker:", err.message);
        await pool.query('UPDATE jobs SET status = $1 WHERE id = $2', ['error', jobID]);
      } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      }
    })();

  } catch (e) {
    res.status(500).json({ error: "Falha ao iniciar motor." });
  }
});

// Outras rotas permanecem iguais...
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
  } catch (e) { res.status(500).json({ error: "Email já cadastrado." }); }
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

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Motor Online: Porta ${PORT}`));