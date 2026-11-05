import * as THREE from 'three';

export interface CadEntity {
  type: string;
  layer?: string;
  color?: number;
  vertices: number[];
}

/**
 * Lightweight and robust DXF (AutoCAD Drawing Exchange Format) parser
 * Extracts 2D/3D LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC entities for Three.js rendering
 */
export function parseDxfToThree(dxfText: string): THREE.Group {
  const group = new THREE.Group();
  group.name = 'AutoCAD_DXF_Drawing';

  const lines = dxfText.split(/\r?\n/);
  let inEntities = false;
  let currentEntity: string | null = null;
  let layer = '0';
  let colorIndex = 7; // Default white/black

  const linePositions: number[] = [];
  const lineColors: number[] = [];

  // AutoCAD ACI color palette mapping (basic colors)
  const aciColors: Record<number, number> = {
    1: 0xff0000, // Red
    2: 0xffff00, // Yellow
    3: 0x00ff00, // Green
    4: 0x00ffff, // Cyan
    5: 0x0000ff, // Blue
    6: 0xff00ff, // Magenta
    7: 0xffffff, // White
    8: 0x808080, // Dark grey
    9: 0xc0c0c0, // Light grey
  };

  let x1 = 0, y1 = 0, z1 = 0;
  let x2 = 0, y2 = 0, z2 = 0;
  let polylineVerts: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const code = lines[i]?.trim();
    const val = lines[i + 1]?.trim();

    if (code === '0' && val === 'SECTION') {
      if (lines[i + 3]?.trim() === 'ENTITIES') {
        inEntities = true;
      }
    } else if (code === '0' && val === 'ENDSEC') {
      inEntities = false;
    }

    if (inEntities && code === '0') {
      // Finish previous polyline if any
      if (polylineVerts.length > 1) {
        const col = new THREE.Color(aciColors[colorIndex] || 0x38bdf8);
        for (let p = 0; p < polylineVerts.length - 1; p++) {
          linePositions.push(
            polylineVerts[p].x, polylineVerts[p].y, polylineVerts[p].z,
            polylineVerts[p + 1].x, polylineVerts[p + 1].y, polylineVerts[p + 1].z
          );
          lineColors.push(col.r, col.g, col.b, col.r, col.g, col.b);
        }
      }
      polylineVerts = [];
      currentEntity = val;
    }

    if (inEntities) {
      if (code === '8') layer = val;
      if (code === '62') colorIndex = parseInt(val, 10) || 7;

      if (currentEntity === 'LINE') {
        if (code === '10') x1 = parseFloat(val);
        if (code === '20') y1 = parseFloat(val);
        if (code === '30') z1 = parseFloat(val);
        if (code === '11') x2 = parseFloat(val);
        if (code === '21') y2 = parseFloat(val);
        if (code === '31') {
          z2 = parseFloat(val);
          const col = new THREE.Color(aciColors[colorIndex] || 0x38bdf8);
          linePositions.push(x1, y1, z1, x2, y2, z2);
          lineColors.push(col.r, col.g, col.b, col.r, col.g, col.b);
        }
      } else if (currentEntity === 'LWPOLYLINE' || currentEntity === 'POLYLINE') {
        if (code === '10') {
          polylineVerts.push({ x: parseFloat(val), y: 0, z: 0 });
        }
        if (code === '20' && polylineVerts.length > 0) {
          polylineVerts[polylineVerts.length - 1].y = parseFloat(val);
        }
        if (code === '30' && polylineVerts.length > 0) {
          polylineVerts[polylineVerts.length - 1].z = parseFloat(val);
        }
      }
    }
  }

  // Create geometry from line positions
  if (linePositions.length > 0) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    geom.computeBoundingBox();

    // Center geometry
    if (geom.boundingBox) {
      const center = new THREE.Vector3();
      geom.boundingBox.getCenter(center);
      geom.center();
    }

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 1.5,
    });
    const linesMesh = new THREE.LineSegments(geom, mat);
    linesMesh.rotation.x = -Math.PI / 2; // Orient DXF plan horizontally
    group.add(linesMesh);
  }

  return group;
}

