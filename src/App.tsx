import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Monitor, 
  Sparkles, 
  Sun, 
  Layers, 
  Clock, 
  Compass, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Crop,
  RefreshCw,
  FolderOpen,
  Paintbrush,
  Box,
  FileText,
  PlusCircle
} from 'lucide-react';
import { 
  RenderOptions, 
  RenderVariation, 
  HistoryItem, 
  CropArea 
} from './types';
import { SAMPLE_IMAGES, SampleImage } from './lib/sampleImages';
import { syncHistory, persistHistoryItem, removeHistoryItem } from './lib/db';
import { generatePhotometricRenders } from './lib/photometricEngine';
import { Header } from './components/Header';
import { CaptureModal } from './components/CaptureModal';
import { RenderControls } from './components/RenderControls';
import { AtmospherePreview } from './components/AtmospherePreview';
import { VariationCard } from './components/VariationCard';
import { RefineModal } from './components/RefineModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ObjectEditModal } from './components/ObjectEditModal';
import { CadViewerModal } from './components/CadViewerModal';
import { FloorplanConverterModal } from './components/FloorplanConverterModal';
import { ObjectCompositorModal } from './components/ObjectCompositorModal';

export default function App() {
  // Navigation / Capture state
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // New Modals state
  const [isCadViewerOpen, setIsCadViewerOpen] = useState(false);
  const [isFloorplanConverterOpen, setIsFloorplanConverterOpen] = useState(false);
  const [isObjectCompositorOpen, setIsObjectCompositorOpen] = useState(false);

  // Render options state (Portuguese parameters)
  const [options, setOptions] = useState<RenderOptions>({
    time: '18:15',
    sunDirection: 'SO',
    weather: 'limpo',
    internalLights: true,
    lightTemperature: 'quente',
    style: 'fotorrealista',
    variationsCount: 2,
    refinement: '',
    engineMode: 'gemini',
    resolution: '4K',
  });

  const [quotaBannerNotice, setQuotaBannerNotice] = useState<boolean>(false);

  // Variations result
  const [variations, setVariations] = useState<RenderVariation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Refine Modal state
  const [selectedVariationForRefine, setSelectedVariationForRefine] = useState<RenderVariation | null>(null);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  // Object Edit Modal state
  const [selectedImageForObjectEdit, setSelectedImageForObjectEdit] = useState<string | null>(null);
  const [isObjectEditModalOpen, setIsObjectEditModalOpen] = useState(false);

  // Load history on mount
  useEffect(() => {
    async function loadInitialHistory() {
      try {
        const items = await syncHistory();
        setHistoryItems(items);
      } catch (err) {
        console.warn('Initial history load error:', err);
      }
    }
    loadInitialHistory();
  }, []);

  // Screen Capture using getDisplayMedia
  const handleStartScreenCapture = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('A API de captura de ecrã não é suportada neste navegador.');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
        },
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        // Wait a small moment to ensure first frame is ready
        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1920;
          canvas.height = video.videoHeight || 1080;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');

            // Stop screen tracks
            stream.getTracks().forEach((track) => track.stop());

            setOriginalImage(dataUrl);
            setIsCropModalOpen(true);
          }
        }, 300);
      };
    } catch (err: any) {
      console.warn('Screen capture failed or cancelled:', err);
      if (err.name !== 'NotAllowedError') {
        setErrorMessage(
          'Não foi possível capturar o ecrã diretamente. Você pode carregar uma imagem ou usar os modelos arquiteturais de teste.'
        );
      }
    }
  };

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setOriginalImage(dataUrl);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  // Sample Selection
  const handleSelectSample = (sample: SampleImage) => {
    setErrorMessage(null);
    setOriginalImage(sample.dataUrl);
    setIsCropModalOpen(true);
  };

  // Confirm Crop
  const handleConfirmCrop = (croppedDataUrl: string, originalDataUrl: string, area: CropArea) => {
    setCroppedImage(croppedDataUrl);
    setOriginalImage(originalDataUrl);
    setCropArea(area);
    setIsCropModalOpen(false);
    // Clear previous variations when a new crop is confirmed
    setVariations([]);
    setStatusMessage('Área recortada com sucesso. Ajuste os parâmetros e gere o seu render.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Generate Render API call with Gemini & Photometric Engine fallback
  const handleGenerateRender = async (customImage?: string, customRefinement?: string) => {
    const targetImage = customImage || croppedImage;
    if (!targetImage) {
      setErrorMessage('Por favor, faça uma captura ou recorte uma imagem primeiro.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const optionsToSend = {
      ...options,
      refinement: customRefinement || options.refinement || '',
    };

    try {
      let finalVariations: RenderVariation[] = [];
      let promptUsed = `Edite esta imagem. Não crie uma cena nova.
REGRA PRINCIPAL: esta imagem é a referência exata. Mantenha idêntico: o ponto de vista da câmara, o enquadramento, a perspetiva, a geometria de todas as paredes, portas, janelas, telhado e mobiliário, a posição e o tamanho de cada objeto, os materiais, as texturas e as cores das superfícies. Não adicione, não remova, não mova e não redesenhe nenhum elemento. Não adicione pessoas, carros, plantas ou decoração que não existam na imagem. Não altere textos nem logótipos.
O QUE PODE MUDAR (apenas isto): a iluminação e a atmosfera: hora ${optionsToSend.time}, sol vindo de ${optionsToSend.sunDirection}, clima ${optionsToSend.weather}, luzes internas ${optionsToSend.internalLights ? 'ligadas' : 'desligadas'}, luz ${optionsToSend.lightTemperature}, estilo ${optionsToSend.style}.
QUALIDADE: render fotorrealista de arquitetura, nítido, com sombras e reflexos fisicamente coerentes com a direção da luz.`;
      let modelUsed = 'gemini-3.1-flash-lite-image';

      if (optionsToSend.engineMode === 'photometric') {
        setStatusMessage('Renderizando via Simulação Fotométrica em Tempo Real...');
        finalVariations = await generatePhotometricRenders(
          targetImage,
          optionsToSend,
          optionsToSend.variationsCount
        );
        modelUsed = 'Simulador Fotométrico Físico';
      } else {
        // Try Gemini Nano Banana API
        setStatusMessage('A enviar dados para a API do Gemini (Nano Banana)...');
        const res = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: targetImage,
            options: optionsToSend,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          // If Quota 429 exceeded on Free Tier
          if (res.status === 429 || data.quotaExceeded) {
            console.warn('[LuzRender] 429 Quota Exceeded. Running photometric simulation fallback...');
            setQuotaBannerNotice(true);
            setStatusMessage('Cota gratuita da API Gemini atingida. Ativando Simulação Fotométrica...');
            finalVariations = await generatePhotometricRenders(
              targetImage,
              optionsToSend,
              optionsToSend.variationsCount
            );
            modelUsed = 'Simulador Fotométrico (Fallback Cota 429)';
          } else {
            throw new Error(data.error || 'Falha ao processar renderização com Gemini.');
          }
        } else {
          finalVariations = data.variations;
          promptUsed = data.promptUsed || promptUsed;
          modelUsed = data.modelUsed || modelUsed;
        }
      }

      setVariations(finalVariations);
      setStatusMessage(`${finalVariations.length} render(s) gerado(s) com sucesso!`);
      setTimeout(() => setStatusMessage(null), 4000);

      // Save to Database
      const newHistoryItem: HistoryItem = {
        id: `render-${Date.now()}`,
        title: `Luz ${optionsToSend.time} • ${optionsToSend.sunDirection} • ${optionsToSend.weather}`,
        createdAt: new Date().toISOString(),
        originalImage: originalImage || targetImage,
        croppedImage: targetImage,
        cropArea: cropArea || undefined,
        options: optionsToSend,
        prompt: promptUsed,
        variations: finalVariations,
        modelUsed: modelUsed,
      };

      await persistHistoryItem(newHistoryItem);
      const updatedHistory = await syncHistory();
      setHistoryItems(updatedHistory);

      // Scroll to variations smoothly
      const el = document.getElementById('variations-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Render error:', err);
      // Graceful fallback to photometric simulation on error
      try {
        const fallbackVariations = await generatePhotometricRenders(
          targetImage,
          optionsToSend,
          optionsToSend.variationsCount
        );
        setVariations(fallbackVariations);
        setQuotaBannerNotice(true);
        setStatusMessage('Render gerado via Simulação Fotométrica em Tempo Real.');
      } catch {
        setErrorMessage(err.message || 'Erro inesperado na geração do render.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Refine handler
  const handleOpenRefine = (variation: RenderVariation) => {
    setSelectedVariationForRefine(variation);
    setIsRefineModalOpen(true);
  };

  const handleApplyRefine = async (variation: RenderVariation, refinementPrompt: string) => {
    setIsRefineModalOpen(false);
    setIsRefining(true);
    try {
      await handleGenerateRender(variation.imageUrl, refinementPrompt);
    } finally {
      setIsRefining(false);
    }
  };

  // Object Inpaint / Alteration handler
  const handleOpenObjectEdit = (targetImg: string) => {
    setSelectedImageForObjectEdit(targetImg);
    setIsObjectEditModalOpen(true);
  };

  const handleApplyObjectEdit = async (newImageDataUrl: string, editInstruction: string) => {
    const newVar: RenderVariation = {
      id: `obj-${Date.now()}`,
      imageUrl: newImageDataUrl,
      commentary: `Objeto/Área alterada: ${editInstruction}`,
      variationIndex: variations.length + 1,
      createdAt: new Date().toISOString(),
    };

    const updatedVariations = [newVar, ...variations];
    setVariations(updatedVariations);
    setStatusMessage('Objeto alterado com sucesso! Nova variação adicionada.');
    setTimeout(() => setStatusMessage(null), 4000);

    // Save to Database
    const newHistoryItem: HistoryItem = {
      id: `render-obj-${Date.now()}`,
      title: `Objeto: ${editInstruction.slice(0, 28)}...`,
      createdAt: new Date().toISOString(),
      originalImage: originalImage || croppedImage || newImageDataUrl,
      croppedImage: newImageDataUrl,
      options: options,
      prompt: `Alteração seletiva: ${editInstruction}`,
      variations: updatedVariations,
      modelUsed: options.engineMode === 'photometric' ? 'Simulador Fotométrico Local' : 'Gemini Nano Banana AI',
    };

    await persistHistoryItem(newHistoryItem);
    const updatedHistory = await syncHistory();
    setHistoryItems(updatedHistory);
  };

  // Load from History
  const handleLoadHistoryItem = (item: HistoryItem) => {
    setCroppedImage(item.croppedImage);
    setOriginalImage(item.originalImage);
    setCropArea(item.cropArea || null);
    setOptions(item.options);
    setVariations(item.variations);
    setStatusMessage('Projeto restaurado do histórico.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Delete History Item
  const handleDeleteHistoryItem = async (id: string) => {
    await removeHistoryItem(id);
    const updated = await syncHistory();
    setHistoryItems(updated);
  };

  // Clear All History
  const handleClearAllHistory = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistoryItems([]);
    } catch (e) {
      console.warn('Error clearing history:', e);
    }
  };

  // CAD / SketchUp View Captured
  const handleCadCapture = (imageDataUrl: string, sceneName: string) => {
    setCroppedImage(imageDataUrl);
    setOriginalImage(imageDataUrl);
    setVariations([]);
    setStatusMessage(`Cena "${sceneName}" capturada em ${options.resolution || '4K'}! Ajuste o sol e iluminação.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Floorplan Converted
  const handleFloorplanCaptured = (imageDataUrl: string, title: string) => {
    setCroppedImage(imageDataUrl);
    setOriginalImage(imageDataUrl);
    setVariations([]);
    setStatusMessage(`${title} carregada no estúdio.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Object Composited
  const handleObjectComposited = (newSceneDataUrl: string, desc: string) => {
    setCroppedImage(newSceneDataUrl);
    const newVar: RenderVariation = {
      id: `composite-${Date.now()}`,
      imageUrl: newSceneDataUrl,
      commentary: desc,
      variationIndex: variations.length + 1,
      createdAt: new Date().toISOString(),
    };
    setVariations([newVar, ...variations]);
    setStatusMessage('Objeto fundido com a cena e iluminação!');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Header */}
      <Header
        onNewCaptureScreen={handleStartScreenCapture}
        onUploadFile={handleFileUpload}
        onSelectSample={handleSelectSample}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={historyItems.length}
        onOpenCadViewer={() => setIsCadViewerOpen(true)}
        onOpenFloorplanConverter={() => setIsFloorplanConverterOpen(true)}
        onOpenObjectCompositor={() => setIsObjectCompositorOpen(true)}
      />

      {/* Quota Notice Banner */}
      {quotaBannerNotice && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2 backdrop-blur-md animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Modo Fotométrico em Tempo Real Ativo:</strong> A cota da chave gratuita do Gemini para modelos de imagem foi atingida (plano gratuito possui limite de 0 requisições para o modelo Nano Banana). As variações estão sendo geradas instantaneamente via Simulação Fotométrica Física local.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOptions((prev) => ({ ...prev, engineMode: 'photometric' }));
                setQuotaBannerNotice(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold text-[11px] hover:bg-amber-300 transition"
            >
              Usar Sempre Modo Fotométrico
            </button>
            <button
              onClick={() => setQuotaBannerNotice(false)}
              className="p-1 rounded text-amber-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Notification Toasts */}
      <div className="fixed top-18 right-4 z-40 max-w-md space-y-2 pointer-events-none">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs shadow-2xl flex items-start gap-3 backdrop-blur-md pointer-events-auto animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-rose-100">Erro na Operação</div>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs shadow-2xl flex items-center gap-2.5 backdrop-blur-md pointer-events-auto animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col">
        {!croppedImage ? (
          /* Initial Hero Landing View */
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-5xl mx-auto w-full text-center">
            {/* Glowing Hero Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6">
              <Sun className="w-3.5 h-3.5 animate-spin-slow" />
              <span>Simulação Fotométrica Arquitetural com IA</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl">
              Transforme a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">iluminação e atmosfera</span> do seu projeto num clique.
            </h1>

            <p className="mt-4 text-base md:text-lg text-slate-400 max-w-2xl">
              Capture ou carregue qualquer imagem de arquitetura, recorte a região com a ferramenta de screenshot e simule luz solar, clima, hora do dia e iluminação interna com Gemini Nano Banana.
            </p>

            {/* Primary Action Button */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleStartScreenCapture}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>Nova captura de ecrã</span>
              </button>

              <label className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Carregar ficheiro</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setIsCadViewerOpen(true)}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-amber-400/10 border border-amber-500/30 text-amber-300 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Box className="w-4 h-4 text-amber-400" />
                <span>SketchUp / CAD 3D</span>
              </button>

              <button
                onClick={() => setIsFloorplanConverterOpen(true)}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-sky-400/10 border border-sky-500/30 text-sky-300 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Imagem ➔ Planta Baixa</span>
              </button>
            </div>

            {/* Feature highlights grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full text-left">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
                  <Crop className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Ferramenta de Screenshot</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Overlay escuro em ecrã inteiro com alças arrastáveis e redimensionáveis para recortar a perspetiva exata.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-3">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Bússola Solar & Clima</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Controle azimute do sol (N a NO), hora do dia (05h às 22h), clima limpo, chuva ou nevoeiro e lâmpadas de 2700K a 6000K.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Slider Antes/Depois & Refino</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Compare as variações lado a lado sobre a captura original, baixe em alta resolução e faça ajustes adicionais de iluminação.
                </p>
              </div>
            </div>

            {/* Instant Sample Cards */}
            <div className="mt-12 w-full pt-8 border-t border-slate-800/80">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Ou experimente agora com um modelo arquitetural pronto:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_IMAGES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 transition-all text-left flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden border border-slate-800 flex-shrink-0">
                      <img
                        src={sample.dataUrl}
                        alt={sample.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                        {sample.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {sample.description}
                      </div>
                      <span className="inline-block text-[9px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded mt-1">
                        {sample.tag}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Editor View: Left = Cropped Image, Right = Options Panel */
          <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
            {/* Top Workspace Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCroppedImage(null)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                  title="Voltar ao início"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Estúdio de Iluminação LuzRender
                    {cropArea && (
                      <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {cropArea.width} × {cropArea.height} px
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Defina os parâmetros climáticos e solares à direita para transformar a cena.
                  </p>
                </div>
              </div>

              {/* Quick change / re-crop button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCropModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Crop className="w-4 h-4 text-amber-400" />
                  <span>Recortar Novamente</span>
                </button>
              </div>
            </div>

            {/* Main Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Cropped Image & Atmospheric Preview */}
              <div className="lg:col-span-6 space-y-6">
                {/* Cropped Base Image Box */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Imagem Base (Recorte Selecionado)
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setIsObjectCompositorOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Adicionar objeto externo (cadeira, vaso, sofá, luminária) e harmonizar com luz da cena"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
                        <span>Inserir Objeto</span>
                      </button>
                      <button
                        onClick={() => handleOpenObjectEdit(croppedImage)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Pintar máscara para alterar qualquer parte ou objeto da imagem"
                      >
                        <Paintbrush className="w-3.5 h-3.5 text-amber-400" />
                        <span>Alterar Objeto / Área</span>
                      </button>
                      <button
                        onClick={() => setIsCropModalOpen(true)}
                        className="text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        Recortar
                      </button>
                    </div>
                  </div>

                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 shadow-inner group">
                    <img
                      src={croppedImage}
                      alt="Imagem recortada"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1.5 rounded-lg bg-slate-900/90 text-white text-xs font-semibold backdrop-blur-md border border-slate-700">
                        Geometria e materiais preservados
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono">
                    <span>Mantenha geometria & câmara</span>
                    <span>Modifique apenas iluminação</span>
                  </div>
                </div>

                {/* Real-time Atmosphere Simulation Preview Widget */}
                <AtmospherePreview options={options} />
              </div>

              {/* Right Column: Interactive Render Controls */}
              <div className="lg:col-span-6">
                <RenderControls
                  options={options}
                  onChange={setOptions}
                  onGenerate={() => handleGenerateRender()}
                  isGenerating={isGenerating}
                />
              </div>
            </div>

            {/* Step 5: Variations Grid with Before/After Slider */}
            {variations.length > 0 && (
              <section id="variations-section" className="pt-8 border-t border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      Resultados Renderizados ({variations.length} {variations.length === 1 ? 'Variação' : 'Variações'})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Arraste o divisor central em qualquer variação para inspecionar a transição de luz antes e depois.
                    </p>
                  </div>

                  <button
                    onClick={() => handleGenerateRender()}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Gerar Novas Alternativas</span>
                  </button>
                </div>

                {/* Grid */}
                <div
                  className={`grid gap-6 ${
                    variations.length === 1
                      ? 'grid-cols-1 max-w-2xl mx-auto'
                      : variations.length === 2
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                  }`}
                >
                  {variations.map((variation) => (
                    <VariationCard
                      key={variation.id}
                      variation={variation}
                      originalImage={croppedImage}
                      onRefine={handleOpenRefine}
                      onEditObject={(v) => handleOpenObjectEdit(v.imageUrl)}
                      optionsSummary={`${options.time} • Sol ${options.sunDirection} • ${options.weather}`}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Screenshot Crop Modal Overlay */}
      <CaptureModal
        initialImage={originalImage}
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onConfirmCrop={handleConfirmCrop}
        onSelectNewImage={handleStartScreenCapture}
      />

      {/* Refine Variation Modal */}
      <RefineModal
        variation={selectedVariationForRefine}
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        onApplyRefine={handleApplyRefine}
        isRefining={isRefining}
      />

      {/* Object Inpainting / Selective Region Edit Modal */}
      <ObjectEditModal
        imageSrc={selectedImageForObjectEdit}
        isOpen={isObjectEditModalOpen}
        onClose={() => setIsObjectEditModalOpen(false)}
        onApplyEdit={handleApplyObjectEdit}
        engineMode={options.engineMode}
      />

      {/* Persistent History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={historyItems}
        onLoadItem={handleLoadHistoryItem}
        onDeleteItem={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
      />

      {/* 3D CAD & SketchUp Viewer Modal */}
      <CadViewerModal
        isOpen={isCadViewerOpen}
        onClose={() => setIsCadViewerOpen(false)}
        onCaptureScene={handleCadCapture}
      />

      {/* Web Image to Floorplan Converter Modal */}
      <FloorplanConverterModal
        isOpen={isFloorplanConverterOpen}
        onClose={() => setIsFloorplanConverterOpen(false)}
        onSendToStudio={handleFloorplanCaptured}
      />

      {/* Object Cutout & Scene Compositor Modal */}
      <ObjectCompositorModal
        isOpen={isObjectCompositorOpen}
        sceneImage={croppedImage}
        onClose={() => setIsObjectCompositorOpen(false)}
        onApplyComposite={handleObjectComposited}
        options={options}
      />
    </div>
  );
}
