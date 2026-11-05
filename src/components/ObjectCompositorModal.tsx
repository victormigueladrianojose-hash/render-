import React, { useState, useRef, useEffect } from 'react';
import { 
  PlusCircle, 
  Upload, 
  Globe, 
  Sparkles, 
  Move, 
  Maximize2, 
  RotateCw, 
  Sun, 
  Check, 
  X, 
  Scissors,
  Layers,
  Sliders
} from 'lucide-react';
import { RenderOptions } from '../types';

interface ObjectCompositorModalProps {
  sceneImage: string | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyComposite: (newSceneDataUrl: string, description: string) => void;
  options: RenderOptions;
}

const SAMPLE_OBJECTS = [
  { name: 'Poltrona Lounge em Couro Eames', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80' },
  { name: 'Vaso com Planta Ficus Lyrata', url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&auto=format&fit=crop&q=80' },
  { name: 'Mesa de Centro em Mármore', url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&auto=format&fit=crop&q=80' },
];

export const ObjectCompositorModal: React.FC<ObjectCompositorModalProps> = ({
  sceneImage,
  isOpen,
  onClose,
  onApplyComposite,
  options,
}) => {
  const [objectUrl, setObjectUrl] = useState('');
  const [objectImgSrc, setObjectImgSrc] = useState<string | null>(null);
  const [bgTolerance, setBgTolerance] = useState<number>(35); // 0 to 100 for auto background removal
  
  // Transform properties of the object inside the scene
  const [posX, setPosX] = useState(50); // % from left
  const [posY, setPosY] = useState(65); // % from top
  const [scale, setScale] = useState(45); // % size
  const [rotation, setRotation] = useState(0); // degrees
  const [shadowOpacity, setShadowOpacity] = useState(60); // % contact shadow
  const [isProcessing, setIsProcessing] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedObjectCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize with sample object or uploaded
  useEffect(() => {
    if (isOpen && !objectImgSrc) {
      setObjectImgSrc(SAMPLE_OBJECTS[0].url);
    }
  }, [isOpen, objectImgSrc]);

  // Process object: remove white/solid background with alpha threshold
  useEffect(() => {
    if (!objectImgSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      // Sample corner color as background reference
      const bgR = d[0];
      const bgG = d[1];
      const bgB = d[2];
      const tolerance = (bgTolerance / 100) * 441; // Euclidean distance max ~ 441.6

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        // Euclidean color distance from background corner
        const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        // Also check if near white/light grey (standard studio cutout)
        const isNearWhite = r > 230 && g > 230 && b > 230;

        if (dist < tolerance || isNearWhite) {
          // Smooth fade near edges
          const alphaFactor = Math.max(0, Math.min(1, (dist - tolerance * 0.7) / (tolerance * 0.3)));
          d[i + 3] = Math.round(d[i + 3] * alphaFactor);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      processedObjectCanvasRef.current = canvas;
      renderCompositePreview();
    };
    img.src = objectImgSrc;
  }, [objectImgSrc, bgTolerance]);

  // Render combined composite preview
  const renderCompositePreview = () => {
    if (!sceneImage || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sceneImg = new Image();
    sceneImg.crossOrigin = 'anonymous';
    sceneImg.onload = () => {
      canvas.width = sceneImg.naturalWidth;
      canvas.height = sceneImg.naturalHeight;

      // 1. Draw architectural scene
      ctx.drawImage(sceneImg, 0, 0, canvas.width, canvas.height);

      if (!processedObjectCanvasRef.current) return;
      const objCanvas = processedObjectCanvasRef.current;

      const objW = (canvas.width * (scale / 100));
      const objH = objCanvas.height * (objW / objCanvas.width);

      const targetX = (canvas.width * (posX / 100)) - (objW / 2);
      const targetY = (canvas.height * (posY / 100)) - (objH / 2);

      // 2. Draw soft contact shadow beneath object
      if (shadowOpacity > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(15, 23, 42, ${shadowOpacity / 100 * 0.7})`;
        ctx.beginPath();
        ctx.ellipse(
          targetX + objW / 2,
          targetY + objH * 0.96,
          objW * 0.45,
          objH * 0.1,
          0,
          0,
          Math.PI * 2
        );
        ctx.filter = 'blur(12px)';
        ctx.fill();
        ctx.restore();
      }

      // 3. Draw object with transform
      ctx.save();
      ctx.translate(targetX + objW / 2, targetY + objH / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Harmonize object lighting color with scene temperature
      if (options.lightTemperature === 'quente') {
        ctx.filter = 'sepia(0.18) saturate(1.1) brightness(1.02)';
      } else if (options.lightTemperature === 'fria') {
        ctx.filter = 'hue-rotate(8deg) saturate(0.95) brightness(1.04)';
      }

      ctx.drawImage(objCanvas, -objW / 2, -objH / 2, objW, objH);
      ctx.restore();
    };
    sceneImg.src = sceneImage;
  };

  useEffect(() => {
    renderCompositePreview();
  }, [posX, posY, scale, rotation, shadowOpacity, options]);

  // Handle local file upload
  const handleObjectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setObjectImgSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Confirm Composite
  const handleConfirm = () => {
    if (!previewCanvasRef.current) return;
    setIsProcessing(true);
    const finalDataUrl = previewCanvasRef.current.toDataURL('image/png', 0.98);
    onApplyComposite(finalDataUrl, 'Composição de objeto na cena com sombra de contacto e luz harmonizada');
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen || !sceneImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[94vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <header className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Compositor de Objetos na Cena
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-mono border border-amber-500/30">
                  Recorte Automático & Sombra
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Carregue ou cole qualquer foto de objeto da internet, remova o fundo e posicione na cena com iluminação natural.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Canvas Preview Area */}
          <div className="flex-1 bg-slate-950 p-4 flex flex-col items-center justify-center overflow-auto min-h-[360px] relative">
            <canvas
              ref={previewCanvasRef}
              className="max-w-full max-h-[calc(90vh-180px)] object-contain rounded-xl shadow-2xl border border-slate-800"
            />
            <div className="absolute bottom-6 left-6 px-3 py-1.5 rounded-lg bg-slate-900/90 text-[11px] text-slate-300 backdrop-blur-md border border-slate-800 flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Harmonizado com Sol às {options.time} ({options.sunDirection})</span>
            </div>
          </div>

          {/* Right Controls Panel */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col justify-between bg-slate-900/60 overflow-y-auto space-y-4">
            <div className="space-y-4">
              {/* 1. Object Source */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  1. Imagem do Objeto (Upload ou URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://exemplo.com/poltrona.jpg"
                    value={objectUrl}
                    onChange={(e) => {
                      setObjectUrl(e.target.value);
                      setObjectImgSrc(e.target.value);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-xs font-medium cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload</span>
                    <input
                      type="file"
                      onChange={handleObjectUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Samples */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                  {SAMPLE_OBJECTS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setObjectImgSrc(sample.url)}
                      className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white border border-slate-700 truncate max-w-[130px]"
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Recorte & Remoção de Fundo */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                    Tolerância de Remoção de Fundo
                  </span>
                  <span className="font-mono text-amber-400">{bgTolerance}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={bgTolerance}
                  onChange={(e) => setBgTolerance(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <span className="text-[10px] text-slate-500">
                  Remove automaticamente fundos brancos/claros deixando o objeto recortado.
                </span>
              </div>

              {/* 3. Posicionamento na Cena */}
              <div className="space-y-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-amber-400" />
                  Posição & Dimensão na Cena
                </span>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Posição X (Horizontal)</span>
                    <span className="font-mono">{posX}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Posição Y (Vertical / Piso)</span>
                    <span className="font-mono">{posY}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Escala do Objeto</span>
                    <span className="font-mono">{scale}%</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={90}
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Sombra de Contacto no Piso</span>
                    <span className="font-mono">{shadowOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={shadowOpacity}
                    onChange={(e) => setShadowOpacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Fundir Objeto na Cena</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
