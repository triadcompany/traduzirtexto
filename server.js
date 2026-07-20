import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });
const distPath = path.join(__dirname, 'dist');

const app = express();
app.use(express.json({ limit: '2mb' }));

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.post('/api/translate', async (req, res) => {
  if (!openai) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
  }

  const { text, sourceLanguage, targetLanguage } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Texto vazio.' });
  }

  const prompt = `Traduza o texto a seguir de ${sourceLanguage} para ${targetLanguage}.

Regras obrigatórias:
- Forneça apenas a tradução direta, sem explicações, comentários ou texto extra.
- Preserve fielmente a pontuação original (vírgulas, pontos, interrogações, travessões, reticências).
- Se houver marcadores "***" no texto, copie-os exatamente como estão, sem traduzir, remover ou substituir por aspas ou qualquer outro símbolo.
- Não inclua as tags <texto> na resposta, apenas a tradução.

Texto a traduzir:
<texto>
${text}
</texto>`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) res.write(delta);
    }
    res.end();
  } catch (err) {
    console.error('Translation error:', err);
    if (!res.headersSent) {
      const status = err?.status === 429 ? 429 : 500;
      res.status(status).json({ error: err?.message || 'Falha ao traduzir o texto.' });
    } else {
      res.end();
    }
  }
});

app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
