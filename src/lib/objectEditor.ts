import { RenderVariation } from '../types';

export interface ObjectEditRequest {
  image: string;
  maskDataUrl?: string; // Black & white or transparent mask of the selected region
  maskBounds?: { x: number; y: number; width: number; height: number };
  instruction: string;
  engineMode?: 'gemini' | 'photometric';
}

/**
 * Procedural Architectural Texture & Material Synthesizer for Local Inpainting
 * Handles material swapping, recoloring, and object additions when Gemini quota is limited
 */
export async function applyLocalObjectInpaint(
  baseImage: string,
  maskCanvas: HTMLCanvasElement,
  instruction: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 600;

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = width;
      outputCanvas.height = height;
      const ctx = outputCanvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Get original and mask pixel data
      const origData = ctx.getImageData(0, 0, width, height);
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) {
        resolve(outputCanvas.toDataURL('image/png'));
        return;
      }

      // Scale mask to original dimensions
      const scaledMask = document.createElement('canvas');
      scaledMask.width = width;
      scaledMask.height = height;
      const sCtx = scaledMask.getContext('2d');
      if (!sCtx) {
        resolve(outputCanvas.toDataURL('image/png'));
        return;
      }
      sCtx.drawImage(maskCanvas, 0, 0, width, height);
      const maskPixels = sCtx.getImageData(0, 0, width, height).data;

      const pixels = origData.data;
      const lower = instruction.toLowerCase();

      // Detect semantic intent from instruction
      const isWood = lower.includes('madeira') || lower.includes('piso') || lower.includes('nogueira') || lower.includes('parquet');
      const isMarble = lower.includes('mármore') || lower.includes('pedra') || lower.includes('calacatta') || lower.includes('branco');
      const isLeather = lower.includes('couro') || lower.includes('castanho') || lower.includes('caramelo') || lower.includes('poltrona');
      const isPlant = lower.includes('planta') || lower.includes('verde') || lower.includes('folhagem') || lower.includes('jardim');
      const isConcrete = lower.includes('cimento') || lower.includes('betão') || lower.includes('cinza') || lower.includes('parede');
      const isGold = lower.includes('ouro') || lower.includes('dourad') || lower.includes('metal') || lower.includes('latão');
      const isDark = lower.includes('preto') || lower.includes('escuro') || lower.includes('chumbo');

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          // Alpha of mask pixel determines blend strength (0 to 1)
          const maskAlpha = maskPixels[idx + 3] / 255;
          if (maskAlpha < 0.02) continue;

          let r = pixels[idx];
          let g = pixels[idx + 1];
          let b = pixels[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          let targetR = r;
          let targetG = g;
          let targetB = b;

          if (isWood) {
            // Warm rich walnut/oak wood grain pattern
            const grain = Math.sin((x * 0.4 + y * 0.05) + Math.sin(y * 0.15) * 3) * 15;
            targetR = Math.min(255, lum * 0.8 + 80 + grain);
            targetG = Math.min(255, lum * 0.55 + 40 + grain * 0.7);
            targetB = Math.max(0, lum * 0.35 + 20);
          } else if (isMarble) {
            // Elegant white marble with subtle veins
            const vein = Math.sin(x * 0.08 + y * 0.04) * Math.cos(x * 0.03 - y * 0.06);
            const veinDark = Math.abs(vein) > 0.8 ? -35 : 0;
            targetR = Math.min(255, lum * 0.4 + 190 + veinDark);
            targetG = Math.min(255, lum * 0.4 + 195 + veinDark);
            targetB = Math.min(255, lum * 0.45 + 205 + veinDark);
          } else if (isLeather) {
            // Rich cognac leather
            targetR = Math.min(255, lum * 0.7 + 95);
            targetG = Math.min(255, lum * 0.45 + 45);
            targetB = Math.max(0, lum * 0.25 + 20);
          } else if (isPlant) {
            // Tropical lush green foliage
            const leafVar = (Math.sin(x * 0.3) * Math.cos(y * 0.3)) * 20;
            targetR = Math.max(0, lum * 0.3 + 25 + leafVar * 0.5);
            targetG = Math.min(255, lum * 0.65 + 90 + leafVar);
            targetB = Math.max(0, lum * 0.2 + 20);
          } else if (isGold) {
            // Specular brushed brass / gold
            targetR = Math.min(255, lum * 0.7 + 140);
            targetG = Math.min(255, lum * 0.6 + 105);
            targetB = Math.max(0, lum * 0.2 + 30);
          } else if (isDark) {
            // Matte dark slate / noir
            targetR = Math.max(10, lum * 0.35 + 15);
            targetG = Math.max(10, lum * 0.35 + 18);
            targetB = Math.max(10, lum * 0.4 + 22);
          } else if (isConcrete) {
            // Contemporary architectural concrete
            const noise = ((x * 17 + y * 31) % 19) - 9;
            targetR = Math.min(255, Math.max(0, lum * 0.8 + 50 + noise));
            targetG = Math.min(255, Math.max(0, lum * 0.8 + 52 + noise));
            targetB = Math.min(255, Math.max(0, lum * 0.85 + 56 + noise));
          } else {
            // General recoloring / aesthetic transformation
            targetR = Math.min(255, lum * 0.9 + 40);
            targetG = Math.min(255, lum * 0.8 + 30);
            targetB = Math.max(0, lum * 0.7 + 10);
          }

          // Smooth edge alpha blending
          pixels[idx] = Math.round(r * (1 - maskAlpha) + targetR * maskAlpha);
          pixels[idx + 1] = Math.round(g * (1 - maskAlpha) + targetG * maskAlpha);
          pixels[idx + 2] = Math.round(b * (1 - maskAlpha) + targetB * maskAlpha);
        }
      }

      ctx.putImageData(origData, 0, 0);
      resolve(outputCanvas.toDataURL('image/png', 0.95));
    };

    img.onerror = () => reject(new Error('Falha ao processar imagem para edição de objeto.'));
    img.src = baseImage;
  });
}
