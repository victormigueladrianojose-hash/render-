import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronsLeftRight, Eye } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = 'LuzRender',
  className = '',
}) => {
  const [position, setPosition] = useState<number>(50); // percentage 0 to 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(newPos);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  useEffect(() => {
    const onPointerMoveGlobal = (e: PointerEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };
    const onPointerUpGlobal = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', onPointerMoveGlobal);
      window.addEventListener('pointerup', onPointerUpGlobal);
    }
    return () => {
      window.removeEventListener('pointermove', onPointerMoveGlobal);
      window.removeEventListener('pointerup', onPointerUpGlobal);
    };
  }, [isDragging, handleMove]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Slider Container */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-2xl select-none cursor-ew-resize group"
      >
        {/* Underneath: AFTER image (LuzRender) */}
        <img
          src={afterImage}
          alt="Renderizado com nova luz"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Top layer: BEFORE image (Original) clipped to position% */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${position}%` }}
        >
          <img
            src={beforeImage}
            alt="Imagem original"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none max-w-none"
            style={{
              // Counteract container clipping so image maintains natural position
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
              height: containerRef.current ? `${containerRef.current.clientHeight}px` : '100%',
            }}
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none shadow-[0_0_12px_rgba(251,191,36,0.8)] z-10"
          style={{ left: `${position}%` }}
        >
          {/* Circular Drag Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-400 text-amber-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <ChevronsLeftRight className="w-4 h-4" />
          </div>
        </div>

        {/* Labels Overlay */}
        <div className="absolute top-3 left-3 pointer-events-none z-20">
          <span className="px-2.5 py-1 rounded-md bg-slate-950/80 text-slate-300 text-[11px] font-mono font-medium backdrop-blur-md border border-slate-700/60 shadow">
            {beforeLabel}
          </span>
        </div>
        <div className="absolute top-3 right-3 pointer-events-none z-20">
          <span className="px-2.5 py-1 rounded-md bg-amber-500/90 text-slate-950 text-[11px] font-mono font-bold backdrop-blur-md shadow-lg shadow-amber-500/20">
            {afterLabel}
          </span>
        </div>
      </div>

      {/* Quick controls bar under slider */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-400">
        <span className="flex items-center gap-1.5 text-[11px]">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          Arraste o divisor para comparar iluminação
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPosition(100)}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            100% Original
          </button>
          <button
            type="button"
            onClick={() => setPosition(50)}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
          >
            50/50
          </button>
          <button
            type="button"
            onClick={() => setPosition(0)}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            100% Render
          </button>
        </div>
      </div>
    </div>
  );
};
