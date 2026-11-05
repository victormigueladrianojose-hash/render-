import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  X, 
  Camera, 
  Upload, 
  RotateCw, 
  Sun, 
  Box, 
  Compass, 
  Eye, 
  Sparkles, 
  Layers, 
  Maximize2,
  FileCode,
  Info
} from 'lucide-react';
import { 
  parseDxfToThree, 
  parseObjToThree, 
  parseGltfToThree,
  parseColladaToThree,
  extractSkpThumbnail,
  createSampleSketchUpVilla, 
  createSampleAutoCadFloorplan 
} from '../lib/cadParser';
import { RenderResolution } from '../types';

interface CadViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureScene: (imageDataUrl: string, sceneName: string) => void;
}

export const CadViewerModal: React.FC<CadViewerModalProps> = ({
  isOpen,
  onClose,
  onCaptureScene,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const currentModelRef = useRef<THREE.Group | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  const [activeModelName, setActiveModelName] = useState<string>('Villa Contemporânea (SketchUp)');
  const [styleMode, setStyleMode] = useState<'shaded' | 'sketchup' | 'wireframe'>('sketchup');
  const [captureResolution, setCaptureResolution] = useState<RenderResolution>('4K');
  const [isRotating, setIsRotating] = useState(false);
  const [sunAngle, setSunAngle] = useState(45);

  // SketchUp .skp preview and guide states
  const [skpModalData, setSkpModalData] = useState<{
    fileName: string;
    previewUrl: string | null;
  } | null>(null);
  const [showExportGuide, setShowExportGuide] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Orbit controls state
  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 24, theta: Math.PI / 4, phi: Math.PI / 3 });
  const targetRef = useRef(new THREE.Vector3(0, 2, 0));

  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = sphericalRef.current;
    const x = targetRef.current.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = targetRef.current.y + radius * Math.cos(phi);
    const z = targetRef.current.z + radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(targetRef.current);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const width = mountRef.current.clientWidth || 900;
    const height = mountRef.current.clientHeight || 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Ambient and Directional Sun Light
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    dirLight.position.set(15, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Architectural Ground Grid
    const grid = new THREE.GridHelper(40, 40, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Load initial model (Villa SketchUp)
    const initialModel = createSampleSketchUpVilla();
    currentModelRef.current = initialModel;
    scene.add(initialModel);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (isRotating) {
        sphericalRef.current.theta += 0.005;
        updateCameraPosition();
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [isOpen, updateCameraPosition]);

  // Update Sun Direction in 3D Scene
  useEffect(() => {
    if (!dirLightRef.current) return;
    const rad = (sunAngle * Math.PI) / 180;
    dirLightRef.current.position.set(20 * Math.cos(rad), 20, 20 * Math.sin(rad));
  }, [sunAngle]);

  // Load Model Helper
  const loadModel = (model: THREE.Group, name: string) => {
    if (!sceneRef.current) return;
    if (currentModelRef.current) {
      sceneRef.current.remove(currentModelRef.current);
    }
    currentModelRef.current = model;
    sceneRef.current.add(model);
    setActiveModelName(name);

    // Reframe camera
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    targetRef.current.copy(center);
    sphericalRef.current.radius = Math.max(size.x, size.y, size.z) * 2.2;
    updateCameraPosition();
  };

  // Mouse drag handlers for Orbiting
  const onPointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    if (e.buttons === 1) {
      // Rotate
      sphericalRef.current.theta -= deltaX * 0.008;
      sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi - deltaY * 0.008));
    } else if (e.buttons === 2) {
      // Pan
      targetRef.current.x -= deltaX * 0.03;
      targetRef.current.z -= deltaY * 0.03;
    }

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    updateCameraPosition();
  };

  const onPointerUp = () => {
    isDraggingRef.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    sphericalRef.current.radius = Math.max(4, Math.min(100, sphericalRef.current.radius + e.deltaY * 0.03));
    updateCameraPosition();
  };

  // Camera presets
  const setCameraView = (view: 'iso' | 'front' | 'top' | 'human') => {
    if (view === 'iso') {
      sphericalRef.current.theta = Math.PI / 4;
      sphericalRef.current.phi = Math.PI / 3;
    } else if (view === 'front') {
      sphericalRef.current.theta = 0;
      sphericalRef.current.phi = Math.PI / 2.2;
    } else if (view === 'top') {
      sphericalRef.current.theta = 0;
      sphericalRef.current.phi = 0.05; // Looking straight down
    } else if (view === 'human') {
      sphericalRef.current.theta = Math.PI / 5;
      sphericalRef.current.phi = Math.PI / 2.05; // Eye level
      sphericalRef.current.radius = 14;
    }
    updateCameraPosition();
  };

  // File Upload with multi-format support: .skp, .dae, .gltf, .glb, .obj, .dxf, and 2D images
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsParsing(true);
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.skp')) {
        // Native SketchUp binary file: extract high-res embedded camera thumbnail
        const arrayBuf = await file.arrayBuffer();
        const extractedThumbnail = extractSkpThumbnail(arrayBuf);
        setSkpModalData({
          fileName: file.name,
          previewUrl: extractedThumbnail,
        });
      } else if (fileName.endsWith('.dae')) {
        // Collada format (universal built-in 3D export in SketchUp Free/Make/Pro)
        const text = await file.text();
        const group = await parseColladaToThree(text);
        loadModel(group, `SketchUp Collada 3D (${file.name})`);
      } else if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
        // GLTF / GLB format
        const arrayBuf = await file.arrayBuffer();
        const group = await parseGltfToThree(arrayBuf);
        loadModel(group, `SketchUp GLTF 3D (${file.name})`);
      } else if (fileName.endsWith('.obj')) {
        // Universal OBJ format
        const text = await file.text();
        const group = parseObjToThree(text);
        loadModel(group, `SketchUp 3D OBJ (${file.name})`);
      } else if (fileName.endsWith('.dxf')) {
        // AutoCAD DXF format
        const text = await file.text();
        const group = parseDxfToThree(text);
        loadModel(group, `AutoCAD DXF (${file.name})`);
      } else if (file.type.startsWith('image/')) {
        // 2D image export snapshot from SketchUp
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            onCaptureScene(reader.result as string, `Export SketchUp (${file.name})`);
            onClose();
          }
        };
        reader.readAsDataURL(file);
      } else {
        throw new Error(
          `Formato "${file.name}" não suportado. Formatos aceitos: .skp, .dae, .obj, .gltf, .dxf`
        );
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setUploadError(
        err.message || 'Falha ao processar ficheiro do SketchUp. Verifique o guia de exportação.'
      );
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  // High-Resolution Snapshot Capture
  const handleCaptureSnapshot = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // Define target pixel size
    let targetW = 1920;
    let targetH = 1080;
    if (captureResolution === '2K') {
      targetW = 2560;
      targetH = 1440;
    } else if (captureResolution === '4K') {
      targetW = 3840;
      targetH = 2160;
    } else {
      // 1080p default
      targetW = 1920;
      targetH = 1080;
    }

    // Off-screen canvas for crisp snapshot at exact chosen resolution
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = targetW;
    offscreenCanvas.height = targetH;
    const offscreenRenderer = new THREE.WebGLRenderer({
      canvas: offscreenCanvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    offscreenRenderer.setSize(targetW, targetH);
    offscreenRenderer.shadowMap.enabled = true;
    offscreenRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    offscreenRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    offscreenRenderer.toneMappingExposure = 1.25;

    // Render snapshot
    offscreenRenderer.render(scene, camera);
    const dataUrl = offscreenCanvas.toDataURL('image/png');
    offscreenRenderer.dispose();

    // Send to LuzRender studio!
    onCaptureScene(dataUrl, activeModelName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[94vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Top Header */}
        <header className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Visualizador 3D SketchUp & AutoCAD
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-mono border border-amber-500/30">
                  {activeModelName}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gire, posicione a câmara do seu projeto e capture a vista em até 4K para renderizar com luz natural.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Upload CAD/3D */}
            <label className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer text-amber-200 shadow-sm">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>{isParsing ? 'A carregar ficheiro...' : 'Abrir SketchUp / CAD (.skp, .obj, .dae, .gltf, .dxf)'}</span>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".skp,.obj,.dae,.gltf,.glb,.dxf,.stl,image/*"
                className="hidden"
                disabled={isParsing}
              />
            </label>

            <button
              onClick={() => setShowExportGuide(true)}
              className="p-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              title="Guia: Como exportar do SketchUp para renderização"
            >
              <Info className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Guia SketchUp</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 3D Viewport with Floating Controls */}
        <div className="flex-1 relative bg-slate-950 min-h-[460px] overflow-hidden">
          {/* Three.js Canvas Container */}
          <div
            ref={mountRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          />

          {/* Floating Camera Viewpoints Bar (Top Left) */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold px-2">Vistas:</span>
            <button
              onClick={() => setCameraView('iso')}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            >
              Isométrica
            </button>
            <button
              onClick={() => setCameraView('front')}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            >
              Fachada
            </button>
            <button
              onClick={() => setCameraView('top')}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            >
              Planta (Zenital)
            </button>
            <button
              onClick={() => setCameraView('human')}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            >
              Olho Humano
            </button>
          </div>

          {/* Preloaded Models Switcher (Top Right) */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl text-xs">
            <button
              onClick={() => loadModel(createSampleSketchUpVilla(), 'Villa Contemporânea (SketchUp)')}
              className={`px-3 py-1 rounded-lg transition font-medium ${
                activeModelName.includes('Villa')
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Villa 3D (SketchUp)
            </button>
            <button
              onClick={() => loadModel(createSampleAutoCadFloorplan(), 'Planta Baixa T3 (AutoCAD DXF)')}
              className={`px-3 py-1 rounded-lg transition font-medium ${
                activeModelName.includes('AutoCAD')
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Planta DXF (AutoCAD)
            </button>
          </div>

          {/* Sun Angle & Turntable Controller (Bottom Center Floating Dock) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 shadow-2xl text-xs">
            {/* Turntable toggle */}
            <button
              type="button"
              onClick={() => setIsRotating(!isRotating)}
              className={`p-2 rounded-xl border flex items-center gap-1.5 transition ${
                isRotating
                  ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold shadow'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
              <span>Girar 360°</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-700" />

            {/* Sun Azimuth Slider */}
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] text-slate-400 font-mono">Sol 3D:</span>
              <input
                type="range"
                min={0}
                max={360}
                value={sunAngle}
                onChange={(e) => setSunAngle(Number(e.target.value))}
                className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="font-mono text-[10px] text-amber-400 w-8">{sunAngle}°</span>
            </div>
          </div>
        </div>

        {/* Footer Toolbar: Resolution & Snapshot Execution */}
        <footer className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300">Qualidade da Captura:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {(['1080p', '2K', '4K'] as RenderResolution[]).map((res) => (
                <button
                  key={res}
                  onClick={() => setCaptureResolution(res)}
                  className={`px-3 py-1 rounded-lg font-mono font-bold transition cursor-pointer ${
                    captureResolution === res
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              {captureResolution === '4K'
                ? '3840 × 2160 px (Ultra HD)'
                : captureResolution === '2K'
                ? '2560 × 1440 px (Quad HD)'
                : '1920 × 1080 px (Full HD)'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleCaptureSnapshot}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Capturar Ângulo {captureResolution} & Renderizar</span>
            </button>
          </div>
        </footer>

        {/* Upload Error Alert */}
        {uploadError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-full p-4 rounded-xl bg-rose-950/95 border border-rose-800 text-rose-200 text-xs shadow-2xl flex items-start gap-3 backdrop-blur-md">
            <div className="flex-1">
              <strong className="block text-rose-100 font-semibold mb-0.5">Aviso de Formato SketchUp</strong>
              <span>{uploadError}</span>
            </div>
            <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* SketchUp .SKP Preview & Converter Assistant Modal */}
        {skpModalData && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex flex-col items-center justify-center animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black font-mono text-sm">
                    SKP
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Ficheiro SketchUp ({skpModalData.fileName})</h3>
                    <p className="text-xs text-slate-400">
                      {skpModalData.previewUrl
                        ? 'Enquadramento e câmara da cena detetados com sucesso!'
                        : 'Ficheiro nativo do Trimble SketchUp detetado.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSkpModalData(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {skpModalData.previewUrl ? (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
                    <img
                      src={skpModalData.previewUrl}
                      alt="SketchUp Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-slate-900/90 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                      Câmara original preservada do SketchUp
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Extraímos a perspetiva exata salva no seu SketchUp! Pode enviá-la diretamente para o estúdio para simular iluminação solar e atmosfera em até 4K.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (skpModalData.previewUrl) {
                          onCaptureScene(skpModalData.previewUrl, `Cena SketchUp (${skpModalData.fileName})`);
                          setSkpModalData(null);
                          onClose();
                        }
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Renderizar Esta Cena em 4K</span>
                    </button>

                    <button
                      onClick={() => {
                        setSkpModalData(null);
                        setShowExportGuide(true);
                      }}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                    >
                      Como orbitar em 3D
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-300">
                  <p className="leading-relaxed">
                    O formato <strong>.skp</strong> é um binário fechado do Trimble SketchUp. Para orbitar e navegar interativamente em 3D neste visualizador WebGL:
                  </p>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px] text-amber-300">
                    <div>1. No SketchUp, vá a: <strong>Arquivo ➔ Exportar ➔ Modelo 3D</strong></div>
                    <div>2. Selecione o formato: <strong>.OBJ</strong> ou <strong>.DAE (Collada)</strong></div>
                    <div>3. Carregue o ficheiro exportado aqui para órbita 360° em tempo real!</div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setSkpModalData(null)}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SketchUp Export Guide Dialog */}
        {showExportGuide && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex flex-col items-center justify-center animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Como Usar Projetos do SketchUp</h3>
                    <p className="text-xs text-slate-400">Instruções para exportar seus modelos e cenas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <span>Opção 1: Navegação 3D Interativa (Órbita e Sol)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    No SketchUp (qualquer versão, incluindo Web e Make):
                  </p>
                  <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] text-slate-300">
                    <li>Clique em <strong>Arquivo ➔ Exportar ➔ Modelo 3D</strong></li>
                    <li>Escolha o formato <strong>.OBJ</strong> ou <strong>.DAE (COLLADA)</strong></li>
                    <li>Carregue o arquivo aqui para orbitar e ajustar o sol livremente!</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <span>Opção 2: Exportar Gráfico da Perspetiva (Render Direto)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Se já enquadrou o ângulo perfeito no SketchUp:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] text-slate-300">
                    <li>Clique em <strong>Arquivo ➔ Exportar ➔ Gráfico 2D</strong> (.PNG ou .JPG)</li>
                    <li>Carregue direto no LuzRender para simular a iluminação e clima!</li>
                  </ol>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => setShowExportGuide(false)}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition"
                >
                  Fechar Guia
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
