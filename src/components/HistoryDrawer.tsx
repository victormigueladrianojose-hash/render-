import React from 'react';
import { History, X, Trash2, ArrowRight, Clock, Sun, Sparkles } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onLoadItem,
  onDeleteItem,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Histórico de Renders</h3>
              <p className="text-xs text-slate-400">{items.length} projetos guardados na base de dados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <History className="w-12 h-12 mb-3 opacity-30 text-amber-400" />
              <p className="text-sm font-medium text-slate-400">Nenhum render histórico ainda</p>
              <p className="text-xs mt-1 text-slate-500">
                Os seus renders e capturas recortadas serão gravados automaticamente aqui.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition flex flex-col gap-2.5 group"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                    {item.title || 'Render Sem Título'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.createdAt).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Thumbnails preview */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                    <img
                      src={item.croppedImage || item.originalImage}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-slate-300">
                      Original
                    </span>
                  </div>

                  <div className="relative aspect-video rounded-lg overflow-hidden border border-amber-500/30 bg-slate-900">
                    {item.variations?.[0]?.imageUrl ? (
                      <img
                        src={item.variations[0].imageUrl}
                        alt="Render"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                        Pendente
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-[9px] font-mono text-slate-950 font-bold">
                      {item.variations?.length || 0} var.
                    </span>
                  </div>
                </div>

                {/* Badges of options used */}
                <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                    🕒 {item.options.time}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    🧭 Sol {item.options.sunDirection}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                    ⛅ {item.options.weather}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                    ✨ {item.options.style}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    title="Remover do histórico"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      onLoadItem(item);
                      onClose();
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition border border-amber-500/30"
                  >
                    <span>Abrir no Editor</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <button
              onClick={onClearAll}
              className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar todo o histórico
            </button>
            <span className="text-[11px] text-slate-500">Guardado local e servidor</span>
          </div>
        )}
      </div>
    </div>
  );
};
