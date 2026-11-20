import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_VOICES = new Set(['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir']);
const DEFAULT_VOICE = 'Kore';
const DEFAULT_STYLE =
  'Gentle, soft-spoken, warm, and poised Malaysian Malay female emcee speaking calmly and respectfully at a formal school ceremony, with graceful pauses for the pantun stanza.';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw Object.assign(
      new Error('GEMINI_API_KEY belum ditetapkan di panel Settings > Secrets.'),
      { statusCode: 500 }
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        text?: unknown;
        voiceName?: unknown;
        stylePrompt?: unknown;
      };

      const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
      if (!rawText) {
        res.status(400).json({
          error: 'Sila masukkan teks ucapan atau pantun sebelum menjana suara.',
        });
        return;
      }

      if (rawText.length > 5000) {
        res.status(400).json({
          error: 'Teks terlalu panjang (had maksimum 5,000 aksara setiap janaan).',
        });
        return;
      }

      const requestedVoice =
        typeof body?.voiceName === 'string' ? body.voiceName.trim() : DEFAULT_VOICE;
      const voiceName = ALLOWED_VOICES.has(requestedVoice)
        ? requestedVoice
        : DEFAULT_VOICE;

      const stylePrompt =
        typeof body?.stylePrompt === 'string' && body.stylePrompt.trim().length > 0
          ? body.stylePrompt.trim().slice(0, 600)
          : DEFAULT_STYLE;

      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: rawText,
                speechMetadata: {
                  style: stylePrompt,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const audioPart = parts.find((part) => part.inlineData?.data);
      const base64Audio = audioPart?.inlineData?.data;
      const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';

      if (!base64Audio) {
        res.status(502).json({
          error:
            'Model TTS tidak memulangkan data audio. Sila semak teks anda dan cuba lagi.',
        });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType,
        model: 'gemini-3.8-flash-tts',
        voiceName,
        stylePrompt,
      });
    } catch (err: unknown) {
      const errorObj = err as {
        statusCode?: number;
        status?: number;
        message?: string;
      };
      const status = errorObj.statusCode || errorObj.status || 500;
      const message =
        errorObj.message || 'Gagal menjana audio ucapan daripada pelayan.';

      console.error('[TTS Error]', status, message);
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Suara Majlis server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
