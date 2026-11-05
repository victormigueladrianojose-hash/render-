import React, { useState } from 'react';
import { 
  Clock, 
  Compass, 
  CloudSun, 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudFog, 
  Lightbulb, 
  Sparkles, 
  Layers, 
  Palette, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  Flame, 
  Camera,
  Wand2,
  Maximize2
} from 'lucide-react';
import { 
  RenderOptions, 
  SunDirection, 
  WeatherType, 
  LightTemperature, 
  StyleType,
  RenderResolution 
} from '../types';
import { SunCompass } from './SunCompass';

interface RenderControlsProps {
  options: RenderOptions;
  onChange: (options: RenderOptions) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const WEATHER_OPTIONS: { key: WeatherType; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'limpo', label: 'Limpo', desc: 'Sol direto e sombras marcadas', icon: <Sun className="w-4 h-4 text-amber-400" /> },
  { key: 'nublado', label: 'Nublado', desc: 'Luz difusa, sombras suaves', icon: <Cloud className="w-4 h-4 text-slate-300" /> },
  { key: 'chuva', label: 'Chuva', desc: 'Chão molhado e reflexos', icon: <CloudRain className="w-4 h-4 text-blue-400" /> },
  { key: 'nevoeiro', label: 'Nevoeiro', desc: 'Bruma e feixes volumétricos', icon: <CloudFog className="w-4 h-4 text-emerald-300" /> },
];

const STYLE_OPTIONS: { key: StyleType; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'fotorrealista', label: 'Fotorrealista', desc: 'Física precisa de materiais e reflexos', icon: <Camera className="w-4 h-4 text-amber-400" /> },
  { key: 'arquitetural limpo', label: 'Arquitetural Limpo', desc: 'Linhas nítidas, editorial de design', icon: <Layers className="w-4 h-4 text-blue-400" /> },
  { key: 'cinematográfico', label: 'Cinematográfico', desc: 'Contraste dramático e raios de luz', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
];

const TIME_PRESETS = [
  { label: '06:30', name: 'Amanhecer', time: '06:30' },
  { label: '12:00', name: 'Zénite', time: '12:00' },
  { label: '18:15', name: 'Golden Hour', time: '18:15' },
  { label: '21:00', name: 'Noturno', time: '21:00' },
];

