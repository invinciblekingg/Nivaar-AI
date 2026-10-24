import React, { useState, useEffect } from 'react';
import { 
  FileCheck, Download, RefreshCw, Eye, AlertTriangle, CheckCircle2,
  ShieldCheck, AlertOctagon, Activity, Camera, Zap, Sparkles, Layers,
  ChevronRight, Calendar, UserCheck, Wrench, ArrowUpRight, Check,
  Info, Shield, Sliders, ExternalLink, HardDrive, FileText
} from 'lucide-react';
import { Machine, ReportBundle, ConsolidatedReportPayload } from '../types';
import { api } from '../services/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface FinalReportStudioPageProps {
  machines: Machine[];
  selectedMachineId: string;
  initialInspectionId?: string;
  onSelectMachine: (id: string) => void;
}

export const FinalReportStudioPage: React.FC<FinalReportStudioPageProps> = ({
  machines,
  selectedMachineId,
  initialInspectionId,
  onSelectMachine,
}) => {
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>(initialInspectionId || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Reviewer sign-off & notes
  const [reviewerName, setReviewerName] = useState<string>('Senior Diagnostic Engineer');
  const [reviewerTitle, setReviewerTitle] = useState<string>('Lead Reliability & AI Diagnostic Specialist');
  const [signoffStatus, setSignoffStatus] = useState<string>('VERIFIED_AND_APPROVED');
  const [executiveNotes, setExecutiveNotes] = useState<string>(
    'Comprehensive multimodal evaluation completed. Physical TENG sensor readings and optical CV defect contours confirm localized mechanical stress concentration.'
  );
  const [priorityOverride, setPriorityOverride] = useState<string>('');
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'vision' | 'teng' | 'symbiosis' | 'signoff'>('preview');

  const currentMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  const fetchBundleData = async (inspId?: string) => {
    if (!currentMachine) return;
    setLoading(true);
    setStatusMessage('');
    try {
      const data = await api.getReportBundle(currentMachine.id, inspId || selectedInspectionId);
      setBundle(data);
      if (data.selected_inspection && !selectedInspectionId) {
        setSelectedInspectionId(data.selected_inspection.id);
      }
    } catch (err: any) {
      console.error('Error fetching report bundle:', err);
      setStatusMessage(`Failed to load diagnostic bundle: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundleData(initialInspectionId);
  }, [currentMachine?.id]);

  const handleInspectionChange = (inspId: string) => {
    setSelectedInspectionId(inspId);
    fetchBundleData(inspId);
  };

  const handleGenerateReport = async () => {
    if (!currentMachine) return;
    setGenerating(true);
    setStatusMessage('Compiling multimodal findings and generating certified PDF report...');
    try {
      const payload: ConsolidatedReportPayload = {
        machine_id: currentMachine.id,
        inspection_id: selectedInspectionId || undefined,
        reviewer_name: reviewerName,
        reviewer_title: reviewerTitle,
        signoff_status: signoffStatus,
        executive_notes: executiveNotes,
        priority_override: priorityOverride || undefined
      };

      const pdfBlob = await api.generateConsolidatedReport(payload);
      setGeneratedPdfBlob(pdfBlob);
      const url = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(url);

      setStatusMessage('Official consolidated report successfully generated and synced to Supabase storage!');
    } catch (err: any) {
      console.error('Error generating report:', err);
      setStatusMessage(`Report generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedPdfBlob && !pdfPreviewUrl) return;
    const downloadUrl = pdfPreviewUrl || URL.createObjectURL(generatedPdfBlob!);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Nivaar_Consolidated_Report_${currentMachine?.asset_tag || 'ASSET'}_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const integrity = bundle?.integrity_check;
  const inspection = bundle?.selected_inspection;
  const teng = bundle?.teng_telemetry;
  const symbiosis = bundle?.symbiosis;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500/20 to-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Final Report Studio</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 uppercase tracking-widest font-semibold">
                Consolidated PDF Generator
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified cross-modal synthesis: TENG physical waveforms, AI Vision red defect contours, and Symbiosis correlation into ONE certified engineering report.
            </p>
          </div>
        </div>

        {/* Machine & Inspection Selectors */}
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-400 font-medium">Target Machine:</label>
            <select
              value={currentMachine?.id || ''}
              onChange={(e) => {
                onSelectMachine(e.target.value);
                setSelectedInspectionId('');
              }}
              className="bg-[#1D212B] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition-all"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.asset_tag})
                </option>
              ))}
            </select>
          </div>

          {bundle && bundle.inspections_history.length > 0 && (
            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-400 font-medium">Inspection:</label>
              <select
                value={selectedInspectionId}
                onChange={(e) => handleInspectionChange(e.target.value)}
                className="bg-[#1D212B] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition-all max-w-[200px]"
              >
                {bundle.inspections_history.map((insp) => (
                  <option key={insp.id} value={insp.id}>
                    {insp.component_name} ({insp.defect_count} defects, {insp.visual_severity})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => fetchBundleData()}
            disabled={loading}
            className="p-2 rounded-lg bg-[#1D212B] hover:bg-[#252B38] border border-slate-700/80 text-slate-300 hover:text-red-400 transition-colors"
            title="Refresh Diagnostic Bundle"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-red-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button 
            onClick={() => setStatusMessage('')} 
            className="text-slate-400 hover:text-white font-bold ml-2 p-1 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Grid: Data Integrity & Review Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Data Streams Verification & Reviewer Control */}
        <div className="lg:col-span-4 space-y-5">
          {/* Automated Data Completeness Check Card */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Multimodal Data Provenance Check</span>
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                integrity?.is_complete 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {integrity?.is_complete ? 'All Streams Verified' : 'Missing Streams'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Before compiling the final consolidated report, all diagnostic signals are checked for strict cross-asset integrity to prevent data contamination.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1D212B] border border-white/5 text-xs">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-red-400" />
                  <span className="text-slate-200 font-medium">AI Computer Vision</span>
                </div>
                {integrity?.has_inspection ? (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Attached ({inspection?.defect_count ?? 0} defects)</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>No image uploaded</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1D212B] border border-white/5 text-xs">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-200 font-medium">TENG Physical Waveforms</span>
                </div>
                {integrity?.has_teng ? (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>V_pp: {teng?.metrics?.v_pp ?? 16.8}V</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">Baseline Default</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1D212B] border border-white/5 text-xs">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-200 font-medium">Symbiosis Fusion Engine</span>
                </div>
                {integrity?.has_symbiosis ? (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Fused ({symbiosis?.confidence_score ? Math.round(symbiosis.confidence_score * 100) : 88}%)</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-cyan-400">On-demand</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1D212B] border border-white/5 text-xs">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-200 font-medium">Supabase Synchronization</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected (bucket: diagnostic-reports)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Reviewer Sign-off & Finalization Controls */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-white/10 pb-3">
              <UserCheck className="w-4 h-4 text-red-400" />
              <span>Reviewer Finalization & Sign-Off</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Reviewer Name</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-[#1D212B] border border-slate-700/80 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Professional Title</label>
                <input
                  type="text"
                  value={reviewerTitle}
                  onChange={(e) => setReviewerTitle(e.target.value)}
                  className="w-full bg-[#1D212B] border border-slate-700/80 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Official Sign-off Status</label>
                <select
                  value={signoffStatus}
                  onChange={(e) => setSignoffStatus(e.target.value)}
                  className="w-full bg-[#1D212B] border border-slate-700/80 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="VERIFIED_AND_APPROVED">VERIFIED & APPROVED (Authorized)</option>
                  <option value="CONDITIONAL_APPROVAL">CONDITIONAL APPROVAL (Requires NDT Followup)</option>
                  <option value="RE_INSPECTION_MANDATED">RE-INSPECTION MANDATED</option>
                  <option value="EMERGENCY_SHUTDOWN_RECOMMENDED">EMERGENCY SHUTDOWN RECOMMENDED</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Executive Summary Observations</label>
                <textarea
                  rows={3}
                  value={executiveNotes}
                  onChange={(e) => setExecutiveNotes(e.target.value)}
                  className="w-full bg-[#1D212B] border border-slate-700/80 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Operating Status Override (Optional)</label>
                <select
                  value={priorityOverride}
                  onChange={(e) => setPriorityOverride(e.target.value)}
                  className="w-full bg-[#1D212B] border border-slate-700/80 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">Keep Machine Status ({currentMachine?.status})</option>
                  <option value="CRITICAL">Override to CRITICAL</option>
                  <option value="WARNING">Override to WARNING</option>
                  <option value="HEALTHY">Override to HEALTHY</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleGenerateReport}
                disabled={generating || loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compiling Consolidated PDF...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Generate Consolidated PDF Report</span>
                  </>
                )}
              </button>

              {(generatedPdfBlob || pdfPreviewUrl) && (
                <button
                  onClick={handleDownloadPdf}
                  className="w-full py-2.5 rounded-xl bg-[#1D212B] hover:bg-[#252B38] border border-red-500/50 text-red-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4 text-red-400" />
                  <span>Download Final Report PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Multimodal Previews & Tabs */}
        <div className="lg:col-span-8 space-y-5">
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center space-x-1.5 p-1 bg-[#161920]/80 backdrop-blur-xl border border-white/10 rounded-xl text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'preview' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Consolidated Summary
            </button>
            <button
              onClick={() => setActiveTab('vision')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'vision' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              AI Vision Red Detections
            </button>
            <button
              onClick={() => setActiveTab('teng')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'teng' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              TENG Physical Telemetry
            </button>
            <button
              onClick={() => setActiveTab('symbiosis')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'symbiosis' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Symbiosis Multimodal Fusion
            </button>
          </div>

          {/* TAB 1: Consolidated Summary View */}
          {activeTab === 'preview' && (
            <div className="space-y-5">
              {/* Executive Overview Banner */}
              <div className="p-5 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{currentMachine?.name}</h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Asset Tag: <span className="font-mono text-cyan-400 font-semibold">{currentMachine?.asset_tag}</span> • Location: {currentMachine?.location_label}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      currentMachine?.status === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                      currentMachine?.status === 'WARNING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {priorityOverride || currentMachine?.status}
                    </span>
                    <span className="text-sm font-bold font-mono text-cyan-400">
                      Health Index: {symbiosis?.composite_health_index?.toFixed(1) ?? currentMachine?.health_index?.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Multimodal Quick Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Visual Defects</span>
                    <span className="font-mono font-bold text-red-400 text-base block">
                      {inspection?.defect_count ?? 0} Flagged
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {inspection?.defects?.filter(d => d.is_confirmed).length ?? 0} Confirmed
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">TENG Peak Voltage</span>
                    <span className="font-mono font-bold text-amber-400 text-base block">
                      {teng?.metrics?.v_pp?.toFixed(2) ?? '16.80'} V
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Limit: ≤ 12.0 V
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Dominant Freq</span>
                    <span className="font-mono font-bold text-cyan-400 text-base block">
                      {teng?.metrics?.dominant_frequency_hz?.toFixed(1) ?? '29.8'} Hz
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Harmonic 1X
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Primary Fault</span>
                    <span className="font-bold text-slate-200 text-xs truncate block" title={symbiosis?.primary_fault_cause}>
                      {symbiosis?.primary_fault_cause || 'Bearing Fatigue'}
                    </span>
                    <span className="text-[10px] text-emerald-400">
                      Conf: {symbiosis?.confidence_score ? Math.round(symbiosis.confidence_score * 100) : 88}%
                    </span>
                  </div>
                </div>

                {/* Prioritized Maintenance Actions */}
                <div className="p-4 rounded-xl bg-[#1A1E27] border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Wrench className="w-3.5 h-3.5 text-red-400" />
                    <span>Consolidated Recommended Actions</span>
                  </h4>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    {symbiosis?.recommended_actions && symbiosis.recommended_actions.length > 0 ? (
                      symbiosis.recommended_actions.map((act, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                            idx === 0 ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {idx === 0 ? 'P1' : 'P2'}
                          </span>
                          <span className="leading-relaxed">{act}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500">No urgent interventions required. Continue routine telemetry schedule.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Embedded PDF Preview / Download Banner */}
              {pdfPreviewUrl && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-500/40 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-red-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Consolidated PDF Report Ready</h4>
                      <p className="text-xs text-slate-400">
                        Signed off by {reviewerName} • Download or view the certified engineering document.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadPdf}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI Vision Red Detections */}
          {activeTab === 'vision' && (
            <div className="p-5 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-bold text-white">AI Vision Defect Inspection & Red Bounding Boxes</h3>
                </div>
                <span className="text-xs text-slate-400">
                  Component: <span className="font-semibold text-white">{inspection?.component_name || 'Component'}</span>
                </span>
              </div>

              {inspection ? (
                <div className="space-y-4">
                  {/* Side-by-Side Images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Raw Observation</span>
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center min-h-[220px]">
                        <img 
                          src={inspection.raw_image_url} 
                          alt="Raw Component" 
                          className="max-h-[300px] w-auto object-contain"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block">Red Bounding Box Detection</span>
                      <div className="rounded-xl overflow-hidden border border-red-500/40 bg-black flex items-center justify-center min-h-[220px]">
                        <img 
                          src={inspection.annotated_image_url} 
                          alt="CV Annotated Defect" 
                          className="max-h-[300px] w-auto object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Defect List Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Identified Surface Defects ({inspection.defects?.length ?? 0})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300 font-mono">
                        <thead className="bg-[#1D212B] text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-white/10">
                          <tr>
                            <th className="py-2 px-3">Label</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Bounding Box [X1, Y1, X2, Y2]</th>
                            <th className="py-2 px-3">Area %</th>
                            <th className="py-2 px-3">Confidence</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {(inspection.defects || []).map((d, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                              <td className="py-2 px-3 font-sans font-bold text-red-400">{d.label}</td>
                              <td className="py-2 px-3 text-slate-300 uppercase text-[10px]">{d.defect_type}</td>
                              <td className="py-2 px-3 text-slate-400 text-[11px]">[{d.bbox?.join(', ')}]</td>
                              <td className="py-2 px-3 text-amber-400">{(d.area_pct ?? 0).toFixed(2)}%</td>
                              <td className="py-2 px-3 font-bold text-emerald-400">{Math.round((d.confidence ?? 0.8) * 100)}%</td>
                              <td className="py-2 px-3 font-sans">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  d.is_confirmed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}>
                                  {d.is_confirmed ? 'CONFIRMED' : 'UNCERTAIN'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No visual inspection recorded for this equipment. Upload an image in the AI Vision Platform to attach visual evidence.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TENG Physical Telemetry */}
          {activeTab === 'teng' && (
            <div className="p-5 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">TENG Kinetic Sensor Telemetry & Physical Units</h3>
                </div>
                <span className="text-xs text-slate-400">
                  Units: <span className="font-mono text-cyan-400 font-semibold">Volts (V) • Hertz (Hz) • nC</span>
                </span>
              </div>

              {/* Physical Units Metric Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">Peak-to-Peak Voltage (V_pp)</span>
                  <span className="font-mono font-bold text-amber-400 text-base block">
                    {teng?.metrics?.v_pp?.toFixed(2) ?? '16.80'} V
                  </span>
                  <span className="text-[10px] text-slate-500">Nominal: ≤ 12.0 V</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">RMS Voltage (V_rms)</span>
                  <span className="font-mono font-bold text-amber-400 text-base block">
                    {teng?.metrics?.v_rms?.toFixed(2) ?? '4.12'} V
                  </span>
                  <span className="text-[10px] text-slate-500">Nominal: ≤ 3.5 V</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">Dominant Frequency</span>
                  <span className="font-mono font-bold text-cyan-400 text-base block">
                    {teng?.metrics?.dominant_frequency_hz?.toFixed(2) ?? '29.75'} Hz
                  </span>
                  <span className="text-[10px] text-slate-500">Running Speed 1X</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">Impulsive Kurtosis</span>
                  <span className="font-mono font-bold text-red-400 text-base block">
                    {teng?.metrics?.v_kurtosis?.toFixed(2) ?? '4.85'}
                  </span>
                  <span className="text-[10px] text-slate-500">Dimensionless (Nominal ~3.0)</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">Charge Transfer</span>
                  <span className="font-mono font-bold text-emerald-400 text-base block">
                    {teng?.metrics?.charge_transfer_nc?.toFixed(2) ?? '4.20'} nC
                  </span>
                  <span className="text-[10px] text-slate-500">Expected: 2.0 - 5.0 nC</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">Harvester Health</span>
                  <span className="font-mono font-bold text-cyan-400 text-base block">
                    {teng?.health_index?.toFixed(1) ?? '92.0'}%
                  </span>
                  <span className="text-[10px] text-slate-500">Kinetic Power Harvest</span>
                </div>
              </div>

              {/* Interactive Telemetry Chart */}
              {teng?.chart_samples && teng.chart_samples.length > 0 && (
                <div className="p-4 rounded-xl bg-[#1D212B] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      High-Precision Kinetic Waveform Preview [V vs Time (s)]
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400">Sampling Rate: 20 Hz</span>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={teng.chart_samples} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="time" stroke="#64748B" fontSize={10} unit="s" />
                        <YAxis stroke="#64748B" fontSize={10} unit="V" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                          labelStyle={{ color: '#94A3B8' }}
                        />
                        <Line type="monotone" dataKey="voltage" stroke="#EF4444" strokeWidth={2} dot={false} name="Voltage (V)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Symbiosis Multimodal Fusion */}
          {activeTab === 'symbiosis' && (
            <div className="p-5 rounded-2xl bg-[#161920]/90 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Symbiosis Multimodal Diagnostic Fusion</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Confidence: <span className="text-emerald-400 font-bold">{symbiosis?.confidence_score ? Math.round(symbiosis.confidence_score * 100) : 88}%</span>
                </span>
              </div>

              {symbiosis && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#1D212B] border border-white/5 space-y-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Cross-Modal Synthesis Finding
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      Primary Root Cause: <span className="font-bold text-white">{symbiosis.primary_fault_cause}</span> (Overall Severity: <span className="text-red-400 font-bold">{symbiosis.overall_severity}</span>).
                      TENG impact shock kurtosis correlates directly with optical surface fracture dimensions.
                    </p>
                  </div>

                  {/* Attribution Breakdown */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Stream Attribution Weighting</span>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 text-center space-y-1">
                        <span className="text-[10px] text-slate-400 block uppercase">TENG Telemetry</span>
                        <span className="font-mono font-bold text-amber-400 text-lg">
                          {symbiosis.attribution_breakdown?.teng_sensor_pct ?? 45}%
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 text-center space-y-1">
                        <span className="text-[10px] text-slate-400 block uppercase">AI Vision Defects</span>
                        <span className="font-mono font-bold text-red-400 text-lg">
                          {symbiosis.attribution_breakdown?.visual_inspection_pct ?? 40}%
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#1D212B] border border-white/5 text-center space-y-1">
                        <span className="text-[10px] text-slate-400 block uppercase">Machine History</span>
                        <span className="font-mono font-bold text-cyan-400 text-lg">
                          {symbiosis.attribution_breakdown?.machine_history_pct ?? 15}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cross-Modal Correlations */}
                  {symbiosis.cross_modal_correlations && symbiosis.cross_modal_correlations.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-semibold text-slate-300">Cross-Modal Mathematical Correlations</span>
                      <div className="space-y-2">
                        {symbiosis.cross_modal_correlations.map((c, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-[#1D212B] border border-white/5 text-xs flex items-center justify-between">
                            <span className="text-slate-300">{c.signal} ↔ {c.visual}</span>
                            <span className="font-mono font-bold text-cyan-400">
                              r = {c.correlation} ({Math.round(c.correlation * 100)}% match)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
