import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'arabic-tts-api',
          configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
              if (req.url && req.url.startsWith('/api/tts')) {
                try {
                  const parsed = new URL(req.url, 'http://localhost:3000');
                  const text = parsed.searchParams.get('text') || parsed.searchParams.get('q');
                  if (!text || !text.trim()) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Text parameter is required' }));
                    return;
                  }

                  const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encodeURIComponent(text.trim())}`;
                  const audioRes = await fetch(googleUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                    }
                  });

                  if (!audioRes.ok) {
                    res.statusCode = audioRes.status;
                    res.end('Audio upstream failed');
                    return;
                  }

                  res.setHeader('Content-Type', 'audio/mpeg');
                  res.setHeader('Cache-Control', 'public, max-age=86400');
                  const arrayBuf = await audioRes.arrayBuffer();
                  res.end(Buffer.from(arrayBuf));
                  return;
                } catch (err: any) {
                  console.error('[TTS Proxy Error]:', err);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'TTS processing failed' }));
                  return;
                }
              }
              next();
            });
          },
          configurePreviewServer(server) {
            server.middlewares.use(async (req, res, next) => {
              if (req.url && req.url.startsWith('/api/tts')) {
                try {
                  const parsed = new URL(req.url, 'http://localhost:3000');
                  const text = parsed.searchParams.get('text') || parsed.searchParams.get('q');
                  if (!text || !text.trim()) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Text parameter is required' }));
                    return;
                  }

                  const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encodeURIComponent(text.trim())}`;
                  const audioRes = await fetch(googleUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                    }
                  });

                  if (!audioRes.ok) {
                    res.statusCode = audioRes.status;
                    res.end('Audio upstream failed');
                    return;
                  }

                  res.setHeader('Content-Type', 'audio/mpeg');
                  res.setHeader('Cache-Control', 'public, max-age=86400');
                  const arrayBuf = await audioRes.arrayBuffer();
                  res.end(Buffer.from(arrayBuf));
                  return;
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'TTS processing failed' }));
                  return;
                }
              }
              next();
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
