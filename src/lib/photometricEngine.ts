import { RenderOptions, RenderVariation, SunDirection } from '../types';

// Convert Sun direction to angle in radians
function getAzimuthRadians(direction: SunDirection): number {
  const angles: Record<SunDirection, number> = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SO: 225,
    O: 270,
    NO: 315,
  };
  // Compass: 0° is North (top), 90° East (right)
  const deg = angles[direction] ?? 225;
  return ((deg - 90) * Math.PI) / 180;
}

// Convert "HH:MM" to decimal hours
function parseHour(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 12) + (m || 0) / 60;
}

// Color temperature RGB multipliers
function getTemperatureGlow(temp: 'quente' | 'neutra' | 'fria') {
  switch (temp) {
    case 'quente':
      return { r: 1.25, g: 0.95, b: 0.65, label: '2700K Âmbar' };
    case 'neutra':
      return { r: 1.05, g: 1.02, b: 0.98, label: '4000K Neutra' };
    case 'fria':
      return { r: 0.85, g: 0.98, b: 1.28, label: '6000K Fria' };
  }
}

// Get solar ambient palette based on time of day
function getSolarAtmosphere(hour: number) {
  if (hour < 6.5) {
    // Dawn / Madrugada (05:00 - 06:30)
    return {
      sunIntensity: 0.45,
      ambientR: 0.7,
      ambientG: 0.6,
      ambientB: 0.85,
      sunR: 1.3,
      sunG: 0.8,
      sunB: 0.5,
      contrast: 1.15,
      shadowDarkness: 0.35,
    };
  } else if (hour < 9) {
    // Early Morning (06:30 - 09:00)
    return {
      sunIntensity: 0.85,
      ambientR: 0.95,
      ambientG: 0.9,
      ambientB: 0.85,
      sunR: 1.25,
      sunG: 1.05,
      sunB: 0.75,
      contrast: 1.1,
      shadowDarkness: 0.45,
    };
  } else if (hour < 16) {
    // Zenith / Mid-day (09:00 - 16:00)
    return {
      sunIntensity: 1.1,
      ambientR: 1.0,
      ambientG: 1.0,
      ambientB: 1.05,
      sunR: 1.15,
      sunG: 1.12,
      sunB: 1.05,
      contrast: 1.2,
      shadowDarkness: 0.5,
    };
  } else if (hour < 19) {
    // Golden Hour (16:00 - 19:00)
    return {
      sunIntensity: 0.95,
      ambientR: 1.05,
      ambientG: 0.85,
      ambientB: 0.7,
      sunR: 1.45,
      sunG: 1.0,
      sunB: 0.4,
      contrast: 1.25,
      shadowDarkness: 0.4,
    };
  } else if (hour < 20.5) {
    // Blue Hour / Crepúsculo (19:00 - 20:30)
    return {
      sunIntensity: 0.35,
      ambientR: 0.55,
      ambientG: 0.6,
      ambientB: 0.95,
      sunR: 1.1,
      sunG: 0.7,
      sunB: 0.5,
      contrast: 1.2,
      shadowDarkness: 0.25,
    };
  } else {
    // Night (20:30 - 22:00)
    return {
      sunIntensity: 0.15,
      ambientR: 0.35,
      ambientG: 0.4,
      ambientB: 0.65,
      sunR: 0.6,
      sunG: 0.7,
      sunB: 0.9,
      contrast: 1.3,
      shadowDarkness: 0.15,
    };
  }
}

/**
 * High-performance Photometric Shader Engine
 * Produces photographic lighting renders matching the user's solar & architectural options
 */
