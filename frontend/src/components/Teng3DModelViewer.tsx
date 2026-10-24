import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { 
  ZoomIn, ZoomOut, RotateCcw, Play, Pause, 
  Maximize2, Minimize2, Eye, Shield, Activity, 
  Layers, Sparkles, Cpu, Info, Zap
} from 'lucide-react';

interface Teng3DModelViewerProps {
  modelUrl?: string;
  height?: string | number;
  vibrationHz?: number;
  voltageV?: number;
  className?: string;
  showHotspots?: boolean;
}

interface Hotspot {
  id: string;
  name: string;
  category: string;
  description: string;
  material: string;
  spec: string;
  targetOffset: [number, number, number];
}

const TENG_HOTSPOTS: Hotspot[] = [
  {
    id: 'acrylic_housing',
    name: 'Transparent Acrylic Enclosure',
    category: 'Environmental Containment',
    description: 'High-optical-clarity, impact-resistant PMMA polymer housing. Hermetically seals internal triboelectric contact layers against ambient dust, humidity, and oil mist.',
    material: 'Poly(methyl methacrylate) / IP67 Grade',
    spec: 'Dielectric strength: 20 kV/mm • Temp: -40°C to +85°C',
    targetOffset: [0, 0.4, 0]
  },
  {
    id: 'copper_electrodes',
    name: 'Micro-Patterned Copper Electrodes',
    category: 'Induction Current Collector',
    description: 'High-purity interdigital copper thin-film traces collecting electrostatic surface displacement currents during cyclic separation.',
    material: 'OFHC Copper (99.99%) • 35 µm Foil',
    spec: 'Electrical Conductivity: 5.96 × 10⁷ S/m • Low Impedance',
    targetOffset: [0, 0, 0]
  },
  {
    id: 'dielectric_layer',
    name: 'PTFE / Polymer Tribo-Negative Layer',
    category: 'Triboelectric Charge Generation',
    description: 'Micro-nanostructured fluoropolymer film exhibiting high electron affinity. Generates massive surface charge densities upon contact with metal counter-surface.',
    material: 'Polytetrafluoroethylene (PTFE) Nanowire Array',
    spec: 'Surface Charge Density: ~120 µC/m² • Friction Coeff: 0.04',
    targetOffset: [0, -0.2, 0]
  },
  {
    id: 'kinetic_spring',
    name: 'Kinetic Resonator Spring & Spacer',
    category: 'Micro-Gap Vibration Interface',
    description: 'High-fatigue phosphor-bronze return spring creating periodic contact-and-separation micro-gap driven by machine kinetic vibration.',
    material: 'Phosphor Bronze C51000 Spring Alloy',
    spec: 'Resonant Frequency: 29.8 Hz • Fatigue cycles: > 10⁸',
    targetOffset: [0, -0.4, 0]
  },
  {
    id: 'signal_terminals',
    name: 'Gold-Plated Telemetry Terminals',
    category: 'IoT Signal Interface',
    description: 'Shielded coaxial terminal leads delivering raw open-circuit voltage waveforms directly to edge ADC converter and AI anomaly pipeline.',
    material: 'Au-plated Brass Terminal Pins',
    spec: 'Contact Resistance: < 15 mΩ • Bandwidth: DC to 5 kHz',
    targetOffset: [0.3, 0, 0.3]
  }
];

// Module-level cache so model doesn't re-download or re-parse on tab switches
let cachedScene: THREE.Group | null = null;
let globalLoadPromise: Promise<THREE.Group> | null = null;