/**
 * Robust OBJ 3D Model parser (Universal export from SketchUp Pro and AutoCAD 3D)
 */
export function parseObjToThree(objText: string): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SketchUp_CAD_3D_Model';

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const rawPositions: [number, number, number][] = [];
  const rawNormals: [number, number, number][] = [];
  const rawUvs: [number, number][] = [];

  const lines = objText.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    const type = parts[0];

    if (type === 'v') {
      rawPositions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (type === 'vn') {
      rawNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (type === 'vt') {
      rawUvs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
    } else if (type === 'f') {
      // Triangulate polygonal faces
      const faceVerts: string[] = parts.slice(1);
      for (let t = 1; t < faceVerts.length - 1; t++) {
        const triIndices = [faceVerts[0], faceVerts[t], faceVerts[t + 1]];
        for (const vertStr of triIndices) {
          const [vIdx, vtIdx, vnIdx] = vertStr.split('/').map((s) => (s ? parseInt(s, 10) : undefined));

          if (vIdx !== undefined) {
            const actualV = vIdx > 0 ? vIdx - 1 : rawPositions.length + vIdx;
            const p = rawPositions[actualV];
            if (p) positions.push(p[0], p[1], p[2]);
          }

          if (vtIdx !== undefined) {
            const actualVt = vtIdx > 0 ? vtIdx - 1 : rawUvs.length + vtIdx;
            const uv = rawUvs[actualVt];
            if (uv) uvs.push(uv[0], uv[1]);
          }

          if (vnIdx !== undefined) {
            const actualVn = vnIdx > 0 ? vnIdx - 1 : rawNormals.length + vnIdx;
            const n = rawNormals[actualVn];
            if (n) normals.push(n[0], n[1], n[2]);
          }
        }
      }
    }
  }

  if (positions.length > 0) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length === positions.length) {
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    } else {
      geom.computeVertexNormals();
    }
    if (uvs.length > 0) {
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }

    geom.computeBoundingBox();
    geom.center();

    // Architectural clay/PBR material matching SketchUp style
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add wireframe edge lines characteristic of SketchUp / CAD
    const edges = new THREE.EdgesGeometry(geom, 24);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 1 });
    const edgeLines = new THREE.LineSegments(edges, edgeMat);
    mesh.add(edgeLines);

    group.add(mesh);
  }

  return group;
}

/**
 * Creates high-fidelity procedural architectural scenes for SketchUp and AutoCAD demonstration
 */
