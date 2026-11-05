import React from 'react';
import { Sun, Cloud, CloudRain, CloudFog, Moon, Flame, Lightbulb } from 'lucide-react';
import { RenderOptions } from '../types';

interface AtmospherePreviewProps {
  options: RenderOptions;
}

export const AtmospherePreview: React.FC<AtmospherePreviewProps> = ({ options }) => {
  // Parse hour from "HH:MM"
  const [hourStr, minStr] = options.time.split(':');
  const hour = (parseInt(hourStr, 10) || 12) + (parseInt(minStr, 10) || 0) / 60;

  // Determine atmospheric period
  let periodName = 'Pleno Dia';
  let periodColor = 'from-sky-500 via-sky-400 to-amber-200';
  let sunHeight = 70; // % from bottom
  let isNight = false;

  if (hour < 6.5) {
    periodName = 'Alvorada / Madrugada';
    periodColor = 'from-indigo-950 via-purple-900 to-amber-600';
    sunHeight = 15;
  } else if (hour < 9) {
    periodName = 'Amanhecer Suave';
    periodColor = 'from-blue-600 via-amber-400 to-amber-200';
    sunHeight = 35;
  } else if (hour < 16) {
    periodName = 'Luz Solar Zenith';
    periodColor = 'from-sky-500 via-blue-400 to-amber-100';
    sunHeight = 85;
  } else if (hour < 19) {
    periodName = 'Golden Hour (Hora Dourada)';
    periodColor = 'from-orange-600 via-amber-500 to-rose-400';
    sunHeight = 25;
  } else if (hour < 20.5) {
    periodName = 'Crepúsculo Azul (Blue Hour)';
    periodColor = 'from-slate-950 via-indigo-900 to-purple-800';
    sunHeight = 10;
  } else {
    periodName = 'Noturno Estrelado';
    periodColor = 'from-black via-slate-950 to-indigo-950';
    sunHeight = 0;
    isNight = true;
  }

  // Adjust for weather
  if (options.weather === 'nublado') {
    periodColor = 'from-slate-700 via-slate-600 to-slate-500';
  } else if (options.weather === 'chuva') {
    periodColor = 'from-slate-800 via-slate-700 to-blue-950';
  } else if (options.weather === 'nevoeiro') {
    periodColor = 'from-slate-600 via-slate-500 to-slate-400';
  }

  // Temperature color accent
  const tempColors = {
    quente: 'text-amber-400 bg-amber-400/10 border-amber-500/30',
    neutra: 'text-slate-200 bg-slate-200/10 border-slate-400/30',
    fria: 'text-sky-300 bg-sky-300/10 border-sky-400/30',
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Simulação Atmosférica
        </span>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {periodName}
        </span>
      </div>

      {/* Sky Box representation */}
      <div
        className={`relative h-24 rounded-lg bg-gradient-to-b ${periodColor} overflow-hidden shadow-inner flex items-center justify-center transition-all duration-700`}
      >
        {/* Sun or Moon */}
        <div
          className="absolute transition-all duration-700"
          style={{
            bottom: `${Math.max(10, sunHeight)}%`,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {isNight ? (
            <div className="relative">
              <Moon className="w-8 h-8 text-amber-100 drop-shadow-[0_0_12px_rgba(254,240,138,0.8)]" />
              <div className="absolute -top-1 -right-3 text-[10px] text-amber-200">✦</div>
            </div>
          ) : (
            <div className="relative">
              <Sun
                className={`w-9 h-9 ${
                  options.weather === 'nublado' || options.weather === 'nevoeiro'
                    ? 'text-amber-200 opacity-60'
                    : 'text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.9)] animate-pulse'
                }`}
              />
            </div>
          )}
        </div>

        {/* Rain or Fog overlay */}
        {options.weather === 'chuva' && (
          <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-[0.5px] flex items-center justify-around opacity-70">
            <span className="text-blue-300 text-xs animate-bounce">💧</span>
            <span className="text-blue-200 text-xs animate-bounce delay-100">💧</span>
            <span className="text-blue-300 text-xs animate-bounce delay-200">💧</span>
          </div>
        )}

        {options.weather === 'nevoeiro' && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
        )}

        {/* Horizon silhouette */}
        <div className="absolute bottom-0 inset-x-0 h-4 bg-slate-950/60 backdrop-blur-xs flex items-center justify-between px-3 text-[9px] text-slate-300 font-mono">
          <span>Sol: {options.sunDirection}</span>
          <span>{options.time}h</span>
          <span className="capitalize">{options.weather}</span>
        </div>
      </div>

      {/* Atmospheric badges */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center gap-2">
          <Lightbulb
            className={`w-4 h-4 ${
              options.internalLights ? 'text-amber-400' : 'text-slate-500'
            }`}
          />
          <div className="leading-tight">
            <div className="text-[10px] text-slate-400">Luzes Internas</div>
            <div className="font-semibold text-slate-200">
              {options.internalLights ? 'Ligadas' : 'Desligadas'}
            </div>
          </div>
        </div>

        <div
          className={`p-2 rounded-lg border flex items-center gap-2 ${
            tempColors[options.lightTemperature]
          }`}
        >
          <Flame className="w-4 h-4" />
          <div className="leading-tight">
            <div className="text-[10px] opacity-75">Temperatura</div>
            <div className="font-semibold capitalize">
              {options.lightTemperature}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
