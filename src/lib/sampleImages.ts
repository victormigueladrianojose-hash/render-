export interface SampleImage {
  id: string;
  name: string;
  description: string;
  tag: string;
  dataUrl: string;
}

// Generate crisp SVG architectural renders for immediate testing
function createArchitecturalSvg(type: 'loft' | 'villa' | 'kitchen'): string {
  if (type === 'loft') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2a2e39"/>
          <stop offset="100%" stop-color="#181b22"/>
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4a3e35"/>
          <stop offset="100%" stop-color="#241e1a"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#80a0c0" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#406080" stop-opacity="0.1"/>
        </linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8ab4f8"/>
          <stop offset="100%" stop-color="#d2e3fc"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#wall)"/>
      <!-- Window with outdoor sky -->
      <rect x="150" y="80" width="550" height="480" fill="url(#sky)"/>
      <path d="M 150 480 L 250 420 L 320 440 L 450 380 L 580 430 L 700 390 L 700 560 L 150 560 Z" fill="#698565" opacity="0.6"/>
      <!-- Window mullions -->
      <rect x="150" y="80" width="550" height="480" fill="url(#glass)"/>
      <rect x="420" y="80" width="12" height="480" fill="#111317"/>
      <rect x="150" y="320" width="550" height="12" fill="#111317"/>
      <rect x="145" y="75" width="560" height="490" fill="none" stroke="#111317" stroke-width="12"/>
      
      <!-- Concrete columns -->
      <rect x="740" y="0" width="90" height="580" fill="#323642"/>
      <rect x="740" y="0" width="15" height="580" fill="#434857"/>

      <!-- Floor -->
      <polygon points="0,580 1200,580 1200,800 0,800" fill="url(#floor)"/>
      <line x1="0" y1="640" x2="1200" y2="640" stroke="#191512" stroke-width="2"/>
      <line x1="0" y1="710" x2="1200" y2="710" stroke="#191512" stroke-width="2"/>

      <!-- Modern Sofa -->
      <rect x="380" y="520" width="460" height="130" rx="14" fill="#626875"/>
      <rect x="410" y="470" width="400" height="80" rx="10" fill="#505663"/>
      <rect x="360" y="540" width="50" height="100" rx="8" fill="#444954"/>
      <rect x="810" y="540" width="50" height="100" rx="8" fill="#444954"/>
      
      <!-- Coffee Table -->
      <polygon points="460,670 760,670 790,720 430,720" fill="#1e2025" opacity="0.9"/>
      <rect x="470" y="720" width="12" height="30" fill="#0d0e11"/>
      <rect x="740" y="720" width="12" height="30" fill="#0d0e11"/>

      <!-- Hanging Pendant Lights -->
      <line x1="940" y1="0" x2="940" y2="280" stroke="#0f1115" stroke-width="3"/>
      <ellipse cx="940" cy="290" rx="28" ry="16" fill="#181a1f"/>
      <line x1="1040" y1="0" x2="1040" y2="340" stroke="#0f1115" stroke-width="3"/>
      <ellipse cx="1040" cy="350" rx="24" ry="14" fill="#181a1f"/>

      <!-- Wall Art on the right -->
      <rect x="880" y="100" width="220" height="320" fill="#1f232b" stroke="#373c48" stroke-width="6"/>
      <circle cx="990" cy="240" r="60" fill="#d97706" opacity="0.7"/>
      <polygon points="920,380 990,270 1060,380" fill="#f59e0b" opacity="0.5"/>
      <text x="50" y="60" fill="#71717a" font-family="sans-serif" font-size="20" font-weight="bold">LUZRENDER - ESPAÇO LOFT ARQUITETURAL</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (type === 'villa') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
      <defs>
        <linearGradient id="skyVilla" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#60a5fa"/>
          <stop offset="60%" stop-color="#bae6fd"/>
          <stop offset="100%" stop-color="#f0f9ff"/>
        </linearGradient>
        <linearGradient id="concrete" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#e2e8f0"/>
          <stop offset="100%" stop-color="#cbd5e1"/>
        </linearGradient>
        <linearGradient id="pool" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>
      <!-- Sky -->
      <rect width="1200" height="520" fill="url(#skyVilla)"/>
      <circle cx="1020" cy="140" r="50" fill="#fef08a" opacity="0.8"/>
      
      <!-- Mountains in background -->
      <polygon points="0,480 200,340 450,460 750,300 1050,440 1200,380 1200,520 0,520" fill="#94a3b8" opacity="0.4"/>

      <!-- Modern Villa Concrete Blocks -->
      <!-- Ground floor glass pavilion -->
      <rect x="220" y="320" width="760" height="200" fill="#1e293b"/>
      <rect x="240" y="340" width="220" height="180" fill="#38bdf8" opacity="0.4"/>
      <rect x="490" y="340" width="220" height="180" fill="#38bdf8" opacity="0.4"/>
      <rect x="740" y="340" width="210" height="180" fill="#38bdf8" opacity="0.4"/>

      <!-- Upper cantilever block -->
      <rect x="140" y="160" width="600" height="170" fill="url(#concrete)"/>
      <!-- Upper floor wood louvers and window -->
      <rect x="260" y="190" width="300" height="110" fill="#1e293b"/>
      <line x1="280" y1="190" x2="280" y2="300" stroke="#b45309" stroke-width="4"/>
      <line x1="300" y1="190" x2="300" y2="300" stroke="#b45309" stroke-width="4"/>
      <line x1="320" y1="190" x2="320" y2="300" stroke="#b45309" stroke-width="4"/>
      <line x1="340" y1="190" x2="340" y2="300" stroke="#b45309" stroke-width="4"/>

      <!-- Villa Ground Terrace -->
      <polygon points="0,520 1200,520 1200,800 0,800" fill="#475569"/>
      
      <!-- Swimming Pool -->
      <polygon points="340,560 1060,560 1140,760 220,760" fill="url(#pool)"/>
      <!-- Pool Deck wood -->
      <polygon points="120,550 330,550 200,770 0,770" fill="#78350f" opacity="0.8"/>
      
      <!-- Trees & Vegetation -->
      <ellipse cx="140" cy="460" rx="45" ry="90" fill="#15803d"/>
      <ellipse cx="1080" cy="450" rx="55" ry="110" fill="#166534"/>
      <ellipse cx="1140" cy="470" rx="40" ry="80" fill="#15803d"/>

      <text x="50" y="60" fill="#334155" font-family="sans-serif" font-size="20" font-weight="bold">LUZRENDER - VILLA CONTEMPORÂNEA COM PISCINA</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // Kitchen
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <defs>
      <linearGradient id="marble" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="50%" stop-color="#e2e8f0"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>
      <linearGradient id="woodCabinet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#78350f"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="#0f172a"/>
    <!-- Back wall tiles -->
    <rect x="100" y="100" width="1000" height="350" fill="#1e293b"/>
    <!-- Upper cabinets -->
    <rect x="100" y="100" width="1000" height="150" fill="url(#woodCabinet)"/>
    <line x1="350" y1="100" x2="350" y2="250" stroke="#000" stroke-width="2"/>
    <line x1="600" y1="100" x2="600" y2="250" stroke="#000" stroke-width="2"/>
    <line x1="850" y1="100" x2="850" y2="250" stroke="#000" stroke-width="2"/>

    <!-- Countertop Back -->
    <rect x="100" y="420" width="1000" height="30" fill="url(#marble)"/>
    <rect x="100" y="450" width="1000" height="180" fill="#334155"/>

    <!-- Large Kitchen Island -->
    <polygon points="260,500 940,500 1020,720 180,720" fill="url(#marble)"/>
    <polygon points="180,720 1020,720 1020,790 180,790" fill="#1e293b"/>

    <!-- Bar Stools -->
    <rect x="340" y="660" width="70" height="15" rx="5" fill="#94a3b8"/>
    <line x1="375" y1="675" x2="375" y2="780" stroke="#000" stroke-width="6"/>
    <rect x="560" y="660" width="70" height="15" rx="5" fill="#94a3b8"/>
    <line x1="595" y1="675" x2="595" y2="780" stroke="#000" stroke-width="6"/>
    <rect x="780" y="660" width="70" height="15" rx="5" fill="#94a3b8"/>
    <line x1="815" y1="675" x2="815" y2="780" stroke="#000" stroke-width="6"/>

    <!-- Pendant lights over island -->
    <line x1="420" y1="0" x2="420" y2="300" stroke="#f59e0b" stroke-width="2"/>
    <path d="M 390 330 Q 420 290 450 330 Z" fill="#b45309"/>
    <line x1="780" y1="0" x2="780" y2="300" stroke="#f59e0b" stroke-width="2"/>
    <path d="M 750 330 Q 780 290 810 330 Z" fill="#b45309"/>

    <text x="50" y="60" fill="#94a3b8" font-family="sans-serif" font-size="20" font-weight="bold">LUZRENDER - COZINHA MINIMALISTA COM ILHA</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'loft-1',
    name: 'Loft Moderno & Janelas Industriais',
    description: 'Espaço interior com luz natural, sofá contemporâneo e colunas de betão.',
    tag: 'Interior',
    dataUrl: createArchitecturalSvg('loft'),
  },
  {
    id: 'villa-1',
    name: 'Villa Contemporânea & Piscina',
    description: 'Fachada minimalista com volumes em betão branco, deck de madeira e piscina.',
    tag: 'Exterior',
    dataUrl: createArchitecturalSvg('villa'),
  },
  {
    id: 'kitchen-1',
    name: 'Cozinha Minimalista com Ilha',
    description: 'Bancada em mármore, armários em nogueira e iluminação pendente.',
    tag: 'Cozinha',
    dataUrl: createArchitecturalSvg('kitchen'),
  },
];