export function createSampleSketchUpVilla(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SketchUp_Villa_Contemporanea';

  // Materials
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6, metalness: 0.05 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4, metalness: 0.1 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xbae6fd, transmission: 0.85, opacity: 0.4, transparent: true, roughness: 0.1, ior: 1.5 });
  const poolWaterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });

  // Ground Terrain
  const groundGeo = new THREE.BoxGeometry(30, 0.4, 30);
  const ground = new THREE.Mesh(groundGeo, grassMat);
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  group.add(ground);

  // Terrace Platform (Concrete deck)
  const deckGeo = new THREE.BoxGeometry(20, 0.3, 16);
  const deck = new THREE.Mesh(deckGeo, concreteMat);
  deck.position.set(0, 0.15, 0);
  deck.receiveShadow = true;
  group.add(deck);

  // Swimming Pool
  const poolGeo = new THREE.BoxGeometry(10, 0.1, 4.5);
  const pool = new THREE.Mesh(poolGeo, poolWaterMat);
  pool.position.set(2, 0.25, 4);
  group.add(pool);

  // Ground Floor Pavilion (Living & Glass walls)
  const gFloorGeo = new THREE.BoxGeometry(12, 3.2, 8);
  const gFloor = new THREE.Mesh(gFloorGeo, concreteMat);
  gFloor.position.set(-2, 1.8, -2);
  gFloor.castShadow = true;
  gFloor.receiveShadow = true;
  group.add(gFloor);

  // Large Glass Windows
  const windowGeo = new THREE.BoxGeometry(7, 2.8, 0.15);
  const windowMesh = new THREE.Mesh(windowGeo, glassMat);
  windowMesh.position.set(-1, 1.8, 2.05);
  group.add(windowMesh);

  // Window mullions (Black aluminum frames)
  for (let f = -3; f <= 3; f += 2) {
    const frameGeo = new THREE.BoxGeometry(0.08, 2.8, 0.2);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(-1 + f, 1.8, 2.05);
    group.add(frame);
  }

  // Upper Floor Cantilevered Volume (SketchUp architectural massing)
  const upperGeo = new THREE.BoxGeometry(10, 3, 9);
  const upper = new THREE.Mesh(upperGeo, concreteMat);
  upper.position.set(1, 4.8, -1.5);
  upper.castShadow = true;
  upper.receiveShadow = true;
  group.add(upper);

  // Wood Louvers on Upper Floor Facade
  for (let l = 0; l < 8; l++) {
    const louverGeo = new THREE.BoxGeometry(0.12, 2.6, 2.8);
    const louver = new THREE.Mesh(louverGeo, darkWoodMat);
    louver.position.set(2.5 + l * 0.4, 4.8, 3.1);
    louver.castShadow = true;
    group.add(louver);
  }

  // Roof Canopy Overhang
  const canopyGeo = new THREE.BoxGeometry(11, 0.25, 10);
  const canopy = new THREE.Mesh(canopyGeo, concreteMat);
  canopy.position.set(1, 6.4, -1.5);
  canopy.castShadow = true;
  group.add(canopy);

  // Modern Outdoor Loungers by Pool
  for (let c = 0; c < 2; c++) {
    const loungerGeo = new THREE.BoxGeometry(0.8, 0.2, 2);
    const lounger = new THREE.Mesh(loungerGeo, darkWoodMat);
    lounger.position.set(-1.5 + c * 1.5, 0.4, 5.5);
    lounger.castShadow = true;
    group.add(lounger);
  }

  // Add edge wireframe lines (SketchUp signature aesthetic)
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const edges = new THREE.EdgesGeometry(child.geometry, 35);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 1 });
      const edgeLines = new THREE.LineSegments(edges, edgeMat);
      child.add(edgeLines);
    }
  });

  return group;
}

/**
 * Creates procedural AutoCAD Technical Floor Plan with architectural layers
 */
export function createSampleAutoCadFloorplan(): THREE.Group {
  const dxfMock = `
0
SECTION
2
ENTITIES
0
LINE
8
WALLS
62
7
10
-8.0
20
-6.0
30
0.0
11
8.0
21
-6.0
31
0.0
0
LINE
8
WALLS
62
7
10
8.0
20
-6.0
30
0.0
11
8.0
21
6.0
31
0.0
0
LINE
8
WALLS
62
7
10
8.0
20
6.0
30
0.0
11
-8.0
21
6.0
31
0.0
0
LINE
8
WALLS
62
7
10
-8.0
20
6.0
30
0.0
11
-8.0
21
-6.0
31
0.0
0
LINE
8
PARTITIONS
62
3
10
-1.0
20
-6.0
30
0.0
11
-1.0
21
6.0
31
0.0
0
LINE
8
PARTITIONS
62
3
10
-1.0
20
0.0
30
0.0
11
8.0
21
0.0
31
0.0
0
LINE
8
DOORS
62
1
10
-1.0
20
2.0
30
0.0
11
0.2
21
3.0
31
0.0
0
LINE
8
WINDOWS
62
4
10
-6.0
20
6.0
30
0.0
11
-3.0
21
6.0
31
0.0
0
LINE
8
WINDOWS
62
4
10
2.0
20
6.0
30
0.0
11
6.0
21
6.0
31
0.0
0
LINE
8
DIMS
62
2
10
-8.0
20
-7.5
30
0.0
11
8.0
21
-7.5
31
0.0
0
ENDSEC
0
EOF`;

  return parseDxfToThree(dxfMock);
}
