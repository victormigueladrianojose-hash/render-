import React from 'react';
import { Sun } from 'lucide-react';
import { SunDirection } from '../types';

interface SunCompassProps {
  value: SunDirection;
  onChange: (direction: SunDirection) => void;
}

const DIRECTIONS: { key: SunDirection; label: string; angle: number; desc: string }[] = [
  { key: 'N', label: 'Norte', angle: 0, desc: 'Luz difusa, sombras longas ao sul' },
  { key: 'NE', label: 'Nordeste', angle: 45, desc: 'Luz matinal oblíqua' },
  { key: 'E', label: 'Este', angle: 90, desc: 'Sol nascente direto' },
  { key: 'SE', label: 'Sudeste', angle: 135, desc: 'Sol matinal intermediário' },
  { key: 'S', label: 'Sul', angle: 180, desc: 'Sol alto / contra-luz ao norte' },
  { key: 'SO', label: 'Sudoeste', angle: 225, desc: 'Sol de fim de tarde' },
  { key: 'O', label: 'Oeste', angle: 270, desc: 'Pôr do sol direto e fita dourada' },
  { key: 'NO', label: 'Noroeste', angle: 315, desc: 'Luz crepuscular suave' },
];

export const SunCompass: React.FC<SunCompassProps> = ({ value, onChange }) => {
  const current = DIRECTIONS.find((d) => d.key === value) || DIRECTIONS[5]; // Default SO

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Azimute Solar:</span>
        <span className="font-mono text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20">
          {value} • {current.angle}° ({current.label})
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Circular Compass Dial */}
        <div className="relative w-36 h-36 flex-shrink-0 rounded-full border border-slate-700 bg-slate-900/90 shadow-inner flex items-center justify-center p-2">
          {/* Degree markings */}
          <div className="absolute inset-2 rounded-full border border-dashed border-slate-700/60" />
          
          {/* Compass Crosshairs */}
          <div className="absolute w-full h-[1px] bg-slate-800" />
          <div className="absolute h-full w-[1px] bg-slate-800" />

          {/* Interactive Direction Buttons positioned in circle */}
          {DIRECTIONS.map((dir) => {
            const isSelected = dir.key === value;
            // Radius ~ 52px
            const rad = (dir.angle - 90) * (Math.PI / 180);
            const x = Math.round(52 * Math.cos(rad));
            const y = Math.round(52 * Math.sin(rad));

            return (
              <button
                key={dir.key}
                type="button"
                onClick={() => onChange(dir.key)}
                title={`${dir.label} (${dir.key}) - ${dir.desc}`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
                className={`absolute w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/30 scale-125 z-10 shadow-lg shadow-amber-400/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                {dir.key}
              </button>
            );
          })}

          {/* Central Sun Indicator & Needle */}
          <div
            className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${current.angle}deg)` }}
          >
            <div className="w-1 h-5 bg-gradient-to-t from-transparent to-amber-400 rounded-full -translate-y-2" />
            <div className="absolute w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sun className="w-3 h-3 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Direction Chips for quick mobile tap */}
        <div className="grid grid-cols-4 gap-1.5 flex-1 w-full">
          {DIRECTIONS.map((dir) => {
            const isSelected = dir.key === value;
            return (
              <button
                key={dir.key}
                type="button"
                onClick={() => onChange(dir.key)}
                className={`py-1.5 px-1 rounded-lg text-xs font-medium text-center border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 font-bold shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-bold text-[11px]">{dir.key}</div>
                <div className="text-[9px] truncate opacity-70">{dir.angle}°</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