export async function generatePhotometricRenders(
  imageBase64: string,
  options: RenderOptions,
  count: number = 1
): Promise<RenderVariation[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const origW = img.naturalWidth || 1920;
      const origH = img.naturalHeight || 1080;
      const aspect = origW / origH;

      // Calculate output resolution based on HD to 4K request
      let width = origW;
      let height = origH;

      if (options.resolution === '4K') {
        width = 3840;
        height = Math.round(3840 / aspect);
      } else if (options.resolution === '2K') {
        width = 2560;
        height = Math.round(2560 / aspect);
      } else {
        // '1080p' default Full HD
        width = 1920;
        height = Math.round(1920 / aspect);
      }

      const hour = parseHour(options.time);
      const solar = getSolarAtmosphere(hour);
      const azimuth = getAzimuthRadians(options.sunDirection);
      const sunDirX = Math.cos(azimuth);
      const sunDirY = Math.sin(azimuth);

      const lightGlow = getTemperatureGlow(options.lightTemperature);

      const results: RenderVariation[] = [];

      for (let i = 0; i < count; i++) {
        // Variation nuances
        const nuanceShift = (i - (count - 1) / 2) * 0.08;
        const varSunIntensity = Math.max(0.1, solar.sunIntensity + nuanceShift);
        const varContrast = solar.contrast + (i % 2 === 0 ? 0.05 : -0.05);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;

        // 1. Draw base image
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Read pixel data
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Weather factors
        const isRain = options.weather === 'chuva';
        const isFog = options.weather === 'nevoeiro';
        const isOvercast = options.weather === 'nublado';

        // Process pixels with photometric lighting math
        for (let y = 0; y < height; y++) {
          const normY = y / height;
          // Gradient position along the sun direction vector
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const normX = x / width;

            // Normalized distance along sun ray
            const sunDot = (normX - 0.5) * sunDirX + (normY - 0.5) * sunDirY;
            // Sun influence gradient: 0.0 to 1.0
            const sunFactor = Math.max(0, Math.min(1, 0.5 + sunDot * 0.7));

            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];

            // 1. Ambient lighting color balance
            r = r * solar.ambientR;
            g = g * solar.ambientG;
            b = b * solar.ambientB;

            // 2. Directional Solar Lighting
            const sunLightFactor = isOvercast ? 0.3 : isFog ? 0.4 : 1.0;
            const directSun = sunFactor * varSunIntensity * sunLightFactor;

            r += directSun * 45 * solar.sunR;
            g += directSun * 38 * solar.sunG;
            b += directSun * 25 * solar.sunB;

            // 3. Internal lights contribution
            if (options.internalLights) {
              // Higher contribution in middle/lower indoor areas and at darker times
              const indoorMask = Math.sin(normX * Math.PI) * Math.sin(normY * Math.PI);
              const darknessBonus = Math.max(0.2, 1.2 - solar.sunIntensity);
              const lightEmit = indoorMask * darknessBonus * 40;

              r += lightEmit * lightGlow.r;
              g += lightEmit * lightGlow.g;
              b += lightEmit * lightGlow.b;
            }

            // 4. Weather Modifiers
            if (isRain) {
              // Darken floor and add high-frequency specular shimmer
              if (normY > 0.6) {
                r *= 0.82;
                g *= 0.85;
                b *= 0.95;
                // Specular reflection of lighting
                if ((x * 7 + y * 13) % 29 < 3) {
                  r += 30;
                  g += 30;
                  b += 45;
                }
              }
            } else if (isFog) {
              // Volumetric fog blend
              const fogAmount = 0.28 + normY * 0.15;
              const fogR = 190 * solar.ambientR;
              const fogG = 195 * solar.ambientG;
              const fogB = 210 * solar.ambientB;
              r = r * (1 - fogAmount) + fogR * fogAmount;
              g = g * (1 - fogAmount) + fogG * fogAmount;
              b = b * (1 - fogAmount) + fogB * fogAmount;
            } else if (isOvercast) {
              // Soft diffuse desaturation
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              r = r * 0.75 + lum * 0.25;
              g = g * 0.75 + lum * 0.25;
              b = b * 0.75 + lum * 0.25;
            }

            // 5. Architectural Style Grading
            if (options.style === 'cinematográfico') {
              // Rich anamorphic contrast & subtle teal-orange push
              r = (r - 128) * (varContrast * 1.1) + 128 + 8;
              g = (g - 128) * (varContrast * 1.05) + 128;
              b = (b - 128) * (varContrast * 1.1) + 128 - 6;
            } else if (options.style === 'arquitetural limpo') {
              // Crisp magazine clarity, lifted clean shadows
              r = (r - 128) * varContrast + 132;
              g = (g - 128) * varContrast + 132;
              b = (b - 128) * varContrast + 134;
            } else {
              // Fotorrealista
              r = (r - 128) * varContrast + 128;
              g = (g - 128) * varContrast + 128;
              b = (b - 128) * varContrast + 128;
            }

            // Clamp 0..255
            data[idx] = Math.max(0, Math.min(255, Math.round(r)));
            data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // 6. Draw sun flare glow on edge if direct sun
        if (!isOvercast && !isFog && hour > 6 && hour < 19.5) {
          const flareX = width * (0.5 + sunDirX * 0.45);
          const flareY = height * (0.5 + sunDirY * 0.45);
          const flareRadius = Math.max(width, height) * 0.45;

          const radGrad = ctx.createRadialGradient(
            flareX,
            flareY,
            0,
            flareX,
            flareY,
            flareRadius
          );
          radGrad.addColorStop(
            0,
            `rgba(${Math.round(255 * solar.sunR)}, ${Math.round(
              200 * solar.sunG
            )}, ${Math.round(120 * solar.sunB)}, ${0.28 * varSunIntensity})`
          );
          radGrad.addColorStop(
            0.5,
            `rgba(${Math.round(240 * solar.sunR)}, ${Math.round(
              160 * solar.sunG
            )}, ${Math.round(80 * solar.sunB)}, ${0.1 * varSunIntensity})`
          );
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = radGrad;
          ctx.fillRect(0, 0, width, height);
        }

        const outDataUrl = canvas.toDataURL('image/png', 0.95);
        results.push({
          id: `sim-${Date.now()}-${i}`,
          imageUrl: outDataUrl,
          commentary: `Simulação Fotométrica ${options.resolution || '1080p'} (${width}×${height}px): Sol ${options.sunDirection} (${options.time}), Clima ${options.weather}, Luzes ${options.lightTemperature}.`,
          variationIndex: i + 1,
          createdAt: new Date().toISOString(),
          resolution: options.resolution || '1080p',
          dimensions: { width, height },
        });
      }

      resolve(results);
    };

    img.onerror = () => {
      reject(new Error('Falha ao processar a imagem recortada.'));
    };

    img.src = imageBase64;
  });
}
