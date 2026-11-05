import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Check, 
  X, 
  Maximize2, 
  RotateCcw, 
  Square, 
  Monitor, 
  Upload, 
  Sparkles,
  Info
} from 'lucide-react';
import { CropArea } from '../types';

interface CaptureModalProps {
  initialImage: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCrop: (croppedDataUrl: string, originalDataUrl: string, cropArea: CropArea) => void;
  onSelectNewImage: () => void;
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | null;

export const CaptureModal: React.FC<CaptureModalProps> = ({
  initialImage,
  isOpen,
  onClose,
  onConfirmCrop,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImage);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displayedDimensions, setDisplayedDimensions] = useState<{ width: number; height: number; x: number; y: number }>({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });

  // Crop rectangle in normalized fractions (0 to 1) relative to displayed image
  const [crop, setCrop] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
  });

  const [activeHandle, setActiveHandle] = useState<HandleType>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; crop: typeof crop } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'free' | '16:9' | '4:3' | '1:1'>('free');

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (initialImage) {
      setImageSrc(initialImage);
    }
  }, [initialImage]);

  // Handle keyboard shortcuts (Enter to confirm, Esc to cancel)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, crop, naturalDimensions, imageSrc]);

  // Update displayed dimensions on resize or image load
  const updateLayout = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const container = containerRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    setDisplayedDimensions({
      width: imgRect.width,
      height: imgRect.height,
      x: imgRect.left - container.left,
      y: imgRect.top - container.top,
    });
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    // Default initial crop to centered 85%
    setCrop({
      x: 0.075,
      y: 0.075,
      width: 0.85,
      height: 0.85,
    });
    setTimeout(updateLayout, 50);
  };

  useEffect(() => {
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [updateLayout]);

  // Set predefined aspect ratio
  const applyAspectRatio = (ratio: 'free' | '16:9' | '4:3' | '1:1') => {
    setAspectRatio(ratio);
    if (ratio === 'free') return;

    let targetRatio = 1;
    if (ratio === '16:9') targetRatio = 16 / 9;
    if (ratio === '4:3') targetRatio = 4 / 3;
    if (ratio === '1:1') targetRatio = 1;

    // Adjust crop inside current dimensions
    const currentW = crop.width;
    const newH = currentW / targetRatio;
    if (newH <= 1 - crop.y) {
      setCrop((prev) => ({ ...prev, height: newH }));
    } else {
      const maxH = 1 - crop.y;
      setCrop((prev) => ({ ...prev, height: maxH, width: maxH * targetRatio }));
    }
  };

  const selectEntireImage = () => {
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
    setAspectRatio('free');
  };

  // Mouse / pointer down handlers for selection and resizing
  const onPointerDownHandle = (e: React.PointerEvent, handle: HandleType) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      crop: { ...crop },
    });
  };

  const onPointerDownContainer = (e: React.PointerEvent) => {
    if (!containerRef.current || !displayedDimensions.width) return;
    const container = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - container.left;
    const mouseY = e.clientY - container.top;

    // Check if clicked inside image
    const relX = (mouseX - displayedDimensions.x) / displayedDimensions.width;
    const relY = (mouseY - displayedDimensions.y) / displayedDimensions.height;

    if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
      // Start drawing a new crop from this point
      setActiveHandle('se');
      setCrop({
        x: relX,
        y: relY,
        width: 0.01,
        height: 0.01,
      });
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        crop: { x: relX, y: relY, width: 0.01, height: 0.01 },
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !dragStart || !displayedDimensions.width || !displayedDimensions.height) return;

    const dx = (e.clientX - dragStart.x) / displayedDimensions.width;
    const dy = (e.clientY - dragStart.y) / displayedDimensions.height;

    const initial = dragStart.crop;
    let next = { ...initial };

    if (activeHandle === 'move') {
      let nextX = initial.x + dx;
      let nextY = initial.y + dy;
      nextX = Math.max(0, Math.min(1 - initial.width, nextX));
      nextY = Math.max(0, Math.min(1 - initial.height, nextY));
      next.x = nextX;
      next.y = nextY;
    } else {
      if (activeHandle.includes('e')) {
        next.width = Math.min(1 - initial.x, Math.max(0.05, initial.width + dx));
      }
      if (activeHandle.includes('s')) {
        next.height = Math.min(1 - initial.y, Math.max(0.05, initial.height + dy));
      }
      if (activeHandle.includes('w')) {
        const potentialW = initial.width - dx;
        if (potentialW >= 0.05 && initial.x + dx >= 0) {
          next.x = initial.x + dx;
          next.width = potentialW;
        }
      }
      if (activeHandle.includes('n')) {
        const potentialH = initial.height - dy;
        if (potentialH >= 0.05 && initial.y + dy >= 0) {
          next.y = initial.y + dy;
          next.height = potentialH;
        }
      }

      // Aspect ratio constraint if active
      if (aspectRatio !== 'free') {
        const ratio = aspectRatio === '16:9' ? 16 / 9 : aspectRatio === '4:3' ? 4 / 3 : 1;
        next.height = next.width / ratio;
        if (next.y + next.height > 1) {
          next.height = 1 - next.y;
          next.width = next.height * ratio;
        }
      }
    }

    setCrop(next);
  };

  const onPointerUp = () => {
    setActiveHandle(null);
    setDragStart(null);
  };

  // Confirm crop and produce canvas data URL
  const handleConfirm = () => {
    if (!imageRef.current || !imageSrc || naturalDimensions.width === 0) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop in native pixels
    const cropX = Math.round(crop.x * naturalDimensions.width);
    const cropY = Math.round(crop.y * naturalDimensions.height);
    const cropW = Math.round(crop.width * naturalDimensions.width);
    const cropH = Math.round(crop.height * naturalDimensions.height);

    canvas.width = Math.max(1, cropW);
    canvas.height = Math.max(1, cropH);

    // Render crisp crop
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const croppedDataUrl = canvas.toDataURL('image/png');
    onConfirmCrop(croppedDataUrl, imageSrc, {
      x: cropX,
      y: cropY,
      width: cropW,
      height: cropH,
    });
  };

  if (!isOpen || !imageSrc) return null;

  // Real-time crop dimensions in physical pixels
  const pxWidth = Math.round(crop.width * naturalDimensions.width);
  const pxHeight = Math.round(crop.height * naturalDimensions.height);

  // Position of selection box relative to container in pixels
  const selectionStyle = {
    left: `${displayedDimensions.x + crop.x * displayedDimensions.width}px`,
    top: `${displayedDimensions.y + crop.y * displayedDimensions.height}px`,
    width: `${crop.width * displayedDimensions.width}px`,
    height: `${crop.height * displayedDimensions.height}px`,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800/80 px-4 md:px-8 flex items-center justify-between bg-slate-900/80 text-white z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Square className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Recorte & Seleção de Iluminação
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30 font-mono">
                {pxWidth} × {pxHeight} px
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Ajuste o retângulo sobre a área que deseja renderizar com nova iluminação.
            </p>
          </div>
        </div>

        {/* Aspect Ratio Presets */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          {(['free', '16:9', '4:3', '1:1'] as const).map((ratio) => (
            <button
              key={ratio}
              onClick={() => applyAspectRatio(ratio)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                aspectRatio === ratio
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {ratio === 'free' ? 'Livre' : ratio}
            </button>
          ))}
          <button
            onClick={selectEntireImage}
            title="Selecionar imagem completa"
            className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 flex items-center gap-1"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Tudo
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Cancelar <span className="opacity-50 text-[10px] hidden sm:inline">(Esc)</span>
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            Confirmar <span className="text-[10px] opacity-75 hidden sm:inline">(Enter)</span>
          </button>
        </div>
      </header>

      {/* Main Cropper Canvas Area */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDownContainer}
        className="relative flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden cursor-crosshair"
      >
        {/* The Image */}
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Captura original"
          onLoad={handleImageLoad}
          className="max-h-[calc(100vh-140px)] max-w-[calc(100vw-60px)] object-contain shadow-2xl rounded-sm pointer-events-none"
        />

        {/* Shaded Backdrop Overlay outside selection */}
        {displayedDimensions.width > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: `polygon(
                0% 0%, 0% 100%, 
                ${displayedDimensions.x}px 100%, 
                ${displayedDimensions.x}px ${displayedDimensions.y}px, 
                ${displayedDimensions.x + displayedDimensions.width}px ${displayedDimensions.y}px, 
                ${displayedDimensions.x + displayedDimensions.width}px ${displayedDimensions.y + displayedDimensions.height}px, 
                ${displayedDimensions.x}px ${displayedDimensions.y + displayedDimensions.height}px, 
                ${displayedDimensions.x}px 100%, 
                100% 100%, 100% 0%
              )`,
              backgroundColor: 'rgba(5, 8, 15, 0.75)',
            }}
          />
        )}

        {/* Dark mask covering the non-selected image region */}
        {displayedDimensions.width > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${displayedDimensions.x}px`,
              top: `${displayedDimensions.y}px`,
              width: `${displayedDimensions.width}px`,
              height: `${displayedDimensions.height}px`,
              clipPath: `polygon(
                0% 0%, 0% 100%, 
                ${crop.x * 100}% 100%, 
                ${crop.x * 100}% ${crop.y * 100}%, 
                ${(crop.x + crop.width) * 100}% ${crop.y * 100}%, 
                ${(crop.x + crop.width) * 100}% ${(crop.y + crop.height) * 100}%, 
                ${crop.x * 100}% ${(crop.y + crop.height) * 100}%, 
                ${crop.x * 100}% 100%, 
                100% 100%, 100% 0%
              )`,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
            }}
          />
        )}

        {/* Draggable & Resizable Selection Rectangle */}
        {displayedDimensions.width > 0 && (
          <div
            style={selectionStyle}
            onPointerDown={(e) => onPointerDownHandle(e, 'move')}
            className={`absolute border-2 border-amber-400 bg-amber-400/5 shadow-[0_0_25px_rgba(245,158,11,0.35)] cursor-move transition-shadow ${
              activeHandle === 'move' ? 'border-amber-300 ring-2 ring-amber-400/40' : ''
            }`}
          >
            {/* Rule of Thirds Grid Lines (Subtle guide) */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
              <div className="border-r border-b border-amber-300" />
              <div className="border-r border-b border-amber-300" />
              <div className="border-b border-amber-300" />
              <div className="border-r border-b border-amber-300" />
              <div className="border-r border-b border-amber-300" />
              <div className="border-b border-amber-300" />
              <div className="border-r border-amber-300" />
              <div className="border-r border-amber-300" />
              <div />
            </div>

            {/* Corner Handles */}
            <div
              onPointerDown={(e) => onPointerDownHandle(e, 'nw')}
              className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-amber-400 border-2 border-slate-950 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
            />
            <div
              onPointerDown={(e) => onPointerDownHandle(e, 'ne')}
              className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-amber-400 border-2 border-slate-950 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
            />
            <div
              onPointerDown={(e) => onPointerDownHandle(e, 'sw')}
              className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-amber-400 border-2 border-slate-950 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
            />
            <div
              onPointerDown={(e) => onPointerDownHandle(e, 'se')}
              className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-amber-400 border-2 border-slate-950 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
            />

            {/* Edge Handles */}
            <div
              onPointerDown={(e) => onPointerDownHandle(e, 'n')}
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-amber-400 border-2 border-slate-950 rounded-full cursor-ns-resize shadow-md hover:scale-110 transition-transform"
            />
            <div
              onPointerDown={(e) => onPointerDownHandle(e, 's')}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-amber-400 border-2 border-slate-950 rounded-full cursor-ns-resize shadow-md hover:scale-110 transition-transform"
            />
            <div
              onPointerDown={(e) => onPointerDownHandle(e, 'w')}
              className="absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-8 bg-amber-400 border-2 border-slate-950 rounded-full cursor-ew-resize shadow-md hover:scale-110 transition-transform"
            />
            <div
              onPointerDown={(e) => onPointerDownHandle(e, 'e')}
              className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-8 bg-amber-400 border-2 border-slate-950 rounded-full cursor-ew-resize shadow-md hover:scale-110 transition-transform"
            />

            {/* Floating Info Tag on Selection */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 text-amber-400 text-[10px] font-mono font-medium shadow pointer-events-none backdrop-blur-sm border border-amber-500/30 flex items-center gap-1">
              <span>{pxWidth} × {pxHeight}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hint Bar */}
      <footer className="h-10 border-t border-slate-800/80 px-6 flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 z-20">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span>Arraste para mover • Puxe pelas alças para redimensionar • Clique fora para nova seleção</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-slate-500">
          <span>Resolução Nativa: {naturalDimensions.width} × {naturalDimensions.height}</span>
          <span>Proporção: {aspectRatio.toUpperCase()}</span>
        </div>
      </footer>
    </div>
  );
};
