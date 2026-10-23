import React, { useState, useEffect } from 'react';
import { 
  Brain, UploadCloud, FileText, CheckCircle2, AlertTriangle, 
  RefreshCw, Cpu, Layers, Download, ExternalLink, ShieldCheck, ChevronRight
} from 'lucide-react';
import { Machine, SampleDataset, AnalysisResult } from '../types';
import { api } from '../services/api';

interface DiagnosticsPageProps {
  machines: Machine[];
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
}

export const DiagnosticsPage: React.FC<DiagnosticsPageProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
}) => {
  const [sampleDatasets, setSampleDatasets] = useState<SampleDataset[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'public'>('upload');

  const currentMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  const loadInitialData = async () => {
    try {
      const datasets = await api.getSampleDatasets();
      setSampleDatasets(datasets);

      if (currentMachine) {
        const res = await api.getAnalysisResults(currentMachine.id);
        if (res.has_results) {
          setResults(res);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [currentMachine?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsUploading(true);
    setStatusMessage('Validating and ingesting CSV dataset...');

    try {
      const uploadRes = await api.uploadCSV(currentMachine.id, file);
      setStatusMessage(`Dataset ${uploadRes.filename} validated successfully (${uploadRes.row_count} rows). Enqueueing to distributed AI workers...`);
      
      // Submit Job
      setIsAnalyzing(true);
      const job = await api.submitAnalysisJob(currentMachine.id, uploadRes.id);
      
      // Poll job status until complete
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const jobStatus = await api.getJobStatus(job.id);
        if (jobStatus.status === 'COMPLETED' || attempts > 15) {
          clearInterval(pollInterval);
          setIsAnalyzing(false);
          setIsUploading(false);
          setStatusMessage('Distributed Isolation Forest analysis completed!');
          
          // Fetch updated results
          const newRes = await api.getAnalysisResults(currentMachine.id);
          setResults(newRes);
        }
      }, 1000);

    } catch (err: any) {
      setIsUploading(false);
      setIsAnalyzing(false);
      setStatusMessage(`Error: ${err.message || 'Upload failed'}`);
    }
  };

  const handleRunSampleAnalysis = async (dataset: SampleDataset) => {
    setIsAnalyzing(true);
    setStatusMessage(`Dispatching ${dataset.name} to distributed worker queue...`);
    try {
      const job = await api.submitAnalysisJob(currentMachine.id);
      
      setTimeout(async () => {
        setIsAnalyzing(false);
        setStatusMessage(`Analysis complete for ${currentMachine.name}. Isolation Forest & ISO envelope computed.`);
        const newRes = await api.getAnalysisResults(currentMachine.id);
        setResults(newRes);
      }, 1500);
    } catch (err: any) {
      setIsAnalyzing(false);
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
            <Brain className="w-5 h-5 text-[#FF7A00]" />
            <span>AI Diagnostics & Multivariate Telemetry Ingestion</span>
          </h1>
          <p className="text-xs text-slate-400">
            Unsupervised Isolation Forest anomaly detection, statistical baseline normalization, and explainable fault hypotheses
          </p>
        </div>

        {/* Machine Target Selector */}
        <div className="flex items-center space-x-2 bg-[#1C2028] border border-white/10 p-1.5 rounded-lg text-xs">
          <label htmlFor="diagnostics-target-asset" className="text-slate-400 pl-2">Target Asset:</label>
          <select
            id="diagnostics-target-asset"
            aria-label="Select target asset for diagnostics"
            value={currentMachine?.id}
            onChange={(e) => onSelectMachine(e.target.value)}
            className="bg-[#161920] border border-white/10 rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-[#FF5E1E]"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs: Upload / Benchmark Library / Public Datasets */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('upload')}
          aria-label="Select CSV Telemetry Ingestion tab"
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'upload' ? 'bg-[#FF5E1E] text-[#0F1115] font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          CSV Telemetry Ingestion
        </button>
        <button
          onClick={() => setActiveTab('samples')}
          aria-label="Select Benchmark Dataset Library tab"
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'samples' ? 'bg-[#FF5E1E] text-[#0F1115] font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Benchmark Dataset Library (5 Profiles)
        </button>
        <button
          onClick={() => setActiveTab('public')}
          aria-label="Select Public Dataset Compatibility tab"
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'public' ? 'bg-[#FF5E1E] text-[#0F1115] font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Public Dataset Compatibility (NASA / AI4I)
        </button>
      </div>

      {/* TAB 1: CSV Upload Zone */}
      {activeTab === 'upload' && (
        <div className="glass-card p-6 space-y-4">
          <div className="border-2 border-dashed border-[#FF5E1E]/30 hover:border-[#FF5E1E] rounded-2xl p-8 text-center bg-[#161920]/80 transition-all">
            <input
              type="file"
              id="csv-upload"
              accept=".csv"
              onChange={handleFileUpload}
              className="sr-only"
              aria-label="Upload Machine Sensor CSV File"
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FF5E1E]/15 border border-[#FF5E1E]/40 flex items-center justify-center text-[#FF7A00]">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">
                  Click to Browse or Drag Machine Sensor CSV File Here
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Supports timestamp, vibration (RMS/peak), temperature, current, pressure, acoustic channels (Max 25MB)
                </span>
              </div>
              <span className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-[#0F1115] text-xs font-bold shadow-md hover:brightness-110 transition-all">
                Select Telemetry File
              </span>
            </label>
          </div>

          {statusMessage && (
            <div className="p-3.5 rounded-xl bg-[#1C2028] border border-white/10 flex items-center space-x-3 text-xs text-slate-300">
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#FF7A00]" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Preloaded Benchmark Library */}
      {activeTab === 'samples' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleDatasets.map((ds) => (
            <div key={ds.id} className="glass-card p-5 space-y-3 flex flex-col justify-between hover:border-[#FF5E1E]/40 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#FF7A00] uppercase font-bold">{ds.category}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#251A14] text-[#FF9E66] border border-[#FF5E1E]/30">
                    BENCHMARK
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white leading-snug">{ds.name}</h3>
                <p className="text-[11px] text-slate-400">{ds.description}</p>
                <span className="text-[10px] font-mono text-slate-500 block">File: {ds.filename}</span>
              </div>

              <button
                onClick={() => handleRunSampleAnalysis(ds)}
                disabled={isAnalyzing}
                className="w-full py-2 rounded-lg bg-[#1C2028] text-[#FF9E66] border border-[#FF5E1E]/40 text-xs font-semibold hover:bg-[#252B36] hover:border-[#FF5E1E] transition-all flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <span>Dispatch to AI Workers</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#FF7A00]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Public Research Dataset Compatibility */}
      {activeTab === 'public' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 space-y-3">
            <span className="text-[10px] font-mono text-[#FF7A00] uppercase font-bold">UCI Repository</span>
            <h3 className="text-xs font-bold text-white">AI4I 2020 Predictive Maintenance</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              10,000 synthetic industrial records with air/process temperatures, rotational speed, torque, tool wear, and failure mode labels.
            </p>
            <div className="text-[10px] text-slate-500 font-mono">License: CC BY 4.0</div>
            <a
              href="https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#FF7A00] hover:text-[#FF9E66] hover:underline flex items-center space-x-1"
            >
              <span>Download from UCI</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="glass-card p-5 space-y-3">
            <span className="text-[10px] font-mono text-[#FF7A00] uppercase font-bold">NASA PCoE</span>
            <h3 className="text-xs font-bold text-white">NASA IMS Bearing Run-to-Failure</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Multi-week bearing vibration acceleration test bench on high-speed loaded shaft documenting outer race fluting and cage fracture.
            </p>
            <div className="text-[10px] text-slate-500 font-mono">License: NASA Open Data</div>
            <a
              href="https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#FF7A00] hover:text-[#FF9E66] hover:underline flex items-center space-x-1"
            >
              <span>NASA Data Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="glass-card p-5 space-y-3">
            <span className="text-[10px] font-mono text-[#FF7A00] uppercase font-bold">NASA Ames</span>
            <h3 className="text-xs font-bold text-white">NASA C-MAPSS Turbofan Engine</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Multi-sensor degradation trajectories for heavy aircraft turbofans measuring turbine gas temperature, spool fan speed, and pressure ratios.
            </p>
            <div className="text-[10px] text-slate-500 font-mono">License: Public Domain</div>
            <a
              href="https://data.nasa.gov/Aerospace/CMAPSS-Jet-Engine-Simulated-Data/ff5v-kuh6"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#FF7A00] hover:text-[#FF9E66] hover:underline flex items-center space-x-1"
            >
              <span>NASA Open Data</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* AI Analysis Findings & Explainability Results */}
      {results && results.has_results && (
        <div className="glass-card p-6 space-y-6">
          <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ISOLATION FOREST OUTPUT
                </span>
                <span className="text-xs text-slate-400">Timestamp: {new Date(results.created_at).toLocaleString()}</span>
              </div>
              <h2 className="text-base font-bold text-white mt-1">Diagnostic Evaluation & Hypotheses</h2>
            </div>
            <a
              href={api.getReportDownloadUrl(currentMachine.id)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#1C2028] text-[#FF9E66] border border-[#FF5E1E]/40 text-xs font-semibold hover:bg-[#252B36] hover:border-[#FF5E1E] transition-all self-start sm:self-auto shadow-md"
            >
              <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Export Audit PDF</span>
            </a>
          </div>

          {/* KPI Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-[#1C2028] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400">Evaluated Health Index</span>
              <span className={`text-xl font-bold font-mono block ${results.health_index_evaluated >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {results.health_index_evaluated.toFixed(1)}%
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1C2028] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400">Peak Anomaly Score</span>
              <span className="text-xl font-bold font-mono text-[#FF7A00] block">
                {results.max_anomaly_score.toFixed(3)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1C2028] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400">Flagged Anomaly Windows</span>
              <span className="text-xl font-bold font-mono text-white block">
                {results.anomaly_count}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1C2028] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400">Worker Architecture</span>
              <span className="text-xs font-bold text-emerald-400 block pt-1 font-mono">
                Distributed / Idempotent
              </span>
            </div>
          </div>

          {/* Diagnostic Summary */}
          <div className="p-4 rounded-xl bg-[#161920] border border-white/5 space-y-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Executive Diagnostic Summary</span>
            <p className="text-xs text-slate-300 leading-relaxed">{results.summary}</p>
          </div>

          {/* Component Fault Hypotheses */}
          {results.fault_hypotheses && results.fault_hypotheses.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-[#FF7A00]" />
                <span>Probabilistic Component Fault Hypotheses</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.fault_hypotheses.map((h: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#1C2028] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{h.component}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#251A14] text-[#FF7A00] border border-[#FF5E1E]/30">
                        {Math.round(h.confidence * 100)}% Confidence
                      </span>
                    </div>
                    <span className="text-xs text-[#FF9E66] font-semibold block">{h.fault}</span>
                    <p className="text-[11px] text-slate-400 leading-snug">{h.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Maintenance Recommendations */}
          {results.recommendations && results.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Recommended Physical Engineering Inspections</span>
              </h3>
              <div className="space-y-1.5">
                {results.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF7A00] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
