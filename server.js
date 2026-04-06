import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import util from 'util';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração Mercado Pago
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-492724431718525-022021-93664879685968596859-12345678'
});
const mpPreference = new Preference(mpClient);

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
        last_reward_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, user_id TEXT, status TEXT, progress INTEGER,
        current_clip INTEGER, total_clips INTEGER, clips JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migração: Adicionar coluna last_reward_at se não existir
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_reward_at') THEN 
          ALTER TABLE users ADD COLUMN last_reward_at TIMESTAMP; 
        END IF; 
      END $$;
    `);

    // Inserir ou atualizar o usuário administrador solicitado
    const adminEmail = 'wesleybizerra@hotmail.com';
    const adminPassword = 'Cadernorox@27';
    const adminName = 'Wesley Bizerra';
    const adminRole = 'ADMIN';
    const adminPlan = 'PROFESSIONAL';
    const adminCredits = 10000;

    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    if (checkUser.rows.length === 0) {
      const adminId = `user-admin-${Date.now()}`;
      await pool.query(
        'INSERT INTO users (id, name, email, password, credits, role, plan) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [adminId, adminName, adminEmail, adminPassword, adminCredits, adminRole, adminPlan]
      );
      console.log(`✅ Usuário Admin ${adminEmail} criado.`);
    } else {
      await pool.query(
        'UPDATE users SET password = $1, role = $2, plan = $3, credits = $4 WHERE email = $5',
        [adminPassword, adminRole, adminPlan, adminCredits, adminEmail]
      );
      console.log(`✅ Usuário Admin ${adminEmail} atualizado.`);
    }

    console.log("✅ Banco de Dados Pronto.");
  } catch (err) { 
    console.error("❌ Erro ao conectar no DB do Railway:", err.message);
  }
};
initDB();

app.use(cors());
app.use(express.json());

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

// API Routes
app.post('/api/generate-real-clips', upload.single('video'), async (req, res) => {
    const jobID = `job_${Date.now()}`;
    const userId = req.body.userId;
    const youtubeUrl = req.body.youtubeUrl;
    const TOTAL_CLIPS = 10;

    if (!req.file && !youtubeUrl) return res.status(400).json({ error: "Vídeo ou URL não recebidos." });

    try {
        await pool.query(
            'INSERT INTO jobs (id, user_id, status, progress, current_clip, total_clips, clips) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [jobID, userId, 'analyzing', 0, 0, TOTAL_CLIPS, JSON.stringify([])]
        );
        
        res.json({ jobId: jobID });

        // Worker Process
        (async () => {
            let inputPath = req.file ? req.file.path : path.join(TEMP_DIR, `input_${jobID}.mp4`);
            const generatedClips = [];
            
            try {
                if (youtubeUrl) {
                    console.log(`[YT-DLP] Baixando: ${youtubeUrl}`);
                    // Baixar vídeo do YouTube
                    const downloadCmd = `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]/best[height<=720]" --merge-output-format mp4 --no-check-certificates "${youtubeUrl}" -o "${inputPath}"`;
                    await execPromise(downloadCmd, { timeout: 600000 }); // 10 min timeout
                }

                const actualDuration = await getVideoDuration(inputPath);
                if (actualDuration <= 0) throw new Error("Erro ao ler o vídeo ou vídeo muito curto.");

                let sStart = Math.max(0, parseInt(req.body.startTime) || 0);
                let sEnd = Math.min(actualDuration, parseInt(req.body.endTime) || actualDuration);
                let clipLen = Math.min(59, Math.max(15, parseInt(req.body.clipDuration) || 15));

                const range = sEnd - sStart;
                const step = range > (clipLen * TOTAL_CLIPS) ? (range - clipLen) / (TOTAL_CLIPS - 1 || 1) : clipLen;

                for (let i = 0; i < TOTAL_CLIPS; i++) {
                    const outPath = path.join(TEMP_DIR, `clip_${jobID}_${i}.mp4`);
                    const startAt = Math.min(sStart + (i * step), actualDuration - clipLen);
                    
                    // Comando FFmpeg otimizado para vertical (9:16)
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
                // Se foi download do YT ou upload, limpamos o original após processar
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }
        })();

    } catch (e) { 
        console.error("Erro ao iniciar job:", e);
        res.status(500).json({ error: "Falha ao iniciar motor." }); 
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

app.post('/api/users/:id/daily-reward', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Buscar usuário
        const userRes = await pool.query('SELECT credits, last_reward_at FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
        
        const user = userRes.rows[0];
        const now = new Date();
        
        // Ajuste para Horário de Brasília (UTC-3)
        // 08:00 AM Brasília = 11:00 AM UTC
        const getBrasiliaTime = (date) => {
            return new Date(date.getTime() + (date.getTimezoneOffset() * 60000) - (3 * 3600000));
        };

        const nowBR = getBrasiliaTime(now);
        const lastRewardBR = user.last_reward_at ? getBrasiliaTime(new Date(user.last_reward_at)) : null;

        // Calcular o início do ciclo de recompensa atual (08h de hoje ou ontem)
        const currentThreshold = new Date(nowBR);
        currentThreshold.setHours(8, 0, 0, 0);
        
        if (nowBR < currentThreshold) {
            // Se ainda não deu 08h hoje, o ciclo começou às 08h de ontem
            currentThreshold.setDate(currentThreshold.getDate() - 1);
        }

        if (lastRewardBR && lastRewardBR >= currentThreshold) {
            return res.status(400).json({ 
                error: "Recompensa já coletada hoje!",
                nextAvailable: new Date(currentThreshold.getTime() + 24 * 3600000 + (3 * 3600000)) // Próximo 08h em UTC
            });
        }

        // Atualizar créditos e data da recompensa
        const updateRes = await pool.query(
            'UPDATE users SET credits = credits + 50, last_reward_at = $1 WHERE id = $2 RETURNING *',
            [now.toISOString(), userId]
        );

        res.json({ 
            message: "Recompensa de 50 créditos coletada!", 
            user: updateRes.rows[0] 
        });

    } catch (e) {
        console.error("Erro recompensa diária:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/jobs/:id', async (req, res) => {
    const r = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    res.json(r.rows[0] || { status: 'not_found' });
});

app.post('/api/create-preference', async (req, res) => {
    try {
        const { userId, planId, planName, price } = req.body;
        
        // No Railway, req.headers.origin deve ser a URL pública
        const origin = req.headers.origin || `https://${req.headers.host}`;

        const body = {
            items: [
                {
                    id: planId,
                    title: `Bizerra Clipes - Plano ${planName}`,
                    quantity: 1,
                    unit_price: Number(price),
                    currency_id: 'BRL'
                }
            ],
            back_urls: {
                success: `${origin}/dashboard?payment=success`,
                failure: `${origin}/dashboard?payment=failure`,
                pending: `${origin}/dashboard?payment=pending`
            },
            auto_return: 'approved',
            metadata: {
                userId: userId,
                planId: planId
            },
            notification_url: `${origin}/api/webhooks/mercadopago`
        };

        const response = await mpPreference.create({ body });
        res.json({ init_point: response.init_point });
    } catch (e) {
        console.error("Erro MP:", e);
        res.status(500).json({ error: "Erro ao criar preferência de pagamento." });
    }
});

app.post('/api/webhooks/mercadopago', async (req, res) => {
    console.log("Webhook recebido:", req.body);
    res.sendStatus(200);
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const DIST_PATH = path.join(__dirname, 'dist');
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => res.sendFile(path.join(DIST_PATH, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Motor Online: Porta ${PORT}`));