export const Teng3DModelViewer: React.FC<Teng3DModelViewerProps> = ({
  modelUrl = '/models/teng_sensor.glb',
  height = '520px',
  vibrationHz = 29.8,
  voltageV = 6.48,
  className = '',
  showHotspots = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState<boolean>(!cachedScene);
  const [loadProgress, setLoadProgress] = useState<number>(cachedScene ? 100 : 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [vibrateActive, setVibrateActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(TENG_HOTSPOTS[0]);

  // Three.js internal refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const materialsRef = useRef<THREE.Material[]>([]);
  const initialCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(2.2, 1.8, 2.5));

  // Vibration pulse clock
  const animFrameIdRef = useRef<number | null>(null);

  // Initialize Three.js Scene & Load Model
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let isDisposed = false;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Subtle dark studio background
    scene.background = new THREE.Color(0x0e121a);

    // 2. Camera setup
    const aspect = container.clientWidth / (container.clientHeight || 500);
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    camera.position.set(2.2, 1.8, 2.5);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight || 500);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.1;
    controls.minDistance = 0.5;
    controls.maxDistance = 12.0;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.8;
    controls.enablePan = true;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    // 5. Lighting Setup - Industrial Warm Ember & Cool Silver Accents
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // Top Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);

    // Warm Ember Accent Fill (representing TENG voltage glow)
    const warmFill = new THREE.DirectionalLight(0xff7a00, 1.6);
    warmFill.position.set(-5, 2, -3);
    scene.add(warmFill);

    // Cyan Rim Light (for edge separation on acrylic casing)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(2, -4, -4);
    scene.add(rimLight);

    // Subtle floor pedestal grid
    const gridHelper = new THREE.GridHelper(5, 20, 0xff5e1e, 0x1f293d);
    gridHelper.position.y = -0.9;
    scene.add(gridHelper);

    // Glowing base ring
    const ringGeo = new THREE.RingGeometry(1.2, 1.23, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5e1e, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -0.89;
    scene.add(ringMesh);

    // 6. Model Loader Function
    const applyLoadedModel = (gltfGroup: THREE.Group) => {
      if (isDisposed) return;

      const model = gltfGroup.clone(true);
      modelGroupRef.current = model;

      // Extract and enhance materials
      materialsRef.current = [];
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
              mat.side = THREE.DoubleSide;
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.roughness = Math.max(mat.roughness * 0.9, 0.2);
                mat.metalness = Math.min(mat.metalness * 1.1, 0.9);
                mat.envMapIntensity = 1.3;
              }
              materialsRef.current.push(mat);
            });
          }
        }
      });

      // Fit and center model properly in viewport
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Center model
      model.position.sub(center);

      // Adjust height so it sits nicely above the grid
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.0 / maxDim;
      model.scale.setScalar(scale);

      // Recompute bounding box after scale
      const scaledBox = new THREE.Box3().setFromObject(model);
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
      model.position.sub(scaledCenter);
      model.position.y += 0.05; // Float slightly above grid

      scene.add(model);

      // Ideal camera position based on scaled size
      const dist = 3.2;
      camera.position.set(dist * 0.85, dist * 0.65, dist * 0.95);
      initialCamPosRef.current.copy(camera.position);
      controls.target.set(0, 0, 0);
      controls.update();

      setLoading(false);
      setLoadProgress(100);
    };

    // Load from cache or initiate GLTFLoader
    if (cachedScene) {
      applyLoadedModel(cachedScene);
    } else {
      setLoading(true);
      setLoadProgress(15);

      if (!globalLoadPromise) {
        globalLoadPromise = (async () => {
          await MeshoptDecoder.ready;
          const loader = new GLTFLoader();
          loader.setMeshoptDecoder(MeshoptDecoder);

          const resolvedUrl = modelUrl.startsWith('http') 
            ? modelUrl 
            : `${import.meta.env.BASE_URL || '/'}${modelUrl.replace(/^\//, '')}`;

          return new Promise<THREE.Group>((resolve, reject) => {
            loader.load(
              resolvedUrl,
              (gltf) => {
                cachedScene = gltf.scene;
                resolve(gltf.scene);
              },
              (xhr) => {
                if (xhr.total > 0) {
                  const pct = Math.round((xhr.loaded / xhr.total) * 95);
                  setLoadProgress(pct);
                }
              },
              (err) => {
                console.error('[TENG 3D Viewer] Error loading GLB model:', err);
                reject(err);
              }
            );
          });
        })();
      }

      globalLoadPromise
        .then((sceneObj) => {
          applyLoadedModel(sceneObj);
        })
        .catch((err) => {
          if (!isDisposed) {
            setLoadError(err?.message || 'Failed to initialize 3D model');
            setLoading(false);
          }
        });
    }

    // 7. Render Animation Loop
    let clock = new THREE.Clock();
    const renderLoop = () => {
      animFrameIdRef.current = requestAnimationFrame(renderLoop);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth kinetic micro-vibration simulation
      if (modelGroupRef.current && vibrateActive) {
        // High frequency micro-oscillation in Y (contact-separation motion)
        const microAmp = 0.0035;
        const microFreq = (vibrationHz || 29.8) * 0.4;
        modelGroupRef.current.position.y = 0.05 + Math.sin(elapsed * microFreq) * microAmp;
        modelGroupRef.current.rotation.y += Math.cos(elapsed * 2.0) * 0.0004;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    renderLoop();

    // 8. ResizeObserver for responsive canvas
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    resizeObserver.observe(container);

    // Cleanup
    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      controls.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [modelUrl]);

  // Sync auto-rotate state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Sync wireframe mode
  useEffect(() => {
    materialsRef.current.forEach((mat) => {
      if ('wireframe' in mat) {
        (mat as any).wireframe = wireframe;
      }
    });
  }, [wireframe]);

  // Interactive Zoom Helpers
  const handleZoomIn = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const factor = 0.8;
    cameraRef.current.position.multiplyScalar(factor);
    controlsRef.current.update();
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const factor = 1.25;
    cameraRef.current.position.multiplyScalar(factor);
    controlsRef.current.update();
  }, []);

  const handleResetCamera = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    cameraRef.current.position.copy(initialCamPosRef.current);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      id="teng-3d-model-viewer-root"
      style={{ height: isFullscreen ? '100vh' : height }}
      className={`relative w-full rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-gradient-to-b from-[#13161F] via-[#0C0E14] to-[#08090D] shadow-2xl flex flex-col ${className}`}
    >
      {/* 3D Canvas */}
      <canvas 
        ref={canvasRef} 
        id="teng-3d-model-canvas"
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[#0E121A]/90 backdrop-blur-md flex flex-col items-center justify-center space-y-4 z-20">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[#FF5E1E]/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-[#FF5E1E] border-t-transparent animate-spin" />
            <Zap className="w-8 h-8 text-[#FF5E1E] animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-white tracking-wide">Streaming TENG 3D Digital Twin</h4>
            <p className="text-xs text-slate-400">Decoding PBR textures & meshopt geometry ({loadProgress}%)</p>
          </div>
          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(loadProgress, 10)}%` }}
            />
          </div>
        </div>
      )}

      {/* Load Error Fallback */}
      {loadError && (
        <div className="absolute inset-0 bg-[#0E121A]/95 flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
            <Shield className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">3D Model Stream Notice</h4>
          <p className="text-xs text-slate-400 max-w-sm">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[#FF5E1E] text-white text-xs font-semibold hover:bg-[#FF7A00] transition-colors"
          >
            Retry Loading Model
          </button>
        </div>
      )}

      {/* Top Floating Telemetry & Badge Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#161920]/85 backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide">TENG Triboelectric Sensor Twin</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FF5E1E]/20 text-[#FF7A00] border border-[#FF5E1E]/30 uppercase font-semibold">
              PBR 3D
            </span>
          </div>

          {/* Real-time Frequency Pulse Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#161920]/85 backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto text-xs">
            <Activity className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span className="text-slate-400">Contact Freq:</span>
            <span className="font-mono text-white font-bold">{vibrationHz.toFixed(1)} Hz</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Output:</span>
            <span className="font-mono text-[#FF5E1E] font-bold">{voltageV.toFixed(2)} V</span>
          </div>
        </div>

        {/* Viewport Action Buttons */}
        <div className="flex items-center space-x-1.5 pointer-events-auto">
          {/* Fullscreen Button */}
          <button
            id="teng-3d-fullscreen-btn"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen 3D View"
            className="p-2 rounded-xl bg-[#161920]/85 hover:bg-[#1E232E] text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-all shadow-md"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Bottom-Right Quick Controls HUD */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-1.5 pointer-events-auto z-10">
        {/* Zoom In */}
        <button
          id="teng-3d-zoom-in-btn"
          onClick={handleZoomIn}
          aria-label="Zoom in on 3D sensor model"
          className="p-2.5 rounded-xl bg-[#161920]/90 hover:bg-[#202533] text-slate-200 hover:text-[#FF5E1E] border border-white/10 backdrop-blur-md shadow-xl transition-all"
          title="Zoom In (or use mouse wheel)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          id="teng-3d-zoom-out-btn"
          onClick={handleZoomOut}
          aria-label="Zoom out of 3D sensor model"
          className="p-2.5 rounded-xl bg-[#161920]/90 hover:bg-[#202533] text-slate-200 hover:text-[#FF5E1E] border border-white/10 backdrop-blur-md shadow-xl transition-all"
          title="Zoom Out (or use mouse wheel)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Reset Camera */}
        <button
          id="teng-3d-reset-btn"
          onClick={handleResetCamera}
          aria-label="Reset 3D camera to default isometric view"
          className="p-2.5 rounded-xl bg-[#161920]/90 hover:bg-[#202533] text-slate-200 hover:text-[#FF5E1E] border border-white/10 backdrop-blur-md shadow-xl transition-all"
          title="Reset Camera View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Auto Rotate Toggle */}
        <button
          id="teng-3d-rotate-toggle-btn"
          onClick={() => setAutoRotate((prev) => !prev)}
          aria-label="Toggle 360 degree turntable rotation"
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all ${
            autoRotate 
              ? 'bg-[#FF5E1E]/20 text-[#FF5E1E] border-[#FF5E1E]/50 font-bold' 
              : 'bg-[#161920]/90 text-slate-400 hover:text-white border-white/10'
          }`}
          title={autoRotate ? 'Pause 360° Spin' : 'Resume 360° Spin'}
        >
          {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Wireframe Toggle */}
        <button
          id="teng-3d-wireframe-toggle-btn"
          onClick={() => setWireframe((prev) => !prev)}
          aria-label="Toggle wireframe topology inspection"
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all ${
            wireframe 
              ? 'bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/50 font-bold' 
              : 'bg-[#161920]/90 text-slate-400 hover:text-white border-white/10'
          }`}
          title={wireframe ? 'Switch to Solid Material' : 'Inspect Wireframe Topology'}
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Kinetic Micro-Vibration Simulation Toggle */}
        <button
          id="teng-3d-vibrate-toggle-btn"
          onClick={() => setVibrateActive((prev) => !prev)}
          aria-label="Toggle kinetic vibration oscillation"
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all ${
            vibrateActive 
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 font-bold' 
              : 'bg-[#161920]/90 text-slate-400 hover:text-white border-white/10'
          }`}
          title={vibrateActive ? 'Pause Kinetic Vibration Pulse' : 'Simulate Kinetic Vibration Pulse'}
        >
          <Zap className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom-Left Hotspot Architecture Selector */}
      {showHotspots && (
        <div className="absolute bottom-4 left-4 max-w-sm sm:max-w-md pointer-events-auto z-10 space-y-2">
          {/* Sub-Assembly Chips */}
          <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-[#12151D]/90 backdrop-blur-md border border-white/10 shadow-xl">
            {TENG_HOTSPOTS.map((spot) => {
              const isSelected = selectedHotspot?.id === spot.id;
              return (
                <button
                  key={spot.id}
                  onClick={() => setSelectedHotspot(spot)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-white font-bold shadow-[0_0_12px_rgba(255,94,30,0.4)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {spot.name.split(' ')[0]} {spot.name.split(' ')[1]}
                </button>
              );
            })}
          </div>

          {/* Selected Sub-Assembly Card */}
          {selectedHotspot && (
            <div className="p-3.5 rounded-xl bg-[#141720]/92 backdrop-blur-xl border border-[rgba(255,255,255,0.1)] shadow-2xl text-xs space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#FF5E1E]" />
                  <span>{selectedHotspot.name}</span>
                </span>
                <span className="text-[10px] font-mono text-[#FF7A00] px-2 py-0.5 rounded bg-[#FF5E1E]/15 border border-[#FF5E1E]/30 font-semibold">
                  {selectedHotspot.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {selectedHotspot.description}
              </p>
              <div className="pt-1 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 gap-1 font-mono">
                <span>Material: <strong className="text-slate-200">{selectedHotspot.material}</strong></span>
                <span className="text-slate-500">{selectedHotspot.spec}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Instructions Helper */}
      <div className="absolute top-4 right-16 hidden lg:flex items-center space-x-2 text-[10px] text-slate-400 bg-[#161920]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 pointer-events-none z-10">
        <span>🖱️ Drag to Rotate</span>
        <span>•</span>
        <span>Scroll to Zoom</span>
        <span>•</span>
        <span>Right-Click to Pan</span>
      </div>
    </div>
  );
};
