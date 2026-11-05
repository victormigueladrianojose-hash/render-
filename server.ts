import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High limits for handling high-resolution base64 images
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// Storage directory for persistent history
const DATA_DIR = path.resolve(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(HISTORY_FILE)) {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error initializing data storage:', err);
  }
}

ensureDataStorage();

function readHistory(): any[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(data) || [];
    }
  } catch (err) {
    console.error('Error reading history:', err);
  }
  return [];
}

function writeHistory(items: any[]): boolean {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing history:', err);
    return false;
  }
}

// Resolution and Quality configurations for Edge Function
export interface ResolutionConfig {
  width: number;
  label: string;
  detailPrompt: string;
}

export const RESOLUTION_CONFIGS: Record<string, ResolutionConfig> = {
  '1080p': {
    width: 1920,
    label: '1080p Full HD (1920×1080)',
    detailPrompt:
      'Resolução de saída: 1080p Full HD (1920×1080). Renderização arquitetural nítida com anti-aliasing refinado e delineamento preciso de arestas e superfícies.',
  },
  '2K': {
    width: 2560,
    label: '2K Quad HD (2560×1440)',
    detailPrompt:
      'Resolução de saída: 2K Quad HD (2560×1440). Altíssimo nível de detalhamento textural: veios profundos de pedras e mármores, textura tátil de madeira maciça, micro-relevo de reboco e concreto, reflexos especulares cristalinos em superfícies vítreas e caustics de luz solar.',
  },
  '4K': {
    width: 3840,
    label: '4K Ultra HD (3840×2160)',
    detailPrompt:
      'Resolução de saída: 4K Ultra HD (3840×2160). Definição fotorrealista máxima (master quality). Renderização com microdetalhes microscópicos de materiais, rugosidade tátil de texturas arquiteturais, difusão atmosférica volumétrica precisa, sombras com gradiente de penumbra fisicamente exatas e traçado de raios (ray-tracing) hiper-realista.',
  },
};

// Edge Function Image Scaler using Sharp
async function scaleImageBuffer(
  inputBuffer: Buffer,
  targetResolutionKey: string = '1080p',
  inputMime: string = 'image/png'
): Promise<{ dataUrl: string; width: number; height: number }> {
  const normKey = targetResolutionKey === '4K' ? '4K' : targetResolutionKey === '2K' ? '2K' : '1080p';
  const config = RESOLUTION_CONFIGS[normKey] || RESOLUTION_CONFIGS['1080p'];
  const targetLongEdge = config.width;

  try {
    const meta = await sharp(inputBuffer).metadata();
    const origW = meta.width || 1920;
    const origH = meta.height || 1080;
    const isLandscape = origW >= origH;

    const resizeOpts = isLandscape
      ? { width: targetLongEdge, withoutEnlargement: false, kernel: sharp.kernel.lanczos3 }
      : { height: targetLongEdge, withoutEnlargement: false, kernel: sharp.kernel.lanczos3 };

    let pipeline = sharp(inputBuffer)
      .resize(resizeOpts)
      .sharpen({ sigma: normKey === '4K' ? 1.2 : normKey === '2K' ? 1.0 : 0.8, m1: 0.5, m2: 1.5 });

    let outBuf: Buffer;
    let outMime = 'image/png';

    if (inputMime.includes('jpeg') || inputMime.includes('jpg')) {
      outBuf = await pipeline.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
      outMime = 'image/jpeg';
    } else {
      outBuf = await pipeline.png({ compressionLevel: 6 }).toBuffer();
    }

    const outMeta = await sharp(outBuf).metadata();
    return {
      dataUrl: `data:${outMime};base64,${outBuf.toString('base64')}`,
      width: outMeta.width || targetLongEdge,
      height: outMeta.height || Math.round((targetLongEdge * origH) / origW),
    };
  } catch (err) {
    console.warn('[Sharp Scale] Fallback to raw buffer due to:', err);
    return {
      dataUrl: `data:${inputMime};base64,${inputBuffer.toString('base64')}`,
      width: targetLongEdge,
      height: Math.round((targetLongEdge * 9) / 16),
    };
  }
}

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// History GET endpoint
app.get('/api/history', (req: Request, res: Response) => {
  const history = readHistory();
  // Return summarized list or full list
  res.json({ success: true, history });
});

