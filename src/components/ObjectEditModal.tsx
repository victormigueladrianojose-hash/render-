import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, 
  Paintbrush, 
  Eraser, 
  RotateCcw, 
  X, 
  Sparkles, 
  Check, 
  Layers, 
  Sliders, 
  Info,
  Maximize2
} from 'lucide-react';
import { applyLocalObjectInpaint } from '../lib/objectEditor';

interface ObjectEditModalProps {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyEdit: (newImageDataUrl: string, editInstruction: string) => void;
  engineMode?: 'gemini' | 'photometric';
}

const OBJECT_PRESETS = [
  { label: '🛋️ Trocar sofá por poltrona de couro', text: 'Substituir o sofá por uma poltrona contemporânea em couro caramelo elegante.' },
  { label: '🪴 Adicionar planta (Costela-de-Adão)', text: 'Adicionar uma planta ornamental grande em vaso de cerâmica nesta área.' },
  { label: '🪵 Piso de madeira nogueira', text: 'Substituir o revestimento do piso por tábuas de madeira nobre de nogueira.' },
  { label: '🏛️ Revestir com mármore Calacatta', text: 'Mudar a superfície para mármore branco polido com veios nobres.' },
  { label: '💡 Pendente escultural dourado', text: 'Trocar a luminária por um pendente escultural contemporâneo em latão escovado.' },
  { label: '🖼️ Quadro de arte contemporânea', text: 'Colocar um grande quadro de pintura abstrata contemporânea nesta parede.' },
  { label: '🧱 Parede em cimento queimado', text: 'Revestir esta parede com acabamento em cimento queimado fosco moderno.' },
  { label: '🪟 Esquadrias em alumínio preto', text: 'Mudar os caixilhos e esquadrias da janela para alumínio preto fosco minimalista.' },
];

export const ObjectEditModal: React.FC<ObjectEditModalProps> = ({
  imageSrc,
  isOpen,
  onClose,
  onApplyEdit,
  engineMode = 'gemini',
}) => {
  const [instruction, setInstruction] = useState('');
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState<number>(36);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeEngine, setActiveEngine] = useState<'gemini' | 'photometric'>(engineMode);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize canvas with image and empty mask
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      maskCanvas.width = img.naturalWidth;
      maskCanvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
      setHasMask(false);
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  // Clear mask
  const handleClearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const ctx = maskCanvas.getContext('2d');
      ctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      setHasMask(false);
    }
  };

  // Convert mouse event to canvas coordinates
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const drawOnMask = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    ctx.lineWidth = brushSize * (maskCanvas.width / 800);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)'; // Glowing amber mask
      ctx.fillStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.beginPath();
      ctx.arc(x, y, (brushSize / 2) * (maskCanvas.width / 800), 0, Math.PI * 2);
      ctx.fill();
      setHasMask(true);
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, (brushSize / 2) * (maskCanvas.width / 800), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    drawOnMask(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    drawOnMask(e);
  };

  const onPointerUp = () => {
    setIsDrawing(false);
  };

  // Submit object alteration
  const handleApply = async () => {
    if (!instruction.trim() || isProcessing) return;
    setIsProcessing(true);

    try {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) throw new Error('Máscara não encontrada');

      let finalResultUrl: string | null = null;

      if (activeEngine === 'gemini') {
        try {
          const res = await fetch('/api/edit-object', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: imageSrc,
              instruction: instruction.trim(),
            }),
          });

          const data = await res.json();
          if (res.ok && data.success && data.imageUrl) {
            finalResultUrl = data.imageUrl;
          } else {
            console.warn('Gemini edit object fallback to local inpainting:', data.error);
          }
        } catch (err) {
          console.warn('Error calling /api/edit-object, fallback:', err);
        }
      }

      // If Gemini wasn't chosen or failed due to quota 429: use local inpainting engine!
      if (!finalResultUrl) {
        finalResultUrl = await applyLocalObjectInpaint(
          imageSrc,
          maskCanvas,
          instruction.trim()
        );
      }

      onApplyEdit(finalResultUrl, instruction.trim());
      onClose();
    } catch (err: any) {
      console.error('Failed to apply object edit:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <header className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Alterar Objeto / Área Seletiva
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-mono border border-amber-500/30">
                  Inpainting Inteligente
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pinte sobre o objeto ou área que deseja trocar (ex.: sofá, parede, piso, janela, iluminação)
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

        {/* Workspace: Left = Interactive Canvas, Right = Controls & Presets */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Canvas Painting Area */}
          <div
            ref={containerRef}
            className="flex-1 relative bg-slate-950 p-4 flex flex-col items-center justify-center overflow-auto min-h-[300px]"
          >
            {/* Toolbar on top of canvas */}
            <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-lg">
              <button
                type="button"
                onClick={() => setTool('brush')}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  tool === 'brush'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Paintbrush className="w-4 h-4" />
                <span>Pincel</span>
              </button>

              <button
                type="button"
                onClick={() => setTool('eraser')}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  tool === 'eraser'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Eraser className="w-4 h-4" />
                <span>Borracha</span>
              </button>

              <div className="h-4 w-[1px] bg-slate-700 mx-1" />

              {/* Brush size slider */}
              <div className="flex items-center gap-2 px-2 text-xs text-slate-300">
                <span className="text-[10px] text-slate-400 font-mono">Tamanho:</span>
                <input
                  type="range"
                  min={8}
                  max={90}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <span className="font-mono text-[10px] w-6">{brushSize}px</span>
              </div>

              <div className="h-4 w-[1px] bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={handleClearMask}
                title="Limpar seleção"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Stacked Canvases: Base Image + Mask Overlay */}
            <div className="relative max-w-full max-h-[calc(90vh-180px)] rounded-xl overflow-hidden shadow-2xl border border-slate-800">
              {/* Underlying Base Image Canvas */}
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[calc(90vh-180px)] object-contain pointer-events-none block"
              />

              {/* Mask Painting Canvas on top */}
              <canvas
                ref={maskCanvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                className="absolute inset-0 w-full h-full object-contain cursor-crosshair touch-none"
              />
            </div>

            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Dica: Pinte a área do objeto que deseja substituir ou transformar com precisão.</span>
            </div>
          </div>

          {/* Right Sidebar: Instruction Input, Presets & Engine Mode */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col justify-between bg-slate-900/60 overflow-y-auto space-y-4">
            <div className="space-y-4">
              {/* Instruction Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-400" />
                  Como deseja alterar a área selecionada?
                </label>
                <textarea
                  rows={3}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Ex.: Trocar o sofá por uma poltrona de couro marrom, mudar o piso para mármore..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none transition"
                  autoFocus
                />
              </div>

              {/* Presets Grid */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Alterações Rápidas de Objetos:
                </span>
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {OBJECT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInstruction(preset.text)}
                      className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-300 hover:text-white transition text-left flex items-center justify-between group"
                    >
                      <span className="truncate">{preset.label}</span>
                      <span className="text-amber-400 opacity-0 group-hover:opacity-100 text-[10px] ml-1">
                        Usar ↗
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Engine Choice */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Modo de Processamento:</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    {activeEngine === 'gemini' ? 'Gemini Nano Banana' : 'Simulação Fotométrica'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveEngine('gemini')}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium transition ${
                      activeEngine === 'gemini'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    IA Gemini (Nuvem)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEngine('photometric')}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium transition ${
                      activeEngine === 'photometric'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    Fotométrica (Livre)
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!instruction.trim() || isProcessing}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg ${
                  !instruction.trim() || isProcessing
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 shadow-amber-500/20 active:scale-95 cursor-pointer'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Aplicando Alteração...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Alterar Objeto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
