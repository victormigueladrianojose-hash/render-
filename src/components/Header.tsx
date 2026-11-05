import React from 'react';
import { 
  Sun, 
  Camera, 
  Upload, 
  Monitor, 
  History, 
  Sparkles, 
  Layers, 
  ChevronDown,
  Box,
  FileText,
  PlusCircle,
  Globe
} from 'lucide-react';
import { SampleImage, SAMPLE_IMAGES } from '../lib/sampleImages';

interface HeaderProps {
  onNewCaptureScreen: () => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectSample: (sample: SampleImage) => void;
  onOpenHistory: () => void;
  historyCount: number;
  onOpenCadViewer: () => void;
  onOpenFloorplanConverter: () => void;
  onOpenObjectCompositor: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewCaptureScreen,
  onUploadFile,
  onSelectSample,
  onOpenHistory,
  historyCount,
  onOpenCadViewer,
  onOpenFloorplanConverter,
  onOpenObjectCompositor,
}) => {
  const [showCaptureMenu, setShowCaptureMenu] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
    setShowCaptureMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-300/40">
          <Sun className="w-5 h-5 text-slate-950 animate-spin-slow" />
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-950 rounded-full flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              Luz<span className="text-amber-400">Render</span>
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-500/30">
              4K UHD • 3D & CAD
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Simulação de Iluminação & Atmosfera Arquitetural
          </p>
        </div>
      </div>

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onUploadFile}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* SketchUp & AutoCAD 3D Viewer trigger */}
        <button
          onClick={onOpenCadViewer}
          className="hidden md:flex px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold items-center gap-1.5 transition cursor-pointer"
          title="Abrir cena 3D do SketchUp ou AutoCAD"
        >
          <Box className="w-4 h-4 text-amber-400" />
          <span>SketchUp / CAD 3D</span>
        </button>

        {/* Floorplan & Web Image Converter trigger */}
        <button
          onClick={onOpenFloorplanConverter}
          className="hidden lg:flex px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold items-center gap-1.5 transition cursor-pointer"
          title="Pegar imagem da web e virar em planta"
        >
          <FileText className="w-4 h-4 text-sky-400" />
          <span>Imagem ➔ Planta Baixa</span>
        </button>

        {/* Object Compositor trigger */}
        <button
          onClick={onOpenObjectCompositor}
          className="hidden xl:flex px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold items-center gap-1.5 transition cursor-pointer"
          title="Inserir e compor objeto na cena"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Inserir Objeto</span>
        </button>

        {/* History Button */}
        <button
          onClick={onOpenHistory}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <History className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Histórico</span>
          {historyCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-mono text-[10px] font-bold flex items-center justify-center">
              {historyCount}
            </span>
          )}
        </button>

        {/* Capture Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCaptureMenu(!showCaptureMenu)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Nova captura</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Dropdown Menu */}
          {showCaptureMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowCaptureMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-40 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                  Origem da Captura
                </div>

                {/* 1. Screen capture */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCaptureMenu(false);
                    onNewCaptureScreen();
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-start gap-3 transition text-left cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mt-0.5 group-hover:scale-105 transition-transform">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Capturar Ecrã / Janela</div>
                    <div className="text-[10px] text-slate-400">
                      Tire print do Revit, SketchUp, Blender ou navegador
                    </div>
                  </div>
                </button>

                {/* 2. File upload */}
                <button
                  type="button"
                  onClick={triggerFileUpload}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-start gap-3 transition text-left cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mt-0.5 group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Carregar Imagem (PNG/JPG)</div>
                    <div className="text-[10px] text-slate-400">Até resolução 4K Ultra HD</div>
                  </div>
                </button>

                {/* 3. SketchUp & AutoCAD 3D */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCaptureMenu(false);
                    onOpenCadViewer();
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-start gap-3 transition text-left cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mt-0.5 group-hover:scale-105 transition-transform">
                    <Box className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Abrir Cenas SketchUp / AutoCAD</div>
                    <div className="text-[10px] text-slate-400">Navegue em 3D e capture o ângulo exato</div>
                  </div>
                </button>

                {/* 4. Floorplan & Web Images */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCaptureMenu(false);
                    onOpenFloorplanConverter();
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-start gap-3 transition text-left cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mt-0.5 group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Imagem da Web ➔ Planta Baixa</div>
                    <div className="text-[10px] text-slate-400">Cole URL da internet e converta em planta</div>
                  </div>
                </button>

                {/* 5. Object Compositor */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCaptureMenu(false);
                    onOpenObjectCompositor();
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-start gap-3 transition text-left cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mt-0.5 group-hover:scale-105 transition-transform">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Inserir Objeto na Cena</div>
                    <div className="text-[10px] text-slate-400">Recorte automático e harmonização solar</div>
                  </div>
                </button>

                {/* Sample architectural renders */}
                <div className="pt-2 mt-1 border-t border-slate-800/80">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Modelos Arquiteturais de Teste
                  </div>
                  {SAMPLE_IMAGES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => {
                        setShowCaptureMenu(false);
                        onSelectSample(sample);
                      }}
                      className="w-full p-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between text-left text-xs transition cursor-pointer"
                    >
                      <span className="text-slate-300 font-medium truncate max-w-[190px]">
                        {sample.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">
                        {sample.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
