import React, { useState } from 'react';
import { Sparkles, X, Wand2, Lightbulb, CornerDownLeft } from 'lucide-react';
import { RenderVariation } from '../types';

interface RefineModalProps {
  variation: RenderVariation | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyRefine: (variation: RenderVariation, refinementPrompt: string) => void;
  isRefining: boolean;
}

const REFINE_PRESETS = [
  'Aumentar o brilho dos raios solares entrando pela janela.',
  'Tornar as sombras do piso mais nítidas e contrastadas.',
  'Intensificar o tom âmbar acolhedor das luminárias.',
  'Adicionar reflexos de luz especular nas superfícies brilhantes.',
  'Suavizar a atmosfera com uma névoa difusa e feixes volumétricos.',
];

export const RefineModal: React.FC<RefineModalProps> = ({
  variation,
  isOpen,
  onClose,
  onApplyRefine,
  isRefining,
}) => {
  const [prompt, setPrompt] = useState('');

  if (!isOpen || !variation) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isRefining) return;
    onApplyRefine(variation, prompt.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Refinar Variação #{variation.variationIndex}</h3>
              <p className="text-xs text-slate-400">Instruções adicionais de iluminação e atmosfera</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Thumbnail preview */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src={variation.imageUrl}
              alt="Variação a refinar"
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-mono text-amber-400 border border-amber-500/30">
              Base para novo render
            </div>
          </div>

          {/* Prompt textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              O que deseja ajustar na iluminação?
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex.: Acentuar a luz dourada batendo na parede, escurecer o teto, criar reflexos no piso..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none transition"
              autoFocus
            />
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-400" />
              Sugestões rápidas de refinamento:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {REFINE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-300 hover:text-white transition text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!prompt.trim() || isRefining}
              className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg ${
                !prompt.trim() || isRefining
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold hover:from-amber-300 hover:to-amber-400 shadow-amber-500/20 active:scale-95'
              }`}
            >
              {isRefining ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Refinando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Refinamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
