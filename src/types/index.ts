export type SunDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO';

export type WeatherType = 'limpo' | 'nublado' | 'chuva' | 'nevoeiro';

export type LightTemperature = 'quente' | 'neutra' | 'fria';

export type StyleType = 'fotorrealista' | 'arquitetural limpo' | 'cinematográfico';

export type RenderResolution = '1080p' | '2K' | '4K';

export interface RenderOptions {
  time: string; // e.g. "18:00"
  sunDirection: SunDirection;
  weather: WeatherType;
  internalLights: boolean;
  lightTemperature: LightTemperature;
  style: StyleType;
  variationsCount: number; // 1 to 4
  refinement?: string;
  engineMode?: 'gemini' | 'photometric';
  resolution?: RenderResolution; // HD, FHD, 2K, 4K
}

export interface RenderVariation {
  id: string;
  imageUrl: string;
  commentary?: string;
  variationIndex: number;
  createdAt: string;
  resolution?: RenderResolution;
  dimensions?: { width: number; height: number };
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  createdAt: string;
  originalImage: string;
  croppedImage: string;
  cropArea?: CropArea;
  options: RenderOptions;
  prompt: string;
  variations: RenderVariation[];
  modelUsed?: string;
}
