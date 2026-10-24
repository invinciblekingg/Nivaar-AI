import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, UploadCloud, CheckCircle2, AlertTriangle, Eye, EyeOff,
  Layers, ShieldAlert, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Info, Check, Sparkles,
  ChevronRight, Tag, Activity, FileText, Sliders, Wrench, Flame,
  Maximize2, Crosshair, ExternalLink, ShieldCheck, AlertCircle,
  Save, FileCheck, SlidersHorizontal, Split
} from 'lucide-react';
import { Machine, ImageInspection, ImageDefect, VisionSample } from '../types';
import { api } from '../services/api';
import { SectorsProofModal } from '../components/SectorsProofModal';

interface ImageAnalysisPageProps {
  machines: Machine[];
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
  onNavigateToReportStudio?: (machineId: string, inspectionId: string) => void;
}

export const ImageAnalysisPage: React.FC<ImageAnalysisPageProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
  onNavigateToReportStudio,
}) => {
  const [samples, setSamples] = useState<VisionSample[]>([]);
  const [inspections, setInspections] = useState<ImageInspection[]>([]);
  const [activeInspection, setActiveInspection] = useState<ImageInspection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [componentName, setComponentName] = useState<string>('Drive-End Bearing Race');
  const [viewMode, setViewMode] = useState<'annotated' | 'raw' | 'sideBySide' | 'splitCompare'>('annotated');
  const [showDetections, setShowDetections] = useState<boolean>(true);
  const [showSegmentationMasks, setShowSegmentationMasks] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [defectFilter, setDefectFilter] = useState<'all' | 'confirmed' | 'uncertain'>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(60);
  const [selectedDefectIdx, setSelectedDefectIdx] = useState<number | null>(0);
  const [modifiedDefects, setModifiedDefects] = useState<ImageDefect[]>([]);
  const [isSavingDefects, setIsSavingDefects] = useState<boolean>(false);
  const [showProofModal, setShowProofModal] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number }>({ width: 640, height: 480 });

  const roiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  const currentMachine = (machines && machines.length > 0)
    ? (machines.find((m) => m.id === selectedMachineId) || machines[0])
    : null;

  const loadData = async () => {
    if (!currentMachine) return;
    setLoading(true);
    try {
      const [samplesRes, inspRes] = await Promise.all([
        api.getVisionSamples().catch(() => []),
        api.getImageInspections(currentMachine.id).catch(() => [])
      ]);
      setSamples(Array.isArray(samplesRes) ? samplesRes : []);
      const inspectionList = Array.isArray(inspRes) ? inspRes : [];
      setInspections(inspectionList);
      if (inspectionList.length > 0) {
        setActiveInspection(inspectionList[0]);
        setSelectedDefectIdx(0);
      }
    } catch (err: any) {
      console.error('Error loading vision data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMachine?.id]);

  // Synchronize modified defects when active inspection changes
  useEffect(() => {
    if (activeInspection?.defects) {
      setModifiedDefects(JSON.parse(JSON.stringify(activeInspection.defects)));
    } else {
      setModifiedDefects([]);
    }
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedDefectIdx(0);
  }, [activeInspection?.id]);

  // Handle Defect ROI canvas crop preview with validated coordinates, CORS safety and 4x optical zoom
  useEffect(() => {
    const canvas = roiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!activeInspection || selectedDefectIdx === null) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const defects = modifiedDefects.length > 0 ? modifiedDefects : (activeInspection.defects || []);
    const defect = defects[selectedDefectIdx];
    if (!defect || !defect.bbox || defect.bbox.length < 4) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let isCancelled = false;

    // Load image with CORS-safe fetch-to-blob to eliminate cross-origin canvas tainting and black output
    const loadAndRenderCrop = async () => {
      try {
        const rawUrl = activeInspection.raw_image_url;
        let imgUrl = rawUrl;
        let blobUrlToRevoke: string | null = null;

        try {
          const res = await fetch(rawUrl);
          if (res.ok) {
            const blob = await res.blob();
            imgUrl = URL.createObjectURL(blob);
            blobUrlToRevoke = imgUrl;
          }
        } catch {
          imgUrl = rawUrl;
        }

        const img = new Image();
        img.onload = () => {
          if (isCancelled) {
            if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
            return;
          }
          canvas.width = 280;
          canvas.height = 200;

          const natW = img.naturalWidth || 640;
          const natH = img.naturalHeight || 480;

          let [x1, y1, x2, y2] = defect.bbox;
          // Normalized coordinate handling (if in 0..1 scale)
          if (x2 <= 1.0 && y2 <= 1.0 && (natW > 1 || natH > 1)) {
            x1 *= natW;
            x2 *= natW;
            y1 *= natH;
            y2 *= natH;
          }

          // Strict boundary clamping
          x1 = Math.max(0, Math.min(natW - 1, x1));
          y1 = Math.max(0, Math.min(natH - 1, y1));
          x2 = Math.max(x1 + 2, Math.min(natW, x2));
          y2 = Math.max(y1 + 2, Math.min(natH, y2));

          const bw = x2 - x1;
          const bh = y2 - y1;
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;

          // 4x optical zoom: target window in original image is ~1/4 size
          const zoomAspect = 280 / 200;
          let targetW = Math.max(bw * 1.8, natW / 4);
          let targetH = targetW / zoomAspect;

          if (targetH > natH) {
            targetH = natH;
            targetW = targetH * zoomAspect;
          }

          const cropX = Math.max(0, Math.min(natW - targetW, cx - targetW / 2));
          const cropY = Math.max(0, Math.min(natH - targetH, cy - targetH / 2));
          const cropW = Math.min(natW - cropX, targetW);
          const cropH = Math.min(natH - cropY, targetH);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Render true zoomed crop
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

          // Calculate defect location within zoomed canvas coordinates
          const defCanvasX1 = ((x1 - cropX) / cropW) * canvas.width;
          const defCanvasY1 = ((y1 - cropY) / cropH) * canvas.height;
          const defCanvasW = (bw / cropW) * canvas.width;
          const defCanvasH = (bh / cropH) * canvas.height;

          // Thin red reticle around defect inside zoom view
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(defCanvasX1, defCanvasY1, defCanvasW, defCanvasH);

          // Corner tick marks in vibrant red
          const tick = 12;
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 2;

          // Top-left
          ctx.beginPath();
          ctx.moveTo(8, 8 + tick); ctx.lineTo(8, 8); ctx.lineTo(8 + tick, 8); ctx.stroke();
          // Top-right
          ctx.beginPath();
          ctx.moveTo(canvas.width - 8 - tick, 8); ctx.lineTo(canvas.width - 8, 8); ctx.lineTo(canvas.width - 8, 8 + tick); ctx.stroke();
          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(8, canvas.height - 8 - tick); ctx.lineTo(8, canvas.height - 8); ctx.lineTo(8 + tick, canvas.height - 8); ctx.stroke();
          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(canvas.width - 8 - tick, canvas.height - 8); ctx.lineTo(canvas.width - 8, canvas.height - 8); ctx.lineTo(canvas.width - 8, canvas.height - 8 - tick); ctx.stroke();

          if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
        };

        img.onerror = () => {
          if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
        };

        img.src = imgUrl;
      } catch (err) {
        console.error('Failed to render ROI crop:', err);
      }
    };

    loadAndRenderCrop();

    return () => {
      isCancelled = true;
    };
  }, [activeInspection?.raw_image_url, selectedDefectIdx, modifiedDefects]);

  // Zoom & Pan Handlers (Coordinate-locked SVG + Image)
  const handleZoomIn = () => setZoom((prev) => Math.min(4, +(prev + 0.25).toFixed(2)));
  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(1, +(prev - 0.25).toFixed(2));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoomPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Interactive Split-Screen comparison handlers
  const handleSplitMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPos(pct);
  };

  const handleSplitTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !splitContainerRef.current || !e.touches[0]) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPos(pct);
  };

  // Defect Review & Confirmation
  const handleToggleDefectStatus = (index: number) => {
    setModifiedDefects((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          is_confirmed: !copy[index].is_confirmed,
        };
      }
      return copy;
    });
  };

  const handleDismissDefect = (index: number) => {
    setModifiedDefects((prev) => prev.filter((_, idx) => idx !== index));
    if (selectedDefectIdx === index) {
      setSelectedDefectIdx(0);
    }
  };

  const handleSaveVerifiedDetections = async () => {
    if (!activeInspection) return;
    setIsSavingDefects(true);
    setActionFeedback(null);
    try {
      const res = await api.updateInspectionDefects(
        activeInspection.id,
        modifiedDefects,
        'Reviewed & verified on Nivaar AI Vision Platform by Lead Reliability Engineer'
      );
      const updatedDefects = res.defects || modifiedDefects;
      setActiveInspection((prev) => prev ? {
        ...prev,
        defects: updatedDefects,
        defect_count: updatedDefects.length,
        annotated_image_url: res.annotated_image_url || prev.annotated_image_url,
      } : null);
      setModifiedDefects(updatedDefects);
      setActionFeedback({
        type: 'success',
        message: 'Verified detections synchronized to Supabase! Image re-rendered with calibrated red bounding boxes.',
      });
      setInspections((prev) => prev.map((item) => (item.id === activeInspection.id ? {
        ...item,
        defects: updatedDefects,
        defect_count: updatedDefects.length,
      } : item)));
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to save verified detections: ${err.message}`,
      });
    } finally {
      setIsSavingDefects(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (inspecting) return;
    const file = e.target.files?.[0];
    if (!file || !currentMachine) return;
    // Reset file input target so identical file can be re-selected if desired
    e.target.value = '';
    setInspecting(true);
    setStatusMessage(`Uploading ${file.name} and executing CV defect pipelines...`);
    setActionFeedback(null);
    try {
      const res = await api.uploadImageInspection(currentMachine.id, file, componentName, `User inspection upload: ${file.name}`);
      setActiveInspection(res);
      setSelectedDefectIdx(res.defects && res.defects.length > 0 ? 0 : null);
      setStatusMessage(`Inspection complete: ${res.defect_count ?? res.defects?.length ?? 0} defect(s) detected (${res.visual_severity} severity).`);
      const updated = await api.getImageInspections(currentMachine.id);
      setInspections(updated);
    } catch (err: any) {
      setStatusMessage(`Inspection failed: ${err.message}`);
    } finally {
      setInspecting(false);
    }
  };

  const handleSampleInspect = async (sample: VisionSample) => {
    if (inspecting || !currentMachine) return;
    setInspecting(true);
    setStatusMessage(`Running computer vision models on ${sample.name}...`);
    setActionFeedback(null);
    try {
      const res = await api.inspectSampleImage(currentMachine.id, sample.filename, sample.component);
      setActiveInspection(res);
      setSelectedDefectIdx(res.defects && res.defects.length > 0 ? 0 : null);
      setStatusMessage(`Analysis complete: ${res.defect_count ?? res.defects?.length ?? 0} defect(s) identified.`);
      const updated = await api.getImageInspections(currentMachine.id);
      setInspections(updated);
    } catch (err: any) {
      setStatusMessage(`Sample inspection failed: ${err.message}`);
    } finally {
      setInspecting(false);
    }
  };

  // 1-Click Action: Create Maintenance Work Order
  const handleCreateWorkOrder = async (targetDefect?: ImageDefect) => {
    if (!currentMachine || !activeInspection) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const taskTitle = targetDefect
        ? `Remediate Surface Defect: ${targetDefect.label}`
        : `Physical Overhaul: ${activeInspection.component_name} (${activeInspection.visual_severity})`;
      
      const taskDesc = targetDefect
        ? `Computer Vision identified ${targetDefect.defect_type.toUpperCase()} on ${activeInspection.component_name}.\n` +
          `Confidence: ${(targetDefect.confidence * 100).toFixed(1)}% | Bounding Box: [${targetDefect.bbox.join(', ')}]\n` +
          `Surface Footprint: ${(targetDefect.area_pct ?? 0).toFixed(2)}%\n` +
          `Finding: ${targetDefect.description}\n` +
          `Action: ${targetDefect.recommendation || 'Perform non-destructive dye penetrant test and re-evaluate wall thickness.'}`
        : `Automated visual inspection identified ${activeInspection.defect_count} surface anomalies.\n` +
          `Visual Severity: ${activeInspection.visual_severity} (Condition Score: ${activeInspection.visual_condition_score}%).\n` +
          `Machine: ${currentMachine.name} (${currentMachine.asset_tag}).`;

      const priority = (activeInspection.visual_severity === 'CRITICAL' || targetDefect?.severity === 'CRITICAL')
        ? 'CRITICAL'
        : (activeInspection.visual_severity === 'SEVERE' ? 'HIGH' : 'MEDIUM');

      await api.createMaintenanceTask({
        machine_id: currentMachine.id,
        title: taskTitle,
        description: taskDesc,
        priority: priority as any,
        assignee: 'Lead Mechanical Technician',
        risk_score: activeInspection.visual_severity === 'CRITICAL' ? 92.0 : 75.0,
      });

      setActionFeedback({
        type: 'success',
        message: `Maintenance Work Order dispatched for ${currentMachine.name} (Priority: ${priority})`
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to create work order: ${err.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Action: Escalate Incident Command
  const handleEscalateIncident = async () => {
    if (!currentMachine || !activeInspection) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      await api.createIncident({
        machine_id: currentMachine.id,
        title: `CRITICAL Surface Fracture: ${activeInspection.component_name}`,
        operational_impact: `Computer Vision defect segmentation flagged critical structural compromise (${activeInspection.visual_severity} severity, ${activeInspection.defect_count} defects detected). Immediate mechanical shutdown or load shedding recommended to prevent catastrophic failure.`,
        severity: activeInspection.visual_severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        recommended_inspections: [
          'Immediate physical lock-out/tag-out walkdown and ultrasonic NDT crack depth verification.',
          'Cross-correlate TENG vibration telemetry for coupled impact shock kurtosis.',
          'Evaluate structural fatigue propagation across bearing raceway / volute housing.'
        ]
      });

      setActionFeedback({
        type: 'success',
        message: `Incident escalated to Emergency Command Center for ${currentMachine.name}!`
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to escalate incident: ${err.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const allDefects = activeInspection?.defects || [];
  
  // Filter defects based on threshold and tab
  const filteredDefects = allDefects.filter((d) => {
    const confPct = (d.confidence ?? 0) * 100;
    if (confPct < confidenceThreshold) return false;
    if (defectFilter === 'confirmed') return d.is_confirmed;
    if (defectFilter === 'uncertain') return !d.is_confirmed;
    return true;
  });

  const selectedDefect = (selectedDefectIdx !== null && selectedDefectIdx < allDefects.length)
    ? allDefects[selectedDefectIdx]
    : (filteredDefects.length > 0 ? filteredDefects[0] : null);

  const confirmedCount = allDefects.filter((d) => d.is_confirmed).length;
  const uncertainCount = allDefects.filter((d) => !d.is_confirmed).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Machine Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#FF5E1E]/20 to-[#FF8A3D]/20 border border-[#FF5E1E]/40 flex items-center justify-center text-[#FF5E1E] shadow-[0_0_20px_rgba(255,94,30,0.3)]">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">AI Image Analysis Platform</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF5E1E]/15 text-[#FF7A00] border border-[#FF5E1E]/30 uppercase tracking-widest font-semibold">
                Computer Vision
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated surface defect segmentation: structural cracks, pitting corrosion, and mechanical wear spalling.
            </p>
          </div>
        </div>

        {/* Machine Picker & Benchmark Proof Button */}
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <button
            onClick={() => setShowProofModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF5E1E]/20 to-blue-500/20 border border-[#FF5E1E]/40 text-xs font-semibold text-white hover:border-[#FF5E1E] transition-all shadow-md hover:shadow-[0_0_15px_rgba(255,94,30,0.3)]"
          >
            <ShieldCheck className="w-4 h-4 text-[#FF7A00]" />
            <span>Trained AI Proof & Sectors</span>
          </button>

          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-400 font-medium">Target Asset:</label>
            <select
              value={currentMachine?.id || ''}
              onChange={(e) => onSelectMachine(e.target.value)}
              className="bg-[#1D212B] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#FF5E1E] focus:ring-1 focus:ring-[#FF5E1E] transition-all"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.asset_tag})
                </option>
              ))}
            </select>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg bg-[#1D212B] hover:bg-[#252B38] border border-slate-700/80 text-slate-300 hover:text-[#FF5E1E] transition-colors"
              title="Refresh Inspections"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FF5E1E]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="p-3 rounded-lg bg-[#FF5E1E]/15 border border-[#FF5E1E]/30 text-xs text-[#FF8A3D] flex items-center justify-between backdrop-blur-md">
          <span>{statusMessage}</span>
          <button 
            onClick={() => setStatusMessage('')} 
            aria-label="Dismiss status notification"
            className="text-[#FF8A3D] hover:text-white font-bold ml-2 p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Action feedback toast */}
      {actionFeedback && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between backdrop-blur-md ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
            : 'bg-red-950/60 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center space-x-2">
            {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button 
            onClick={() => setActionFeedback(null)} 
            aria-label="Dismiss action feedback"
            className="hover:text-white font-bold ml-2 p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Grid: Upload / Sample Cards & Active Inspection View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Image Ingestion (Upload or Select Sample) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Custom Upload Card */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <UploadCloud className="w-4 h-4 text-[#FF5E1E]" />
              <span>Inspect Component Image</span>
            </h3>

            <div className="space-y-2">
              <label htmlFor="component-name-input" className="text-[11px] text-slate-400 block font-medium">Component Inspected:</label>
              <input
                id="component-name-input"
                type="text"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                placeholder="e.g., Drive-End Bearing Race"
                aria-label="Component Inspected"
                className="w-full bg-[#1D212B] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#FF5E1E]"
              />
            </div>

            <div className="border-2 border-dashed border-slate-700/80 hover:border-[#FF5E1E]/70 rounded-xl p-5 text-center transition-all bg-[#12141A]/90 backdrop-blur-md">
              <Camera className="w-8 h-8 text-[#FF5E1E] mx-auto mb-2" />
              <p className="text-xs text-slate-200 font-medium mb-1">Upload Component Photo</p>
              <p className="text-[10px] text-slate-500 mb-3">JPG, PNG, WebP up to 15 MB</p>
              <label 
                htmlFor="component-image-file-input"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-[#0F1115] font-bold text-xs cursor-pointer hover:shadow-[0_0_20px_rgba(255,94,30,0.5)] transition-all min-h-[38px] touch-target-min"
              >
                <span>Select Image</span>
                <input 
                  id="component-image-file-input"
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="sr-only" 
                  disabled={inspecting} 
                  aria-label="Upload Component Image"
                />
              </label>
            </div>
          </div>

          {/* Preset Sample Gallery */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#FF7A00]" />
                <span>Test Preloaded Damage Samples</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Verified CV</span>
            </div>
            <p className="text-[11px] text-slate-400">
              One-click empirical defect images demonstrating verified crack, corrosion, and spalling recognition.
            </p>

            <div className="space-y-2.5 pt-1">
              {samples.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Test preloaded sample: ${s.name} on ${s.component}`}
                  onClick={() => handleSampleInspect(s)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSampleInspect(s);
                    }
                  }}
                  className="p-3 rounded-xl bg-[#1D212B]/90 border border-slate-700/70 hover:border-[#FF5E1E]/60 cursor-pointer transition-all flex flex-col space-y-2 group shadow-md focus:outline-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-white group-hover:text-[#FF8A3D] transition-colors">
                      {s.name}
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                      s.expected_severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                      s.expected_severity === 'SEVERE' ? 'bg-[#2A1810] text-[#FF5E1E] border border-[#FF5E1E]/40' :
                      'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {s.expected_severity || 'INSPECT'}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                    <span className="font-mono text-[#FF7A00]">{s.component}</span>
                    <span>•</span>
                    <span className="text-slate-400 font-mono truncate max-w-[140px]">{s.filename}</span>
                  </div>

                  {s.sector && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 inline-block w-fit">
                      {s.sector}
                    </span>
                  )}

                  {s.expected_defects && s.expected_defects.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {s.expected_defects.map((def, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                          {def}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Past Inspections for this Machine */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-xl space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Inspection History ({inspections.length})</span>
            </h3>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {inspections.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">No visual inspections recorded yet.</div>
              ) : (
                inspections.map((insp) => (
                  <div
                    key={insp.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`View inspection for ${insp.component_name}`}
                    onClick={() => {
                      setActiveInspection(insp);
                      setSelectedDefectIdx(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveInspection(insp);
                        setSelectedDefectIdx(0);
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all focus:outline-none ${
                      activeInspection?.id === insp.id
                        ? 'bg-[#FF5E1E]/20 border-[#FF5E1E]/50 text-white'
                        : 'bg-[#1D212B]/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#FF8A3D] truncate">{insp.component_name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        insp.visual_severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                        insp.visual_severity === 'SEVERE' ? 'bg-[#2A1810] text-[#FF5E1E] border border-[#FF5E1E]/40' :
                        insp.visual_severity === 'MODERATE' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {insp.visual_severity}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>{insp.defect_count ?? insp.defects?.length ?? 0} defect(s) detected</span>
                      <span className="font-mono text-[#FF7A00]">Score: {insp.visual_condition_score}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Inspection Canvas & Defect Annotations */}
        <div className="lg:col-span-8 space-y-5">
          {inspecting ? (
            <div className="p-16 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#FF5E1E] animate-spin mx-auto" />
              <h4 className="text-sm font-semibold text-white">Extracting Computer Vision Contours</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Applying oriented minimum area bounding boxes, HSV rust colorimetry, and high-curvature fatigue spalling analysis...
              </p>
            </div>
          ) : activeInspection ? (
            <div className="space-y-5">
              {/* Image Inspection Header Banner */}
              <div className="p-4 rounded-xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">{activeInspection.component_name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      activeInspection.visual_severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                      activeInspection.visual_severity === 'SEVERE' ? 'bg-[#2A1810] text-[#FF5E1E] border border-[#FF5E1E]/40' :
                      activeInspection.visual_severity === 'MODERATE' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}>
                      {activeInspection.visual_severity} Severity
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Visual Condition Score: <span className="font-mono text-[#FF7A00] font-bold">{activeInspection.visual_condition_score}%</span> • Inspected {activeInspection.created_at?.slice(0, 19).replace('T', ' ')}
                  </div>
                </div>

                {/* Direct Action Buttons: Work Order & Incident Escalation */}
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    onClick={() => handleCreateWorkOrder(selectedDefect || undefined)}
                    disabled={actionLoading}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-[#0F1115] font-bold text-xs hover:shadow-[0_0_15px_rgba(255,94,30,0.4)] transition-all min-h-[32px]"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Create Work Order</span>
                  </button>

                  {(activeInspection.visual_severity === 'CRITICAL' || activeInspection.visual_severity === 'SEVERE') && (
                    <button
                      onClick={handleEscalateIncident}
                      disabled={actionLoading}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] min-h-[32px]"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-200" />
                      <span>Escalate Incident</span>
                    </button>
                  )}

                  {onNavigateToReportStudio && currentMachine && (
                    <button
                      onClick={() => onNavigateToReportStudio(currentMachine.id, activeInspection.id)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all min-h-[32px]"
                      title="Compile this visual inspection into the consolidated engineering PDF"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Finalize in Report Studio</span>
                    </button>
                  )}

                  <button
                    onClick={handleSaveVerifiedDetections}
                    disabled={isSavingDefects}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all min-h-[32px]"
                    title="Save confirmed / dismissed defect labels back to Supabase and regenerate calibrated red bounding boxes"
                  >
                    {isSavingDefects ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isSavingDefects ? 'Saving...' : 'Save Detections'}</span>
                  </button>

                  <a
                    href={`/api/reports/${currentMachine?.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1D212B] hover:bg-[#252B38] border border-slate-700 text-slate-200 font-semibold text-xs transition-all min-h-[32px]"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Quick PDF</span>
                  </a>
                </div>
              </div>

              {/* View Mode, Zoom & Defect Visibility Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#161920]/80 border border-white/10 text-xs shadow-md">
                {/* View Mode Buttons */}
                <div className="flex items-center space-x-1 bg-[#1D212B] p-1 rounded-lg border border-slate-700/80">
                  <button
                    onClick={() => setViewMode('annotated')}
                    aria-label="View annotated computer vision image"
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      viewMode === 'annotated' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Annotated (CV)
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    aria-label="View raw observation image"
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      viewMode === 'raw' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Raw Image
                  </button>
                  <button
                    onClick={() => setViewMode('sideBySide')}
                    aria-label="View side-by-side comparison"
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      viewMode === 'sideBySide' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    onClick={() => setViewMode('splitCompare')}
                    aria-label="View interactive split-screen slider"
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 ${
                      viewMode === 'splitCompare' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Split className="w-3 h-3" />
                    <span>Split Slider</span>
                  </button>
                </div>

                {/* Detections & Segmentation Outlines Toggles */}
                <div className="flex items-center space-x-2 bg-[#1D212B] px-2.5 py-1 rounded-lg border border-slate-700/80">
                  <button
                    onClick={() => setShowDetections((prev) => !prev)}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      showDetections ? 'bg-red-950/80 text-red-400 border border-red-800' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Toggle pure red defect bounding box annotations"
                  >
                    {showDetections ? <Eye className="w-3.5 h-3.5 text-red-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>Red Boxes</span>
                  </button>

                  <button
                    onClick={() => setShowSegmentationMasks((prev) => !prev)}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      showSegmentationMasks ? 'bg-rose-950/80 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Toggle pixel-level contour segmentation masks for irregular cracks & corrosion"
                  >
                    <Layers className="w-3.5 h-3.5 text-rose-400" />
                    <span>Crack Masks</span>
                  </button>
                </div>

                {/* Precision Zoom & Pan Controls */}
                <div className="flex items-center space-x-1 bg-[#1D212B] p-1 rounded-lg border border-slate-700/80">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-slate-300 px-1 min-w-[38px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 4}
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetZoomPan}
                    className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors"
                    title="Reset Zoom & Pan"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sensitivity Threshold Slider */}
                <div className="flex items-center space-x-2 bg-[#1D212B] px-3 py-1 rounded-lg border border-slate-700/80">
                  <div className="flex items-center space-x-1 text-slate-400">
                    <Sliders className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[11px] font-medium">Confidence:</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    aria-label="Defect confidence sensitivity threshold"
                    className="w-20 accent-red-500 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-red-400 text-xs min-w-[32px]">
                    ≥{confidenceThreshold}%
                  </span>
                </div>
              </div>

              {/* Inspection Image Display Box with Mathematical Coordinate Locking */}
              <div className="p-4 rounded-2xl bg-[#12141A]/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                {viewMode === 'sideBySide' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Raw Observation</span>
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center min-h-[280px]">
                        <img 
                          src={activeInspection.raw_image_url} 
                          alt="Raw Component" 
                          className="max-h-[380px] w-auto object-contain"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block">AI Pure Red Bounding Boxes & Contours</span>
                      <div className="rounded-xl overflow-hidden border border-red-500/40 bg-black flex items-center justify-center min-h-[280px]">
                        <img 
                          src={activeInspection.annotated_image_url || activeInspection.raw_image_url} 
                          alt="CV Annotated Defect" 
                          className="max-h-[380px] w-auto object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : viewMode === 'splitCompare' ? (
                  <div 
                    ref={splitContainerRef}
                    onMouseMove={handleSplitMouseMove}
                    onTouchMove={handleSplitTouchMove}
                    onMouseUp={() => setIsDraggingSplit(false)}
                    onTouchEnd={() => setIsDraggingSplit(false)}
                    className="relative w-full max-h-[480px] min-h-[340px] overflow-hidden rounded-xl bg-black border border-slate-800 select-none flex items-center justify-center cursor-ew-resize"
                  >
                    {/* Underlying Raw Image */}
                    <img 
                      src={activeInspection.raw_image_url} 
                      alt="Raw Unannotated Asset" 
                      className="max-h-[440px] w-auto object-contain pointer-events-none block"
                    />

                    {/* Overlaid Annotated Red Box Layer with Dynamic CSS Clip Path */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
                    >
                      <img 
                        src={activeInspection.annotated_image_url || activeInspection.raw_image_url} 
                        alt="Annotated Red Bounding Box Asset" 
                        className="max-h-[440px] w-auto object-contain block"
                      />
                    </div>

                    {/* Draggable Red Divider Line & Handle */}
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.9)] z-20 flex items-center justify-center"
                      style={{ left: `${splitPos}%` }}
                      onMouseDown={() => setIsDraggingSplit(true)}
                      onTouchStart={() => setIsDraggingSplit(true)}
                    >
                      <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-2xl flex items-center justify-center text-[11px] text-white font-bold cursor-ew-resize select-none">
                        ↔
                      </div>
                    </div>

                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 z-10">
                      RAW OBSERVATION
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-1 rounded bg-red-950/90 backdrop-blur-md border border-red-600/50 text-[10px] font-mono text-red-300 font-bold z-10">
                      RED DEFECT DETECTIONS
                    </div>
                  </div>
                ) : (
                  <div 
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className={`relative flex flex-col items-center justify-center min-h-[340px] max-h-[480px] overflow-hidden rounded-xl bg-black border border-slate-800/80 ${
                      zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                    }`}
                  >
                    {/* Transform Container: Scaled & panned synchronously so SVG coordinates never drift */}
                    <div 
                      className="relative inline-block"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isPanning ? 'none' : 'transform 0.15s ease-out'
                      }}
                    >
                      <img 
                        src={viewMode === 'annotated' ? (activeInspection.annotated_image_url || activeInspection.raw_image_url) : activeInspection.raw_image_url} 
                        alt="Inspection View" 
                        onLoad={(e) => {
                          setImgNaturalSize({
                            width: e.currentTarget.naturalWidth || 640,
                            height: e.currentTarget.naturalHeight || 480
                          });
                        }}
                        className="max-h-[460px] w-auto object-contain block select-none pointer-events-none"
                      />

                      {/* Interactive SVG Overlay with Calibrated Thin Red Bounding Boxes and Non-Overlapping Labels */}
                      {showDetections && (
                        <svg
                          viewBox={`0 0 ${imgNaturalSize.width} ${imgNaturalSize.height}`}
                          className="absolute inset-0 w-full h-full pointer-events-auto"
                        >
                          {(() => {
                            // Pre-calculate label tag vertical positions to avoid overlap
                            const labelYMap = new Map<number, number>();
                            const placedRects: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

                            filteredDefects.forEach((d, idx) => {
                              const [x1, y1, x2, y2] = d.bbox;
                              const tagW = 160;
                              const tagH = 20;
                              let tagX = Math.max(2, Math.min(imgNaturalSize.width - tagW - 2, x1));
                              let tagY = y1 - 24;
                              if (tagY < 4) tagY = y2 + 4;

                              // Adjust if overlapping with already placed tag
                              let attempts = 0;
                              while (attempts < 5) {
                                const collides = placedRects.some(r => 
                                  Math.abs(r.x1 - tagX) < (tagW - 10) && Math.abs(r.y1 - tagY) < (tagH + 4)
                                );
                                if (!collides) break;
                                tagY += 24; // shift down
                                attempts++;
                              }

                              placedRects.push({ x1: tagX, y1: tagY, x2: tagX + tagW, y2: tagY + tagH });
                              labelYMap.set(idx, tagY);
                            });

                            return filteredDefects.map((d, idx) => {
                              const [x1, y1, x2, y2] = d.bbox;
                              const bw = Math.max(4, x2 - x1);
                              const bh = Math.max(4, y2 - y1);
                              const isSelected = selectedDefect === d;
                              const tagY = labelYMap.get(idx) ?? Math.max(4, y1 - 22);

                              return (
                                <g 
                                  key={idx} 
                                  className="cursor-pointer group"
                                  onClick={() => {
                                    const originalIdx = allDefects.indexOf(d);
                                    setSelectedDefectIdx(originalIdx >= 0 ? originalIdx : idx);
                                  }}
                                >
                                  {/* Pixel-Level Segmentation Masks for Irregular Cracks and Corrosion */}
                                  {showSegmentationMasks && d.svg_path && (
                                    <path
                                      d={d.svg_path}
                                      fill={isSelected ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.20)'}
                                      stroke="#EF4444"
                                      strokeWidth={1.5}
                                      className="transition-all duration-150"
                                    />
                                  )}
                                  {showSegmentationMasks && !d.svg_path && d.polygon && d.polygon.length > 2 && (
                                    <polygon
                                      points={d.polygon.map((pt) => pt.join(',')).join(' ')}
                                      fill={isSelected ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.20)'}
                                      stroke="#EF4444"
                                      strokeWidth={1.5}
                                      className="transition-all duration-150"
                                    />
                                  )}

                                  {/* Thin Red Bounding Box */}
                                  <rect
                                    x={x1}
                                    y={y1}
                                    width={bw}
                                    height={bh}
                                    fill={isSelected ? 'rgba(239, 68, 68, 0.15)' : 'transparent'}
                                    stroke={isSelected ? '#FF0000' : '#EF4444'}
                                    strokeWidth={isSelected ? 2 : 1.5}
                                    strokeDasharray={isSelected ? '5 3' : 'none'}
                                    rx={2}
                                  />

                                  {/* Corner Reticle Brackets */}
                                  <g stroke="#EF4444" strokeWidth={1.5} fill="none">
                                    <path d={`M ${x1} ${y1 + 6} L ${x1} ${y1} L ${x1 + 6} ${y1}`} />
                                    <path d={`M ${x2 - 6} ${y1} L ${x2} ${y1} L ${x2} ${y1 + 6}`} />
                                    <path d={`M ${x1} ${y2 - 6} L ${x1} ${y2} L ${x1 + 6} ${y2}`} />
                                    <path d={`M ${x2 - 6} ${y2} L ${x2} ${y2} L ${x2} ${y2 - 6}`} />
                                  </g>

                                  {/* Non-Overlapping Label Tag Pill */}
                                  <rect
                                    x={Math.max(2, Math.min(imgNaturalSize.width - 150, x1))}
                                    y={tagY}
                                    width={146}
                                    height={18}
                                    fill="#141820"
                                    fillOpacity={0.92}
                                    stroke={isSelected ? '#FF0000' : '#EF4444'}
                                    strokeWidth={1}
                                    rx={3}
                                  />
                                  <text
                                    x={Math.max(6, Math.min(imgNaturalSize.width - 146, x1 + 4))}
                                    y={tagY + 13}
                                    fill="#FFFFFF"
                                    fontSize={10}
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                  >
                                    {d.label?.slice(0, 16)} ({(d.confidence * 100).toFixed(0)}%)
                                  </text>
                                </g>
                              );
                            });
                          })()}
                        </svg>
                      )}
                    </div>

                    {zoom > 1 && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 select-none">
                        Zoom: {Math.round(zoom * 100)}% • Click &amp; Drag to Pan
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Deep Neural Surface Defect Classification (Sector 2 NEU-CLS CNN) */}
              {activeInspection?.deep_classification && activeInspection.deep_classification.available && (
                <div className="p-5 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-blue-500/30 shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                        <Sparkles className="w-4 h-4 text-[#FF7A00]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                          <span>PyTorch Deep Surface Classification</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 uppercase font-semibold">
                            Sector 2: NEU-CLS CNN
                          </span>
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {activeInspection.deep_classification.model_name} • Trained on 1,800 authentic industrial steel defect images
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        activeInspection.deep_classification.is_confirmed
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {activeInspection.deep_classification.classification_status}
                      </span>
                      <span className="font-mono text-sm text-[#FF7A00] font-bold">
                        {activeInspection.deep_classification.confidence_pct}% Confidence
                      </span>
                    </div>
                  </div>

                  {/* Classification summary grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 block">Predicted Defect Class</span>
                      <span className="font-bold text-white text-sm uppercase text-[#FF8A3D]">
                        {activeInspection.deep_classification.predicted_label}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 block">Softmax Probability</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {((activeInspection.deep_classification.confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 block">Uncertainty Metric (1 - P)</span>
                      <span className="font-mono font-bold text-slate-300 text-sm">
                        {activeInspection.deep_classification.uncertainty_score}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 block">Normalized Entropy</span>
                      <span className="font-mono font-bold text-blue-300 text-sm">
                        {activeInspection.deep_classification.normalized_entropy} / 1.00
                      </span>
                    </div>
                  </div>

                  {/* Class Probabilities Bar Chart */}
                  {activeInspection.deep_classification.class_probabilities && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                        Softmax Probability Distribution Across 6 NEU Defect Classes
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                        {Object.entries(activeInspection.deep_classification.class_probabilities).map(([clsName, prob]: [string, any]) => {
                          const isTop = clsName === activeInspection.deep_classification?.predicted_defect;
                          const pct = Math.round(Number(prob) * 100);
                          return (
                            <div key={clsName} className={`p-2 rounded-lg border ${isTop ? 'bg-[#FF5E1E]/10 border-[#FF5E1E]/50' : 'bg-[#1D212B]/60 border-white/5'}`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`capitalize ${isTop ? 'font-bold text-[#FF8A3D]' : 'text-slate-400'}`}>
                                  {clsName.replace('_', ' ')}
                                </span>
                                <span className="font-mono text-[10px] text-slate-300">{pct}%</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${isTop ? 'bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00]' : 'bg-slate-600'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Deep Neural Structural Crack Classification (Sector 3 CrackDetectorCNN - Whole Image Assessment) */}
              {activeInspection?.deep_crack_classification && activeInspection.deep_crack_classification.available && (
                <div className="p-5 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-emerald-500/30 shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                          <span>Sector 3 CrackDetectorCNN (Binary 2D-CNN)</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 uppercase font-semibold">
                            Global Image Assessment
                          </span>
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {activeInspection.deep_crack_classification.model_name} • Whole-image crack presence classification
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        activeInspection.deep_crack_classification.predicted_class === 'structural_crack'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      }`}>
                        {activeInspection.deep_crack_classification.predicted_class === 'structural_crack'
                          ? 'CRACK FEATURES INDICATED'
                          : 'NOMINAL SOUND SURFACE'}
                      </span>
                      <span className="font-mono text-sm text-[#FF7A00] font-bold">
                        {activeInspection.deep_crack_classification.confidence_pct}% Softmax Prob
                      </span>
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 block">Class Prediction</span>
                      <span className={`font-bold text-sm uppercase ${
                        activeInspection.deep_crack_classification.predicted_class === 'structural_crack'
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}>
                        {activeInspection.deep_crack_classification.predicted_label}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 block">Softmax Crack Prob</span>
                      <span className="font-mono font-bold text-[#FF8A3D] text-sm">
                        {(((activeInspection.deep_crack_classification.crack_probability ?? 0) * 100)).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 block">Softmax Sound Prob</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {(((activeInspection.deep_crack_classification.sound_probability ?? 0) * 100)).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 block">Spatial Localization</span>
                      <span className="font-mono font-semibold text-amber-300 text-[11px] block">
                        Defect location unavailable (CNN lacks bounding output)
                      </span>
                    </div>
                  </div>

                  {/* Dual Probability Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 font-medium">Softmax Probability Distribution (Distinguished from Test Accuracy)</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        Entropy: {activeInspection.deep_crack_classification.normalized_entropy ?? 0} / 1.00
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-rose-300">Crack Softmax Score</span>
                          <span className="font-mono text-rose-400 font-semibold">
                            {(((activeInspection.deep_crack_classification.crack_probability ?? 0) * 100)).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                            style={{ width: `${Math.round((activeInspection.deep_crack_classification.crack_probability ?? 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-emerald-300">Sound Surface Softmax Score</span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            {(((activeInspection.deep_crack_classification.sound_probability ?? 0) * 100)).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${Math.round((activeInspection.deep_crack_classification.sound_probability ?? 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200 flex items-center space-x-2">
                    <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      <strong>Engineering Integrity Note:</strong> Whole-image CNN classifiers evaluate global texture features and do not provide spatial coordinates. Bounding boxes are never synthesized from classification probabilities.
                    </span>
                  </div>
                </div>
              )}

              {/* Selected Defect Focus Panel (ROI Magnifier + Engineering Recommendations) */}
              {selectedDefect && filteredDefects.length > 0 ? (
                <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[#FF5E1E]/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2">
                      <Crosshair className="w-4 h-4 text-[#FF5E1E]" />
                      <h4 className="text-sm font-bold text-white">
                        Selected Defect Diagnostics: <span className="text-[#FF8A3D]">{selectedDefect.label}</span>
                      </h4>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        selectedDefect.is_confirmed 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {selectedDefect.is_confirmed ? 'High-Confidence Defect' : 'Candidate Defect'}
                      </span>
                      <span className="font-mono text-xs text-[#FF7A00] font-bold">
                        {(selectedDefect.confidence * 100).toFixed(1)}% Confidence
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    {/* ROI 4x Zoom Canvas */}
                    <div className="md:col-span-5 flex flex-col items-center">
                      <div className="relative rounded-xl overflow-hidden border border-[#FF5E1E]/40 bg-black p-1 shadow-lg">
                        <canvas
                          ref={roiCanvasRef}
                          className="w-[240px] h-[170px] rounded-lg block"
                        />
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-[#FF7A00] border border-white/10">
                          ROI 4x Optical Crop
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 font-mono">
                        BBox: [{selectedDefect.bbox?.join(', ')}]
                      </span>
                    </div>

                    {/* Defect Physical Attributes & Recommendation */}
                    <div className="md:col-span-7 space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Physical Finding</span>
                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                          {selectedDefect.description || 'Contour segmentation indicates localized surface compromise.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-[#1D212B] border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 block">Image Footprint (Uncalibrated)</span>
                          <span className="font-mono font-bold text-white">
                            {(selectedDefect.area_pct ?? 0).toFixed(2)}% of frame
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-[#1D212B] border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 block">Defect Family</span>
                          <span className="font-mono font-bold text-[#FF8A3D] uppercase">
                            {selectedDefect.defect_type}
                          </span>
                        </div>
                      </div>

                      {selectedDefect.recommendation && (
                        <div className="p-2.5 rounded-lg bg-[#2A1810] border border-[#FF5E1E]/30 text-xs space-y-1">
                          <span className="text-[10px] font-bold text-[#FF8A3D] uppercase flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Recommended Mitigation Action</span>
                          </span>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {selectedDefect.recommendation}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            if (selectedDefectIdx !== null) handleToggleDefectStatus(selectedDefectIdx);
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                            selectedDefect.is_confirmed
                              ? 'bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900/60'
                              : 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{selectedDefect.is_confirmed ? 'Reclassify as Candidate' : 'Confirm Defect'}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (selectedDefectIdx !== null) handleDismissDefect(selectedDefectIdx);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/50 border border-red-800 text-red-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Dismiss</span>
                        </button>

                        <button
                          onClick={handleSaveVerifiedDetections}
                          disabled={isSavingDefects}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md transition-colors"
                        >
                          {isSavingDefects ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          <span>Save & Sync to Supabase</span>
                        </button>

                        <button
                          onClick={() => handleCreateWorkOrder(selectedDefect)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg bg-[#1D212B] hover:bg-[#2A3140] border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Dispatch Ticket</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3">
                  <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                    <Crosshair className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-bold text-white">Selected Defect Diagnostics</h4>
                  </div>
                  <div className="p-8 rounded-xl bg-[#12141A] border border-dashed border-slate-700/80 flex flex-col items-center justify-center text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">No valid defect region selected</span>
                    <p className="text-xs text-slate-400 max-w-sm">
                      No structural cracks, corrosion, or mechanical wear spalling detected above threshold. Surface condition nominal.
                    </p>
                  </div>
                </div>
              )}

              {/* Classification Distinction Pill: Confirmed vs Uncertain */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400" />
                    <span className="text-xs text-slate-300 font-medium">
                      High-Confidence Defects (≥ 80%): <span className="font-mono font-bold text-emerald-400">{confirmedCount}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF7A00] border border-[#FF5E1E]" />
                    <span className="text-xs text-slate-300 font-medium">
                      Candidate Anomalies (&lt; 80%): <span className="font-mono font-bold text-[#FF8A3D]">{uncertainCount}</span>
                    </span>
                  </div>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="text-slate-500 text-[11px] mr-1">Filter:</span>
                  {(['all', 'confirmed', 'uncertain'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setDefectFilter(f)}
                      aria-label={`Filter defects: ${f}`}
                      className={`px-3 py-1 rounded text-[11px] font-semibold capitalize transition-all ${
                        defectFilter === f ? 'bg-[#FF5E1E] text-[#0F1115] font-bold shadow-md' : 'bg-[#1D212B] text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detected Defects Table */}
              <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-red-500" />
                    <span>Segmented Defects &amp; Quantitative CV Metrics</span>
                  </h4>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-slate-400">
                      Showing <span className="text-white font-mono font-bold">{filteredDefects.length}</span> of {allDefects.length} defects
                    </span>
                    <button
                      onClick={handleSaveVerifiedDetections}
                      disabled={isSavingDefects}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center space-x-1 shadow-sm transition-colors"
                      title="Save verified detections to Supabase"
                    >
                      {isSavingDefects ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      <span>Save Changes</span>
                    </button>
                    {onNavigateToReportStudio && currentMachine && (
                      <button
                        onClick={() => onNavigateToReportStudio(currentMachine.id, activeInspection.id)}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white text-[11px] font-bold flex items-center space-x-1 shadow-sm transition-colors"
                      >
                        <FileCheck className="w-3 h-3" />
                        <span>Send to Report</span>
                      </button>
                    )}
                  </div>
                </div>

                {filteredDefects.length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 text-center">
                    No defects match the selected confidence threshold and filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#1D212B] text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Label</th>
                          <th className="py-2.5 px-3">Confidence</th>
                          <th className="py-2.5 px-3">Review Status</th>
                          <th className="py-2.5 px-3">Bounding Box [X1, Y1, X2, Y2]</th>
                          <th className="py-2.5 px-3">Surface Area</th>
                          <th className="py-2.5 px-3 text-right">Verification &amp; Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {filteredDefects.map((d, idx) => {
                          const isSelected = selectedDefect === d;
                          const originalIdx = allDefects.indexOf(d);
                          const activeIdx = originalIdx >= 0 ? originalIdx : idx;

                          return (
                            <tr 
                              key={idx} 
                              onClick={() => setSelectedDefectIdx(activeIdx)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-red-950/30 border-l-2 border-red-500' : 'hover:bg-[#1E232F]/50'
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/80 text-red-300 border border-red-800 uppercase font-semibold">
                                  {d.defect_type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center space-x-1.5">
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                                <span>{d.label}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`font-bold ${(d.confidence ?? 0) >= 0.8 ? 'text-red-400' : 'text-amber-400'}`}>
                                  {((d.confidence ?? 0) * 100).toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleDefectStatus(activeIdx);
                                  }}
                                  title="Click to toggle confirmation status"
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                    d.is_confirmed 
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60' 
                                      : 'bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900/60'
                                  }`}
                                >
                                  {d.is_confirmed ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
                                  <span>{d.is_confirmed ? 'VERIFIED' : 'CANDIDATE'}</span>
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                [{d.bbox?.join(', ')}]
                              </td>
                              <td className="py-2.5 px-3 text-red-400 font-mono">
                                {(d.area_pct ?? 0).toFixed(2)}%
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end space-x-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDismissDefect(activeIdx);
                                    }}
                                    title="Dismiss this defect as false positive"
                                    className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/80 text-[10px] transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateWorkOrder(d);
                                    }}
                                    title="Dispatch maintenance task for this defect"
                                    className="px-2 py-1 rounded bg-[#1D212B] hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] transition-colors"
                                  >
                                    Work Order
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 text-center space-y-3">
              <Camera className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No Visual Inspection Selected</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload a component photograph on the left or select a preloaded sample damage file to run computer vision defect analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Sector AI Training & Benchmarks Proof Modal */}
      <SectorsProofModal
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
      />
    </div>
  );
};