// History POST endpoint
app.post('/api/history', (req: Request, res: Response) => {
  try {
    const item = req.body;
    if (!item || !item.id) {
      res.status(400).json({ success: false, error: 'Invalid history item' });
      return;
    }
    const current = readHistory();
    // Prepend new item, keep up to 40 most recent
    const updated = [item, ...current.filter((i: any) => i.id !== item.id)].slice(0, 40);
    writeHistory(updated);
    res.json({ success: true, count: updated.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// History DELETE single endpoint
app.delete('/api/history/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = readHistory();
    const updated = current.filter((item: any) => item.id !== id);
    writeHistory(updated);
    res.json({ success: true, remaining: updated.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// History CLEAR ALL endpoint
app.delete('/api/history', (req: Request, res: Response) => {
  try {
    writeHistory([]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to strip data URL prefix
function parseBase64Image(dataUrl: string): { mimeType: string; base64: string } {
  if (dataUrl.startsWith('data:')) {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      return { mimeType: matches[1], base64: matches[2] };
    }
  }
  return { mimeType: 'image/png', base64: dataUrl };
}

// Edge Function / Render Endpoint
app.post('/api/render', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, options, modelChoice } = req.body;

    if (!imageBase64) {
      res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi fornecida para renderização.',
      });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'Chave de API do Gemini (GEMINI_API_KEY) não configurada no servidor. Por favor, verifique as configurações em Secrets.',
      });
      return;
    }

    const {
      time = '18:00',
      sunDirection = 'SO',
      weather = 'limpo',
      internalLights = true,
      lightTemperature = 'quente',
      style = 'fotorrealista',
      variationsCount = 1,
      refinement = '',
      resolution = '1080p',
    } = options || {};

    const lightsState = internalLights ? 'ligadas' : 'desligadas';

    // Normalize resolution selection (1080p, 2K, 4K)
    const normRes = resolution === '4K' ? '4K' : resolution === '2K' ? '2K' : '1080p';
    const resConfig = RESOLUTION_CONFIGS[normRes] || RESOLUTION_CONFIGS['1080p'];

    const sunDetailMap: Record<string, string> = {
      N: 'alto/vindo do Norte (sombras projetadas para o Sul)',
      NE: 'vindo do Nordeste (sombras projetadas para o Sudoeste)',
      E: 'vindo do Leste/nascente (luz rasante da manhã, sombras longas para o Oeste)',
      SE: 'vindo do Sudeste (sombras projetadas para o Noroeste)',
      S: 'vindo do Sul (sombras projetadas para o Norte)',
      SO: 'baixo, vindo do Sudoeste/esquerda (sombras longas e suaves projetadas para o Nordeste)',
      O: 'baixo, vindo do Oeste/poente (sombras longas projetadas para o Leste)',
      NO: 'vindo do Noroeste (sombras projetadas para o Sudeste)',
    };
    const sunDetail = sunDetailMap[sunDirection] || `vindo de ${sunDirection}`;

    // Base prompt rigorously adhering to user's architectural reference rule & quality tier:
    const basePrompt = `Edite esta imagem. Não crie uma cena nova.

REGRA PRINCIPAL: esta imagem é a referência exata. Mantenha idêntico: o ponto de vista da câmara, o enquadramento, a perspetiva, a geometria de todas as paredes, portas, janelas, telhado e mobiliário, a posição e o tamanho de cada objeto, os materiais, as texturas e as cores das superfícies. Não adicione, não remova, não mova e não redesenhe nenhum elemento. Não adicione pessoas, carros, plantas ou decoração que não existam na imagem. Não altere textos nem logótipos.

O QUE PODE MUDAR (apenas isto): a iluminação e a atmosfera.
- Hora do dia: ${time}
- Sol: ${sunDetail}
- Céu e clima: céu com clima ${weather}
- Luzes artificiais: ${lightsState} (luz interior ${lightTemperature})
- Temperatura da luz: ${lightTemperature}
- Estilo: ${style}

QUALIDADE E RESOLUÇÃO: render fotorrealista de arquitetura em ${resConfig.label}.
${resConfig.detailPrompt}
Sombras e reflexos fisicamente coerentes com a direção da luz. As sombras devem cair no sentido correto sobre as superfícies que já existem na imagem. Superfícies de vidro refletem o céu da nova hora. Mantenha a mesma proporção e geometria da imagem original.

Antes de responder, confira que a estrutura e os objetos continuam exatamente iguais à imagem de referência. Só a luz mudou.`;

    const fullPrompt = refinement
      ? `${basePrompt}\n\nInstruções adicionais de refinamento do utilizador: ${refinement}`
      : basePrompt;

    const { mimeType, base64 } = parseBase64Image(imageBase64);
    const count = Math.min(Math.max(Number(variationsCount) || 1, 1), 4);

    // Selected model: user specified Nano Banana / gemini-3.1-flash-lite-image
    const primaryModel = modelChoice === 'nano-banana-2.1' 
      ? 'gemini-nano-banana-2.1' 
      : 'gemini-3.1-flash-lite-image';

    console.log(`[LuzRender] Generating ${count} variation(s) using ${primaryModel}...`);
    console.log(`[LuzRender] Prompt: ${fullPrompt}`);

    // Generate variation requests
    const variationPromises = Array.from({ length: count }, async (_, index) => {
      // Small variation descriptor so each variation offers subtle photographic lighting nuances if count > 1
      let variationSpecificPrompt = fullPrompt;
      if (count > 1) {
        const nuanceNotes = [
          'Variação com contraste equilibrado e realce natural das sombras.',
          'Variação com luminosidade volumétrica mais suave e difusa.',
          'Variação com tons dourados e reflexos especulares mais profundos.',
          'Variação com atmosfera cinematográfica e transições suaves de penumbra.',
        ];
        variationSpecificPrompt = `${fullPrompt} (${nuanceNotes[index % nuanceNotes.length]})`;
      }

      try {
        const response = await ai.models.generateContent({
          model: primaryModel,
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64,
                  mimeType: mimeType,
                },
              },
              {
                text: variationSpecificPrompt,
              },
            ],
          },
        });

        let imageUrl: string | null = null;
        let commentary: string = '';

        let rawBase64Data: string | null = null;
        let outMime = 'image/png';

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            outMime = part.inlineData.mimeType ?? 'image/png';
            rawBase64Data = part.inlineData.data;
          } else if (part.text) {
            commentary += part.text;
          }
        }

        if (!rawBase64Data) {
          throw new Error('O modelo não retornou dados de imagem válidos.');
        }

        // Scale output through Edge Function Sharp pipeline according to quality tier (1080p, 2K, 4K)
        const rawBuf = Buffer.from(rawBase64Data, 'base64');
        const scaled = await scaleImageBuffer(rawBuf, normRes, outMime);

        return {
          id: `var-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
          imageUrl: scaled.dataUrl,
          commentary:
            commentary.trim() ||
            `Processado pela Edge Function em ${resConfig.label} (${scaled.width}×${scaled.height}px).`,
          variationIndex: index + 1,
          createdAt: new Date().toISOString(),
          resolution: normRes,
          dimensions: { width: scaled.width, height: scaled.height },
        };
      } catch (err: any) {
        console.error(`Variation ${index + 1} failed:`, err);
        throw err;
      }
    });

    const results = await Promise.allSettled(variationPromises);
    const successfulVariations = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (successfulVariations.length === 0) {
      const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      const rawError = firstError?.reason?.message || String(firstError?.reason) || '';
      
      const isQuotaExceeded =
        rawError.includes('429') ||
        rawError.includes('RESOURCE_EXHAUSTED') ||
        rawError.includes('quota') ||
        rawError.includes('limit: 0');

      if (isQuotaExceeded) {
        console.warn('[LuzRender] Gemini API quota limit reached on Free Tier (limit: 0 for image model).');
        res.status(429).json({
          success: false,
          code: 429,
          quotaExceeded: true,
          error:
            'A cota da chave gratuita do Gemini para o modelo de imagem Nano Banana foi atingida (requer faturamento ativado no AI Studio). O LuzRender ativou a Simulação Fotométrica em tempo real para você continuar renderizando sem interrupção.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: rawError || 'Falha ao gerar o render com o modelo Gemini.',
      });
      return;
    }

    res.json({
      success: true,
      variations: successfulVariations,
      promptUsed: fullPrompt,
      modelUsed: primaryModel,
      options,
    });
  } catch (error: any) {
    console.error('[LuzRender] Server error:', error);
    const rawError = error?.message || String(error) || '';
    const isQuotaExceeded =
      rawError.includes('429') ||
      rawError.includes('RESOURCE_EXHAUSTED') ||
      rawError.includes('quota') ||
      rawError.includes('limit: 0');

    if (isQuotaExceeded) {
      res.status(429).json({
        success: false,
        code: 429,
        quotaExceeded: true,
        error:
          'A cota da chave gratuita do Gemini para o modelo de imagem Nano Banana foi atingida (requer faturamento ativado no AI Studio). O LuzRender ativou a Simulação Fotométrica em tempo real para você continuar renderizando sem interrupção.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: rawError || 'Erro inesperado no servidor durante a renderização.',
    });
  }
});

// Selective Object / Region Edit Endpoint
app.post('/api/edit-object', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, instruction, modelChoice } = req.body;

    if (!imageBase64 || !instruction) {
      res.status(400).json({
        success: false,
        error: 'Imagem e instruções de alteração do objeto são obrigatórias.',
      });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'Chave de API do Gemini não configurada no servidor.',
      });
      return;
    }

    const { mimeType, base64 } = parseBase64Image(imageBase64);
    const primaryModel = modelChoice === 'nano-banana-2.1' 
      ? 'gemini-nano-banana-2.1' 
      : 'gemini-3.1-flash-lite-image';

    const editPrompt = `Modifique a imagem realizando a seguinte alteração de objeto/área: ${instruction}. Mantenha rigorosamente o restante da imagem, câmara, geometria, materiais não mencionados e atmosfera geral inalterados.`;

    console.log(`[LuzRender] Editing object using ${primaryModel}: "${instruction}"`);

    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64,
              mimeType: mimeType,
            },
          },
          {
            text: editPrompt,
          },
        ],
      },
    });

    let imageUrl: string | null = null;
    let commentary: string = '';

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const outMime = part.inlineData.mimeType ?? 'image/png';
        imageUrl = `data:${outMime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        commentary += part.text;
      }
    }

    if (!imageUrl) {
      throw new Error('O modelo não retornou a imagem editada.');
    }

    res.json({
      success: true,
      imageUrl,
      commentary: commentary.trim(),
      promptUsed: editPrompt,
      modelUsed: primaryModel,
    });
  } catch (error: any) {
    console.error('[LuzRender] Edit object error:', error);
    const rawError = error?.message || String(error) || '';
    const isQuotaExceeded =
      rawError.includes('429') ||
      rawError.includes('RESOURCE_EXHAUSTED') ||
      rawError.includes('quota') ||
      rawError.includes('limit: 0');

    if (isQuotaExceeded) {
      res.status(429).json({
        success: false,
        code: 429,
        quotaExceeded: true,
        error: 'Limite de cota excedido para o modelo de imagem na chave gratuita.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: rawError || 'Falha ao editar objeto na imagem.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LuzRender] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
