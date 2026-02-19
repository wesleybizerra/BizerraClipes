import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import util from 'util';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 8080;

// Configuração Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Inicialização do Banco de Dados
const initDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn("⚠️ DATABASE_URL não encontrada. O modo persistente não funcionará.");
      return;
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        credits INTEGER DEFAULT 70,
        role TEXT DEFAULT 'USER',
        plan TEXT DEFAULT 'FREE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        status TEXT,
        progress INTEGER,
        current_clip INTEGER,
        total_clips INTEGER,
        clips JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      INSERT INTO users (id, name, email, password, credits, role, plan)
      VALUES ('admin-1', 'Admin Bizerra', 'wesleybizerra@hotmail.com', '123', 9999, 'ADMIN', 'PROFESSIONAL')
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log("✅ Banco de Dados PostgreSQL Pronto!");
  } catch (err) {
    console.error("❌ Erro ao iniciar banco:", err.message);
  }
};
initDB();

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do Frontend (Vite Build)
const DIST_PATH = path.join(__dirname, 'dist');
app.use(express.static(DIST_PATH));

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
app.use('/temp', express.static(TEMP_DIR));

// API Health
app.get('/health', (req, res) => res.json({ status: "ok", ffmpeg: true }));

// Mercado Pago
const mpClient = process.env.MP_ACCESS_TOKEN
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  : null;

app.post('/api/create-preference', async (req, res) => {
  if (!mpClient) return res.status(500).json({ error: "Mercado Pago não configurado." });
  try {
    const { planName, price, userId } = req.body;
    const preference = await new Preference(mpClient).create({
      body: {
        items: [{ title: planName, quantity: 1, unit_price: Number(price), currency_id: 'BRL' }],
        back_urls: {
          success: `${req.headers.origin}/#/dashboard?payment=success&user=${userId}`,
          failure: `${req.headers.origin}/#/dashboard?payment=failure`
        },
        auto_return: 'approved',
      }
    });
    res.json({ init_point: preference.init_point });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    const check = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) return res.status(400).json({ error: "E-mail já cadastrado." });
    const id = `user-${Date.now()}`;
    const result = await pool.query(
      'INSERT INTO users (id, name, email, password, credits, role, plan) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id, name, email, password, 70, 'USER', 'FREE']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id/credits', async (req, res) => {
  try {
    const { amount } = req.body;
    const result = await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING *', [amount, req.params.id]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Configuração do Multer com preservação de extensão
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
  const jobID = `job_${Date.now()}`;
  const userId = req.body.userId;
  if (!req.file) return res.status(400).json({ error: "Nenhum vídeo enviado." });

  try {
    await pool.query(
      'INSERT INTO jobs (id, user_id, status, progress, current_clip, total_clips, clips) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [jobID, userId, 'processing', 10, 1, 1, JSON.stringify([])]
    );
    res.json({ jobId: jobID });

    (async () => {
      try {
        const outName = `clip_${jobID}.mp4`;
        const outPath = path.join(TEMP_DIR, outName);

        console.log(`🎬 Iniciando FFmpeg para arquivo: ${req.file.path}`);

        // Comando FFmpeg com mais logs de erro e compatibilidade
        const ffmpegCmd = `ffmpeg -i "${req.file.path}" -t 15 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset ultrafast -y "${outPath}"`;

        await execPromise(ffmpegCmd);

        const clips = [{
          id: jobID,
          title: `Corte Viral ${jobID.slice(-4)}`,
          videoUrl: `/temp/${outName}`,
          thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
          duration: "15"
        }];

        await pool.query(
          'UPDATE jobs SET status = $1, progress = $2, clips = $3 WHERE id = $4',
          ['completed', 100, JSON.stringify(clips), jobID]
        );

        // Limpeza
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.log(`✅ Job ${jobID} concluído com sucesso!`);

      } catch (e) {
        console.error("❌ ERRO FFMPEG:", e.stderr || e.message);
        await pool.query('UPDATE jobs SET status = $1, progress = $2 WHERE id = $3', ['error', 0, jobID]);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      }
    })();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ status: 'not_found' });
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Rota SPA para o React
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(DIST_PATH, 'index.html'))) {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  } else {
    res.status(404).send("Frontend não encontrado. Execute 'npm run build' primeiro.");
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Motor Bizerra V10 Unificado na porta ${PORT}`);
});