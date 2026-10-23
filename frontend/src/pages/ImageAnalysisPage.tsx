import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, UploadCloud, CheckCircle2, AlertTriangle, Eye, 
  Layers, ShieldAlert, RefreshCw, ZoomIn, Info, Check, Sparkles,
  ChevronRight, Tag, Activity, FileText, Sliders, Wrench, Flame,
  Maximize2, Crosshair, ExternalLink, ShieldCheck, AlertCircle
} from 'lucide-react';
import { Machine, ImageInspection, ImageDefect, VisionSample } from '../types';
import { api } from '../services/api';

interface ImageAnalysisPageProps {
  machines: Machine[];
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
}

export const ImageAnalysisPage: React.FC<ImageAnalysisPageProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
}) => {
  const [samples, setSamples] = useState<VisionSample[]>([]);
  const [inspections, setInspections] = useState<ImageInspection[]>([]);
  const [activeInspection, setActiveInspection] = useState<ImageInspection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [componentName, setComponentName] = useState<string>('Drive-End Bearing Race');
  const [viewMode, setViewMode] = useState<'annotated' | 'raw' | 'sideBySide'>('annotated');
  const [defectFilter, setDefectFilter] = useState<'all' | 'confirmed' | 'uncertain'>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(60);
  const [selectedDefectIdx, setSelectedDefectIdx] = useState<number | null>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number }>({ width: 640, height: 480 });

  const roiCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Handle Defect ROI canvas crop preview
  useEffect(() => {
    if (!activeInspection || selectedDefectIdx === null) return;
    const defects = activeInspection.defects || [];
    const defect = defects[selectedDefectIdx];
    if (!defect || !defect.bbox || defect.bbox.length < 4) return;

    const canvas = roiCanvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    // Use raw image for crisp unaltered crop inspection
    img.src = activeInspection.raw_image_url;

    img.onload = () => {
      const [x1, y1, x2, y2] = defect.bbox;
      const bw = Math.max(12, x2 - x1);
      const bh = Math.max(12, y2 - y1);
      
      // Add context margin (25% on each side)
      const marginX = bw * 0.25;
      const marginY = bh * 0.25;
      const cropX = Math.max(0, x1 - marginX);
      const cropY = Math.max(0, y1 - marginY);
      const cropW = Math.min(img.naturalWidth - cropX, bw + marginX * 2);
      const cropH = Math.min(img.naturalHeight - cropY, bh + marginY * 2);

      canvas.width = 280;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw zoomed crop
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

        // Draw crosshair reticle overlay
        ctx.strokeStyle = defect.confidence >= 0.8 ? '#10B981' : '#FF5E1E';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

        // Corner tick marks
        const tick = 12;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(16, 16 + tick);
        ctx.lineTo(16, 16);
        ctx.lineTo(16 + tick, 16);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(canvas.width - 16 - tick, 16);
        ctx.lineTo(canvas.width - 16, 16);
        ctx.lineTo(canvas.width - 16, 16 + tick);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(16, canvas.height - 16 - tick);
        ctx.lineTo(16, canvas.height - 16);
        ctx.lineTo(16 + tick, canvas.height - 16);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(canvas.width - 16 - tick, canvas.height - 16);
        ctx.lineTo(canvas.width - 16, canvas.height - 16);
        ctx.lineTo(canvas.width - 16, canvas.height - 16 - tick);
        ctx.stroke();
      }
    };
  }, [activeInspection, selectedDefectIdx]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMachine) return;
    setInspecting(true);
    setStatusMessage(`Uploading ${file.name} and executing OpenCV CV defect pipelines...`);
    setActionFeedback(null);
    try {
      const res = await api.uploadImageInspection(currentMachine.id, file, componentName, `User inspection upload: ${file.name}`);
      setActiveInspection(res);
      setSelectedDefectIdx(0);
      setStatusMessage(`Inspection complete: Found ${res.defect_count ?? res.defects?.length ?? 0} defects (${res.visual_severity} severity).`);
      const updated = await api.getImageInspections(currentMachine.id);
      setInspections(updated);
    } catch (err: any) {
      setStatusMessage(`Inspection failed: ${err.message}`);
    } finally {
      setInspecting(false);
    }
  };

  const handleSampleInspect = async (sample: VisionSample) => {
    if (!currentMachine) return;
    setInspecting(true);
    setStatusMessage(`Running computer vision models on ${sample.name}...`);
    setActionFeedback(null);
    try {
      const res = await api.inspectSampleImage(currentMachine.id, sample.filename, sample.component);
      setActiveInspection(res);
      setSelectedDefectIdx(0);
      setStatusMessage(`Defect detection complete: ${res.defect_count ?? res.defects?.length ?? 0} feature contours identified.`);
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

        {/* Machine Picker */}
        <div className="flex items-center space-x-3">
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
                </div>
              </div>

              {/* View Mode & Sensitivity Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#161920]/60 border border-white/5 text-xs">
                {/* View Mode Buttons */}
                <div className="flex items-center space-x-1 bg-[#1D212B] p-1 rounded-lg border border-slate-700/80">
                  <button
                    onClick={() => setViewMode('annotated')}
                    aria-label="View annotated computer vision image"
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      viewMode === 'annotated' ? 'bg-[#FF5E1E] text-[#0F1115] font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Annotated (CV)
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    aria-label="View raw observation image"
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      viewMode === 'raw' ? 'bg-[#FF5E1E] text-[#0F1115] font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Raw Image
                  </button>
                  <button
                    onClick={() => setViewMode('sideBySide')}
                    aria-label="View side-by-side comparison"
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      viewMode === 'sideBySide' ? 'bg-[#FF5E1E] text-[#0F1115] font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Side-by-Side
                  </button>
                </div>

                {/* Sensitivity Threshold Slider */}
                <div className="flex items-center space-x-3 bg-[#1D212B] px-3 py-1.5 rounded-lg border border-slate-700/80">
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <Sliders className="w-3.5 h-3.5 text-[#FF7A00]" />
                    <span className="text-[11px] font-medium">Confidence Filter:</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    aria-label="Defect confidence sensitivity threshold"
                    className="w-24 accent-[#FF5E1E] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-[#FF7A00] text-xs min-w-[36px]">
                    ≥ {confidenceThreshold}%
                  </span>
                </div>
              </div>

              {/* Inspection Image Display Box with Interactive SVG Reticles */}
              <div className="p-4 rounded-2xl bg-[#12141A]/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                {viewMode === 'sideBySide' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Raw Observation</span>
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center min-h-[260px]">
                        <img 
                          src={activeInspection.raw_image_url} 
                          alt="Raw Component" 
                          className="max-h-[360px] w-auto object-contain"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[#FF7A00] uppercase tracking-wider block">AI Bounding Box Segmentation</span>
                      <div className="rounded-xl overflow-hidden border border-[#FF5E1E]/40 bg-black flex items-center justify-center min-h-[260px]">
                        <img 
                          src={activeInspection.annotated_image_url} 
                          alt="CV Annotated Defect" 
                          className="max-h-[360px] w-auto object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center justify-center min-h-[320px] max-h-[460px] overflow-hidden rounded-xl bg-black border border-slate-800/80">
                    <div className="relative inline-block">
                      <img 
                        src={viewMode === 'annotated' ? activeInspection.annotated_image_url : activeInspection.raw_image_url} 
                        alt="Inspection View" 
                        onLoad={(e) => {
                          setImgNaturalSize({
                            width: e.currentTarget.naturalWidth || 640,
                            height: e.currentTarget.naturalHeight || 480
                          });
                        }}
                        className="max-h-[440px] w-auto object-contain block select-none pointer-events-none"
                      />

                      {/* Interactive SVG Overlay for click & hover defect highlighting */}
                      <svg
                        viewBox={`0 0 ${imgNaturalSize.width} ${imgNaturalSize.height}`}
                        className="absolute inset-0 w-full h-full pointer-events-auto"
                      >
                        {filteredDefects.map((d, idx) => {
                          const [x1, y1, x2, y2] = d.bbox;
                          const bw = Math.max(8, x2 - x1);
                          const bh = Math.max(8, y2 - y1);
                          const isSelected = selectedDefect === d;

                          return (
                            <g 
                              key={idx} 
                              className="cursor-pointer group"
                              onClick={() => {
                                const originalIdx = allDefects.indexOf(d);
                                setSelectedDefectIdx(originalIdx >= 0 ? originalIdx : idx);
                              }}
                            >
                              {/* Background highlight */}
                              <rect
                                x={x1}
                                y={y1}
                                width={bw}
                                height={bh}
                                fill={isSelected ? 'rgba(255, 94, 30, 0.22)' : 'rgba(0, 0, 0, 0.05)'}
                                stroke={isSelected ? '#FF5E1E' : (d.is_confirmed ? '#10B981' : '#F59E0B')}
                                strokeWidth={isSelected ? 3.5 : 2}
                                strokeDasharray={isSelected ? '6 3' : 'none'}
                                rx={4}
                                className="transition-all duration-150"
                              />

                              {/* Corner reticles for selected defect */}
                              {isSelected && (
                                <g stroke="#FFFFFF" strokeWidth={2.5} fill="none">
                                  <path d={`M ${x1} ${y1 + 8} L ${x1} ${y1} L ${x1 + 8} ${y1}`} />
                                  <path d={`M ${x2 - 8} ${y1} L ${x2} ${y1} L ${x2} ${y1 + 8}`} />
                                  <path d={`M ${x1} ${y2 - 8} L ${x1} ${y2} L ${x1 + 8} ${y2}`} />
                                  <path d={`M ${x2 - 8} ${y2} L ${x2} ${y2} L ${x2} ${y2 - 8}`} />
                                </g>
                              )}

                              {/* Interactive defect label tag on canvas */}
                              <rect
                                x={x1}
                                y={Math.max(2, y1 - 22)}
                                width={Math.min(220, Math.max(120, bw))}
                                height={20}
                                fill="#0F1115"
                                fillOpacity={0.9}
                                stroke={isSelected ? '#FF5E1E' : '#334155'}
                                strokeWidth={1}
                                rx={3}
                              />
                              <text
                                x={x1 + 6}
                                y={Math.max(16, y1 - 8)}
                                fill={isSelected ? '#FF8A3D' : '#F1F5F9'}
                                fontSize={10}
                                fontWeight={isSelected ? 'bold' : 'normal'}
                                fontFamily="sans-serif"
                              >
                                {d.label?.slice(0, 24)} ({(d.confidence * 100).toFixed(0)}%)
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Defect Focus Panel (ROI Magnifier + Engineering Recommendations) */}
              {selectedDefect && (
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
                        {selectedDefect.is_confirmed ? 'CONFIRMED OBSERVATION' : 'UNCERTAIN CANDIDATE'}
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
                          <span className="text-[10px] text-slate-400 block">Surface Coverage</span>
                          <span className="font-mono font-bold text-white">
                            {(selectedDefect.area_pct ?? 0).toFixed(2)}% of asset face
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

                      <div className="pt-1 flex items-center space-x-2">
                        <button
                          onClick={() => handleCreateWorkOrder(selectedDefect)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg bg-[#FF5E1E]/20 hover:bg-[#FF5E1E]/30 border border-[#FF5E1E]/50 text-[#FF8A3D] text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Dispatch Ticket for this Defect</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Classification Distinction Pill: Confirmed vs Uncertain */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400" />
                    <span className="text-xs text-slate-300 font-medium">
                      Confirmed Observations (≥ 80%): <span className="font-mono font-bold text-emerald-400">{confirmedCount}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF7A00] border border-[#FF5E1E]" />
                    <span className="text-xs text-slate-300 font-medium">
                      Uncertain Predictions (&lt; 80%): <span className="font-mono font-bold text-[#FF8A3D]">{uncertainCount}</span>
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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-[#FF5E1E]" />
                    <span>Segmented Defects & Quantitative CV Metrics</span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    Showing <span className="text-white font-mono font-bold">{filteredDefects.length}</span> of {allDefects.length} defects
                  </span>
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
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Bounding Box [X1, Y1, X2, Y2]</th>
                          <th className="py-2.5 px-3">Surface Area</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {filteredDefects.map((d, idx) => {
                          const isSelected = selectedDefect === d;
                          const originalIdx = allDefects.indexOf(d);

                          return (
                            <tr 
                              key={idx} 
                              onClick={() => setSelectedDefectIdx(originalIdx >= 0 ? originalIdx : idx)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#FF5E1E]/15 border-l-2 border-[#FF5E1E]' : 'hover:bg-[#1E232F]/50'
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-[#1D212B] text-slate-300 border border-slate-700 uppercase">
                                  {d.defect_type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center space-x-1.5">
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E] animate-pulse" />}
                                <span>{d.label}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`font-bold ${(d.confidence ?? 0) >= 0.8 ? 'text-emerald-400' : 'text-[#FF8A3D]'}`}>
                                  {((d.confidence ?? 0) * 100).toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                {d.is_confirmed ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                    <span>CONFIRMED</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                    <span>UNCERTAIN</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                [{d.bbox?.join(', ')}]
                              </td>
                              <td className="py-2.5 px-3 text-[#FF7A00] font-mono">
                                {(d.area_pct ?? 0).toFixed(2)}%
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateWorkOrder(d);
                                  }}
                                  title="Dispatch maintenance task for this defect"
                                  className="px-2 py-1 rounded bg-[#1D212B] hover:bg-[#FF5E1E]/20 hover:text-[#FF8A3D] text-slate-300 border border-slate-700 text-[10px] transition-colors"
                                >
                                  Work Order
                                </button>
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
    </div>
  );
};