export const RenderControls: React.FC<RenderControlsProps> = ({
  options,
  onChange,
  onGenerate,
  isGenerating,
  disabled = false,
}) => {
  const [showPromptDetails, setShowPromptDetails] = useState(false);

  // Convert "HH:MM" to minutes from 05:00 (300 mins) to 22:00 (1320 mins)
  const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 12) * 60 + (m || 0);
  };

  const minutesToTimeStr = (totalMinutes: number) => {
    const clamped = Math.max(300, Math.min(1320, totalMinutes)); // 05:00 to 22:00
    const h = Math.floor(clamped / 60);
    const m = Math.floor((clamped % 60) / 5) * 5; // Snap to 5 mins
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const currentMinutes = parseTimeToMinutes(options.time);

  const handleTimeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mins = parseInt(e.target.value, 10);
    onChange({ ...options, time: minutesToTimeStr(mins) });
  };

  // Base prompt string according to user's specification
  const basePromptText = `Edite esta imagem. Não crie uma cena nova.
REGRA PRINCIPAL: esta imagem é a referência exata. Mantenha idêntico: o ponto de vista da câmara, o enquadramento, a perspetiva, a geometria de todas as paredes, portas, janelas, telhado e mobiliário, a posição e o tamanho de cada objeto, os materiais, as texturas e as cores das superfícies. Não adicione, não remova, não mova e não redesenhe nenhum elemento. Não adicione pessoas, carros, plantas ou decoração que não existam na imagem. Não altere textos nem logótipos.

O QUE PODE MUDAR (apenas isto): a iluminação e a atmosfera: hora ${options.time}, sol vindo de ${options.sunDirection}, clima ${options.weather}, luzes internas ${options.internalLights ? 'ligadas' : 'desligadas'}, luz ${options.lightTemperature}, estilo ${options.style}.

QUALIDADE: render fotorrealista de arquitetura, nítido, com sombras e reflexos fisicamente coerentes com a direção da luz.`;

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. Hora do Dia */}
      <section className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            1. Hora do Dia
          </label>
          <span className="font-mono text-base font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
            {options.time}
          </span>
        </div>

        {/* Time Slider 05:00 to 22:00 */}
        <div className="space-y-2">
          <input
            type="range"
            min={300} // 05:00
            max={1320} // 22:00
            step={5}
            value={currentMinutes}
            onChange={handleTimeSliderChange}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>05:00 (Amanhecer)</span>
            <span>12:00 (Meio-dia)</span>
            <span>18:00 (Pôr do Sol)</span>
            <span>22:00 (Noite)</span>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-2 pt-1">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.time}
              type="button"
              onClick={() => onChange({ ...options, time: preset.time })}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                options.time === preset.time
                  ? 'bg-amber-400/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              <div className="font-mono text-[11px] font-bold">{preset.label}</div>
              <div className="text-[9px] opacity-75">{preset.name}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Direção do Sol */}
      <section className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-400" />
          2. Direção do Sol
        </label>
        <SunCompass
          value={options.sunDirection}
          onChange={(sunDirection) => onChange({ ...options, sunDirection })}
        />
      </section>

      {/* 3. Clima */}
      <section className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <CloudSun className="w-4 h-4 text-amber-400" />
          3. Clima
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {WEATHER_OPTIONS.map((w) => {
            const isSelected = options.weather === w.key;
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => onChange({ ...options, weather: w.key })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {w.icon}
                  <span className="font-semibold text-xs capitalize">{w.label}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{w.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Luzes Internas & Temperatura */}
      <section className="space-y-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            4. Luzes Internas
          </label>
          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() => onChange({ ...options, internalLights: !options.internalLights })}
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
              options.internalLights ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                options.internalLights ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Estado das luminárias interiores:</span>
          <span className={`font-semibold ${options.internalLights ? 'text-amber-400' : 'text-slate-500'}`}>
            {options.internalLights ? 'LIGADAS' : 'DESLIGADAS'}
          </span>
        </div>

        {/* Temperatura da Luz (quente / neutra / fria) */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Temperatura da Luz
            </span>
            <span className="text-[10px] text-slate-400 capitalize">{options.lightTemperature}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: 'quente', label: 'Quente', kelvin: '~2700K', color: 'from-amber-600 to-amber-400' },
                { key: 'neutra', label: 'Neutra', kelvin: '~4000K', color: 'from-amber-200 to-slate-200' },
                { key: 'fria', label: 'Fria', kelvin: '~6000K', color: 'from-sky-300 to-sky-100' },
              ] as const
            ).map((t) => {
              const isSelected = options.lightTemperature === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onChange({ ...options, lightTemperature: t.key })}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400/10 text-white font-bold ring-2 ring-amber-400/20'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                  }`}
                >
                  <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${t.color} mb-1.5`} />
                  <div className="text-xs font-semibold capitalize">{t.label}</div>
                  <div className="text-[9px] opacity-60 font-mono">{t.kelvin}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Estilo Arquitetural */}
      <section className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-400" />
          5. Estilo
        </label>
        <div className="space-y-2">
          {STYLE_OPTIONS.map((s) => {
            const isSelected = options.style === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onChange({ ...options, style: s.key })}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                <div className="mt-0.5">{s.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-xs capitalize">{s.label}</div>
                  <div className="text-[10px] text-slate-400">{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Número de Variações */}
      <section className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            6. Variações simultâneas
          </label>
          <span className="text-xs text-amber-400 font-semibold font-mono">
            {options.variationsCount} {options.variationsCount === 1 ? 'imagem' : 'imagens'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((count) => {
            const isSelected = options.variationsCount === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => onChange({ ...options, variationsCount: count })}
                className={`py-2 rounded-lg border font-mono font-bold text-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {count}x
              </button>
            );
          })}
        </div>
      </section>

      {/* 7. Qualidade & Resolução de Saída (Edge Function) */}
      <section className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-amber-400" />
            7. Qualidade de Render (Edge Function)
          </label>
          <span className="text-xs text-amber-400 font-mono font-bold bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-500/20">
            {options.resolution || '1080p'} {options.resolution === '4K' ? 'Ultra HD' : options.resolution === '2K' ? 'Quad HD' : 'Full HD'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              { id: '1080p', label: '1080p', name: 'Full HD', px: '1920 × 1080 px', desc: 'Nítido & Equilibrado' },
              { id: '2K', label: '2K', name: 'Quad HD', px: '2560 × 1440 px', desc: 'Texturas & Micro-relevos' },
              { id: '4K', label: '4K', name: 'Ultra HD', px: '3840 × 2160 px', desc: 'Máximo Fotorrealismo Ray-tracing' },
            ] as const
          ).map((item) => {
            const isSelected = (options.resolution || '1080p') === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange({ ...options, resolution: item.id as RenderResolution })}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/20 ring-2 ring-amber-400/30 font-bold'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="text-sm font-mono font-black">{item.label}</div>
                <div className="text-[10px] font-semibold tracking-wide uppercase opacity-90">{item.name}</div>
                <div className="text-[9px] font-mono opacity-70 mt-0.5">{item.px}</div>
              </button>
            );
          })}
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span>Escala da Edge Function:</span>
            <span className="font-mono text-amber-300">
              {options.resolution === '4K' ? '3840px (Upscale Lanczos3 + Sharpening)' : options.resolution === '2K' ? '2560px (Upscale Lanczos3)' : '1920px (Full HD Nativo)'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            {options.resolution === '4K'
              ? 'Injeta diretiva de microtexturas, reflexos de vidro e ray-tracing no prompt, e redimensiona a saída da Edge Function para 4K Ultra HD.'
              : options.resolution === '2K'
              ? 'Aumenta detalhe textural em madeiras, mármores e sombras suaves no prompt, escalando a saída para 2K Quad HD.'
              : 'Renderização ágil em 1080p Full HD com anti-aliasing e geometria delineada.'}
          </p>
        </div>
      </section>

      {/* Motor de Renderização */}
      <section className="space-y-2 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Motor de Renderização
          </label>
          <span className="text-[10px] text-amber-400 font-mono">
            {options.engineMode === 'photometric' ? 'Local • Sem Limite de Cota' : 'Nuvem • Gemini Nano Banana'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...options, engineMode: 'gemini' })}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              (options.engineMode || 'gemini') === 'gemini'
                ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold flex items-center gap-1.5">
              <span>IA Gemini Nano Banana</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Modelo oficial do Gemini na nuvem (requer chave paga)
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...options, engineMode: 'photometric' })}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              options.engineMode === 'photometric'
                ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm ring-1 ring-amber-400/30'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold flex items-center gap-1.5 text-amber-300">
              <span>Simulação Fotométrica</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-400 font-mono">
                Livre
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Física solar em tempo real (0 latência, ilimitado)
            </div>
          </button>
        </div>
      </section>

      {/* Prompt Base Accordion */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPromptDetails(!showPromptDetails)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            Ver Prompt Base Gemini (Nano Banana)
          </span>
          {showPromptDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showPromptDetails && (
          <div className="p-4 pt-1 border-t border-slate-800/80 space-y-2">
            <p className="text-[11px] text-slate-300 font-mono bg-slate-900 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
              "{basePromptText}"
            </p>
            <p className="text-[10px] text-slate-500">
              * A chave de API permanece estritamente segura no servidor backend.
            </p>
          </div>
        )}
      </div>

      {/* Main Generate Button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || disabled}
        className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl cursor-pointer ${
          isGenerating || disabled
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99]'
        }`}
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            <span>Processando com Gemini Nano Banana...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Gerar Render ({options.variationsCount} {options.variationsCount === 1 ? 'Variação' : 'Variações'})</span>
          </>
        )}
      </button>
    </div>
  );
};
