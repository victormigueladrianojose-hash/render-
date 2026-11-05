import React, { useState } from 'react';
import { Download, Sparkles, Maximize2, Copy, Check, MessageSquare } from 'lucide-react';
import { RenderVariation } from '../types';
import { BeforeAfterSlider } from './BeforeAfterSlider';

interface VariationCardProps {
  variation: RenderVariation;
  originalImage: string;
  onRefine: (variation: RenderVariation) => void;
  onEditObject?: (variation: RenderVariation) => void;
  optionsSummary?: string;
}

export const VariationCard: React.FC<VariationCardProps> = ({
  variation,
  originalImage,
  onRefine,
  onEditObject,
  optionsSummary,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Download high-resolution PNG
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = variation.imageUrl;
    link.download = `LuzRender-var${variation.variationIndex}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    try {
      // Fetch blob from dataUrl
      const res = await fetch(variation.imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy base64 text
      navigator.clipboard.writeText(variation.imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden hover:border-slate-700/80 transition-all duration-300">
        {/* Card Header */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold font-mono text-[11px] flex items-center justify-center">
              {variation.variationIndex}
            </span>
            <span className="font-semibold text-slate-200">
              Variação #{variation.variationIndex}
            </span>
            {variation.resolution && (
              <span className="font-mono text-[10px] bg-amber-400/15 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/25 font-bold">
                {variation.resolution}
              </span>
            )}
            {variation.dimensions && (
              <span className="font-mono text-[9px] text-slate-400 hidden sm:inline">
                {variation.dimensions.width}×{variation.dimensions.height}
              </span>
            )}
          </div>
          {optionsSummary && (
            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
              {optionsSummary}
            </span>
          )}
        </div>

        {/* Before/After Interactive Comparison Slider */}
        <div className="p-3 bg-slate-950/20">
          <BeforeAfterSlider
            beforeImage={originalImage}
            afterImage={variation.imageUrl}
            beforeLabel="Antes (Original)"
            afterLabel="Depois (Render)"
          />
        </div>

        {/* Commentary if model provided commentary */}
        {variation.commentary && (
          <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 text-[11px] text-slate-400 flex items-start gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400/80 mt-0.5 flex-shrink-0" />
            <span className="italic line-clamp-2">{variation.commentary}</span>
          </div>
        )}

        {/* Card Footer Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              title="Copiar imagem"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              title="Visualizar em ecrã inteiro"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              title="Download em alta resolução"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Baixar {variation.resolution || 'HD'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {onEditObject && (
              <button
                type="button"
                onClick={() => onEditObject(variation)}
                title="Pintar e alterar qualquer objeto ou área específica"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Alterar Objeto</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onRefine(variation)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <span>Refinar Luz</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md p-4 md:p-8 flex flex-col items-center justify-center cursor-zoom-out"
        >
          <div className="w-full max-w-5xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-semibold">
                Variação #{variation.variationIndex} • Comparação em Ecrã Inteiro
              </span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
              >
                Fechar (Esc)
              </button>
            </div>
            <BeforeAfterSlider
              beforeImage={originalImage}
              afterImage={variation.imageUrl}
              className="w-full"
            />
          </div>
        </div>
      )}
    </>
  );
};
