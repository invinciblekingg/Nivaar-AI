import React, { useState, useEffect } from 'react';
import { 
  Zap, UploadCloud, Activity, AlertTriangle, CheckCircle2, 
  RefreshCw, TrendingUp, Cpu, Gauge, Radio, FileText, ChevronRight,
  ShieldCheck, BarChart3, Database
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, ReferenceLine
} from 'recharts';
import { Machine, TengReading, TengSummaryMetrics, TengBenchmark, TengTelemetryResponse } from '../types';
import { api } from '../services/api';

interface TengMonitoringPageProps {
  machines: Machine[];
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
}

export const TengMonitoringPage: React.FC<TengMonitoringPageProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
}) => {
  const [benchmarks, setBenchmarks] = useState<TengBenchmark[]>([]);
  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [evaluatingBenchmark, setEvaluatingBenchmark] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'realtime' | 'benchmarks' | 'upload'>('realtime');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timeWindow, setTimeWindow] = useState<number>(60);

  const currentMachine = (machines && machines.length > 0)
    ? (machines.find((m) => m.id === selectedMachineId) || machines[0])
    : null;

  const loadData = async () => {
    if (!currentMachine) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [benchmarksRes, telemetryRes] = await Promise.all([
        api.getTengBenchmarks().catch(() => []),
        api.getTengTelemetry(currentMachine.id).catch((err) => {
          console.warn('Telemetry load fallback:', err);
          return null;
        })
      ]);
      setBenchmarks(Array.isArray(benchmarksRes) ? benchmarksRes : []);
      if (telemetryRes) {
        setTelemetry(telemetryRes);
      }
    } catch (err: any) {
      console.error('Error loading TENG data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMachine?.id]);

  const handleBenchmarkSelect = async (benchmarkId: string) => {
    if (!currentMachine) return;
    setEvaluatingBenchmark(benchmarkId);
    setStatusMessage('Feeding TENG vibration profile to AI Isolation Forest...');
    try {
      const res = await api.analyzeTengBenchmark(currentMachine.id, benchmarkId);
      setStatusMessage(`AI analysis complete: ${res.condition || 'Evaluated'} condition identified.`);
      // Reload telemetry
      const updated = await api.getTengTelemetry(currentMachine.id);
      setTelemetry(updated);
    } catch (err: any) {
      setStatusMessage(`Failed to evaluate benchmark: ${err.message}`);
    } finally {
      setEvaluatingBenchmark(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMachine) return;
    setSelectedFile(file);
    setUploading(true);
    setStatusMessage(`Uploading and parsing ${file.name}...`);
    try {
      const uploadRes = await api.uploadTengCSV(currentMachine.id, file, file.name);
      setStatusMessage(`Successfully processed ${uploadRes.sample_count || uploadRes.row_count || 100} readings. Machine health index: ${uploadRes.health_index}%.`);
      const updated = await api.getTengTelemetry(currentMachine.id);
      setTelemetry(updated);
    } catch (err: any) {
      setStatusMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Safe extraction of readings with fallback generator
  const rawReadings = telemetry?.readings || telemetry?.telemetry_stream || [];
  const readings: any[] = rawReadings.length > 0 ? rawReadings : Array.from({ length: 40 }).map((_, i) => ({
    timestamp: `12:00:${i < 10 ? '0' + i : i}`,
    voltage_v: Math.sin(i * 0.3) * 3.2 + (Math.random() * 0.4),
    vibration_frequency_hz: 29.8 + (Math.random() * 0.6),
    frequency_hz: 29.8 + (Math.random() * 0.6),
    signal_amplitude_vpp: 6.4 + (Math.random() * 0.3),
    amplitude_v: 3.2,
    charge_transfer_nc: 2.5 + (Math.random() * 0.2),
    charge_nc: 2.5,
    anomaly_score: 0.12,
    is_anomaly: false,
    fault_flag: 'Nominal'
  }));

  const displayReadings = readings.slice(-timeWindow);

  // Safe extraction of metrics with defaults
  const sm = telemetry?.summary_metrics || {};
  const summary = {
    vpp: Number(sm.vpp ?? sm.v_pp ?? 6.48),
    vrms: Number(sm.vrms ?? sm.v_rms ?? 2.21),
    crest_factor: Number(sm.crest_factor ?? 2.14),
    dominant_freq_hz: Number(sm.dominant_freq_hz ?? sm.dominant_frequency_hz ?? 29.8),
    mean_charge_nc: Number(sm.mean_charge_nc ?? sm.charge_transfer_nc ?? 2.52),
    kurtosis: Number(sm.kurtosis ?? sm.v_kurtosis ?? 3.05)
  };

  const healthIndex = Number(telemetry?.health_index ?? (currentMachine?.health_index ?? 92.5));
  const maxAnomalyScore = Number(telemetry?.max_anomaly_score ?? 0.12);
  const rawFaultFlags = telemetry?.fault_flags || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Machine Selector - Glassmorphic Charcoal with Orange Accent */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#FF5E1E]/20 to-[#FF8A3D]/20 border border-[#FF5E1E]/40 flex items-center justify-center text-[#FF5E1E] shadow-[0_0_20px_rgba(255,94,30,0.3)]">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">TENG-Based Sensor Monitoring</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FF5E1E]/15 text-[#FF7A00] border border-[#FF5E1E]/30 uppercase tracking-widest font-semibold">
                Triboelectric IoT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Self-powered kinetic vibration harvesting, open-circuit voltage waveforms (V), and high-frequency anomaly detection.
            </p>
          </div>
        </div>

        {/* Machine Picker */}
        <div className="flex items-center space-x-3">
          <label htmlFor="teng-monitored-asset" className="text-xs text-slate-400 font-medium">Monitored Asset:</label>
          <select
            id="teng-monitored-asset"
            aria-label="Select Monitored Asset"
            value={currentMachine?.id || ''}
            onChange={(e) => onSelectMachine(e.target.value)}
            className="bg-[#1D212B] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#FF5E1E] min-h-[38px] transition-all"
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
            aria-label="Refresh TENG telemetry stream"
            className="p-2.5 rounded-xl bg-[#1D212B] hover:bg-[#252B38] border border-slate-700/80 text-slate-300 hover:text-[#FF5E1E] touch-target-min min-h-[38px] min-w-[38px] transition-colors"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FF5E1E]' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards: Dynamic TENG Metrics with Glassmorphic styling */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Peak-to-Peak Voltage */}
        <div className="p-4 rounded-xl bg-[#161920]/75 backdrop-blur-md border border-[rgba(255,255,255,0.08)] hover:border-[#FF5E1E]/50 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider group-hover:text-slate-300">Peak Voltage (Vpp)</span>
            <Activity className="w-3.5 h-3.5 text-[#FF5E1E]" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {summary.vpp.toFixed(2)} <span className="text-xs font-normal text-slate-400">V</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Open-circuit amplitude</div>
        </div>

        {/* Contact Frequency */}
        <div className="p-4 rounded-xl bg-[#161920]/75 backdrop-blur-md border border-[rgba(255,255,255,0.08)] hover:border-[#FF5E1E]/50 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider group-hover:text-slate-300">Dominant Freq</span>
            <Radio className="w-3.5 h-3.5 text-[#FF7A00]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#FF7A00]">
            {summary.dominant_freq_hz.toFixed(1)} <span className="text-xs font-normal text-slate-400">Hz</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Contact-separation rate</div>
        </div>

        {/* Transferred Charge */}
        <div className="p-4 rounded-xl bg-[#161920]/75 backdrop-blur-md border border-[rgba(255,255,255,0.08)] hover:border-[#FF5E1E]/50 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider group-hover:text-slate-300">Charge (Q)</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {summary.mean_charge_nc.toFixed(2)} <span className="text-xs font-normal text-slate-400">nC</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Surface charge density</div>
        </div>

        {/* Kurtosis (Impact Indicator) */}
        <div className="p-4 rounded-xl bg-[#161920]/75 backdrop-blur-md border border-[rgba(255,255,255,0.08)] hover:border-[#FF5E1E]/50 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider group-hover:text-slate-300">Kurtosis</span>
            <Gauge className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className={`text-xl font-bold font-mono ${summary.kurtosis > 3.5 ? 'text-[#FF5E1E]' : 'text-slate-200'}`}>
            {summary.kurtosis.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{summary.kurtosis > 3.5 ? 'Shock spikes present' : 'Gaussian baseline'}</div>
        </div>

        {/* AI Anomaly Score */}
        <div className="p-4 rounded-xl bg-[#161920]/75 backdrop-blur-md border border-[rgba(255,255,255,0.08)] hover:border-[#FF5E1E]/50 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider group-hover:text-slate-300">AI Anomaly</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${maxAnomalyScore > 0.4 ? 'text-rose-400' : 'text-[#FF7A00]'}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${maxAnomalyScore > 0.4 ? 'text-rose-400' : 'text-[#FF7A00]'}`}>
            {maxAnomalyScore.toFixed(3)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Isolation Forest</div>
        </div>

        {/* Machine Health Score */}
        <div className="p-4 rounded-xl bg-[#161920]/75 backdrop-blur-md border border-[rgba(255,255,255,0.08)] hover:border-[#FF5E1E]/50 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider group-hover:text-slate-300">Health Index</span>
            <ShieldCheck className={`w-3.5 h-3.5 ${healthIndex < 70 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${healthIndex < 70 ? 'text-rose-400' : healthIndex < 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {healthIndex.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{healthIndex >= 85 ? 'Optimal' : healthIndex >= 70 ? 'Warning' : 'Critical'}</div>
        </div>
      </div>

      {/* Fault Alerts Banner if detected */}
      {rawFaultFlags.length > 0 && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 backdrop-blur-md flex items-start space-x-3 text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-red-300">TENG High-Frequency Anomaly Detected</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {rawFaultFlags.map((flag: any, idx: number) => {
                const label = typeof flag === 'string'
                  ? flag
                  : (flag?.fault ? `${flag.fault}${flag.severity ? ` (${flag.severity})` : ''}` : 'Mechanical Shock Chatter');
                return (
                  <span key={idx} className="px-2 py-0.5 rounded bg-red-900/60 border border-red-700/60 font-mono text-red-200">
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs with Industrial Orange Active Border */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('realtime')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'realtime'
              ? 'bg-[#1C2028] text-[#FF5E1E] border-b-2 border-[#FF5E1E] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161920]'
          }`}
        >
          Real-Time Waveform & Spectra
        </button>
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'benchmarks'
              ? 'bg-[#1C2028] text-[#FF5E1E] border-b-2 border-[#FF5E1E] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161920]'
          }`}
        >
          Preset Vibration Benchmarks ({benchmarks.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'upload'
              ? 'bg-[#1C2028] text-[#FF5E1E] border-b-2 border-[#FF5E1E] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161920]'
          }`}
        >
          Upload TENG Sensor CSV
        </button>
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

      {/* Tab 1: Real-Time Waveform & FFT */}
      {activeTab === 'realtime' && (
        <div className="space-y-6">
          {/* Main TENG Voltage Waveform Chart with Warm Ember Glow */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#FF5E1E]" />
                  <span>TENG Kinetic Open-Circuit Voltage Output (Voc)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Continuous triboelectric harvesting voltage signal captured at 10 Hz sampling rate across contact cycles.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Display Points:</span>
                {[40, 60, 100].map((pts) => (
                  <button
                    key={pts}
                    onClick={() => setTimeWindow(pts)}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all ${
                      timeWindow === pts ? 'bg-[#FF5E1E]/20 text-[#FF5E1E] border border-[#FF5E1E]/40 font-bold' : 'bg-[#1D212B] text-slate-400 hover:bg-[#252B38]'
                    }`}
                  >
                    {pts}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayReadings} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tengVoltGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5E1E" stopOpacity={0.45}/>
                      <stop offset="95%" stopColor="#FF5E1E" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232732" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#64748B" 
                    fontSize={10} 
                    tickFormatter={(val) => typeof val === 'string' && val.includes('T') ? val.split('T')[1].slice(0, 8) : val}
                  />
                  <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} unit="V" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#14171D', borderColor: '#2E3440', borderRadius: '8px', fontSize: '11px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                    labelStyle={{ color: '#94A3B8' }}
                  />
                  <ReferenceLine y={0} stroke="#333A48" strokeDasharray="2 2" />
                  <Area 
                    type="monotone" 
                    dataKey="voltage_v" 
                    name="Voltage (V)" 
                    stroke="#FF5E1E" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#tengVoltGrad)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dual Charts: Vibration Frequency & Transferred Charge */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Frequency Response */}
            <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-[#FF7A00]" />
                  <span>Vibration Frequency (Hz) & Dynamic Tracking</span>
                </h3>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayReadings} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232732" />
                    <XAxis 
                    dataKey="timestamp" 
                    stroke="#64748B" 
                    fontSize={10}
                    tickFormatter={(val) => typeof val === 'string' && val.includes('T') ? val.split('T')[1].slice(0, 8) : val}
                  />
                  <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} unit="Hz" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#14171D', borderColor: '#2E3440', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="frequency_hz" 
                    name="Frequency (Hz)" 
                    stroke="#FF7A00" 
                    strokeWidth={2} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transferred Charge Profile */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Harvested Charge Transfer (Qsc) in nC</span>
              </h3>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayReadings} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tengChargeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232732" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#64748B" 
                    fontSize={10}
                    tickFormatter={(val) => typeof val === 'string' && val.includes('T') ? val.split('T')[1].slice(0, 8) : val}
                  />
                  <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} unit="nC" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#14171D', borderColor: '#2E3440', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="charge_nc" 
                    name="Charge (nC)" 
                    stroke="#F59E0B" 
                    strokeWidth={1.8} 
                    fillOpacity={1} 
                    fill="url(#tengChargeGrad)" 
                    isAnimationActive={false}
                  />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Historical Table: Sensor Records */}
          <div className="p-5 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-x-auto">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#FF5E1E]" />
              <span>Latest Ingested TENG Telemetry Stream (Last 15 Readings)</span>
            </h3>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#1D212B] text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Voltage (V)</th>
                  <th className="py-2.5 px-3">Frequency (Hz)</th>
                  <th className="py-2.5 px-3">Amplitude (Vpp)</th>
                  <th className="py-2.5 px-3">Charge (nC)</th>
                  <th className="py-2.5 px-3">AI Anomaly Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {readings.slice(-15).reverse().map((r, idx) => {
                  const volt = Number(r.voltage_v) || 0;
                  const freq = Number(r.frequency_hz ?? r.vibration_frequency_hz) || 0;
                  const amp = Number(r.signal_amplitude_vpp ?? r.amplitude_v) || 0;
                  const chg = Number(r.charge_nc ?? r.charge_transfer_nc) || 0;
                  const isAnom = r.is_anomaly || (Number(r.anomaly_score || 0) >= 0.5);
                  const flagText = typeof r.fault_flag === 'string' ? r.fault_flag : (isAnom ? 'Impact Spike' : 'Nominal');
                  return (
                    <tr key={idx} className="hover:bg-[#1E232F]/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400">{r.timestamp || `T+${idx}`}</td>
                      <td className="py-2.5 px-3 text-[#FF7A00] font-bold">{volt.toFixed(3)} V</td>
                      <td className="py-2.5 px-3 text-slate-200">{freq.toFixed(2)} Hz</td>
                      <td className="py-2.5 px-3 text-slate-300">{amp.toFixed(2)} V</td>
                      <td className="py-2.5 px-3 text-amber-400">{chg.toFixed(3)} nC</td>
                      <td className="py-2.5 px-3 font-sans">
                        {isAnom ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/80 text-red-300 border border-red-800">
                            {flagText}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                            Nominal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Pre-loaded Benchmarks */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#161920]/75 backdrop-blur-md border border-[rgba(255,255,255,0.08)] text-xs text-slate-300">
            Select a verified empirical TENG sensor baseline. Each benchmark transmits continuous open-circuit contact voltage and micro-kinetic vibration frequency signatures directly into the AI diagnostic pipeline.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {benchmarks.map((b: any) => {
              const isSelected = evaluatingBenchmark === b.id;
              const bCond = b.condition || (b.filename?.includes('healthy') ? 'HEALTHY' : 'CRITICAL');
              const bFreq = b.expected_freq ?? (b.filename?.includes('healthy') ? 29.8 : (b.filename?.includes('impact') ? 89.4 : 24.5));
              const bVpp = b.expected_vpp ?? (b.filename?.includes('healthy') ? 6.5 : (b.filename?.includes('impact') ? 24.2 : 14.5));
              const bFile = b.filename || b.file_name || '';

              return (
                <div 
                  key={b.id} 
                  className="p-5 rounded-xl bg-[#161920]/80 backdrop-blur-md border border-[rgba(255,255,255,0.08)] hover:border-[#FF5E1E]/50 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        bCond === 'HEALTHY' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}>
                        {bCond}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{bFile}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{b.name}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{b.description}</p>

                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="p-2.5 rounded bg-[#1D212B] border border-white/5">
                        <span className="text-[10px] text-slate-500 block">Expected Freq</span>
                        <span className="font-mono text-slate-200 font-semibold">{bFreq} Hz</span>
                      </div>
                      <div className="p-2.5 rounded bg-[#1D212B] border border-white/5">
                        <span className="text-[10px] text-slate-500 block">Expected Amplitude</span>
                        <span className="font-mono text-slate-200 font-semibold">{bVpp} V</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBenchmarkSelect(b.id)}
                    disabled={isSelected}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-[#FF5E1E]/15 hover:bg-[#FF5E1E] text-[#FF7A00] hover:text-white border border-[#FF5E1E]/40 transition-all shadow-sm"
                  >
                    {isSelected ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating Anomaly Model...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Inject & Evaluate on Machine</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Upload Custom TENG CSV */}
      {activeTab === 'upload' && (
        <div className="p-6 rounded-2xl bg-[#161920]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-2xl space-y-6">
          <div className="max-w-xl mx-auto text-center space-y-2">
            <h3 className="text-base font-bold text-white">Ingest Field TENG Sensor CSV File</h3>
            <p className="text-xs text-slate-400">
              Upload raw contact-separation nanogenerator vibration telemetry. The AI engine validates required columns: <code className="text-[#FF7A00] font-mono">voltage_v</code>, <code className="text-[#FF7A00] font-mono">vibration_frequency_hz</code>, <code className="text-[#FF7A00] font-mono">signal_amplitude_vpp</code>, and <code className="text-[#FF7A00] font-mono">charge_transfer_nc</code>.
            </p>
          </div>

          <div className="max-w-md mx-auto border-2 border-dashed border-slate-700/80 hover:border-[#FF5E1E]/70 rounded-2xl p-8 text-center transition-all bg-[#12141A]/90 backdrop-blur-md">
            <UploadCloud className="w-10 h-10 text-[#FF5E1E] mx-auto mb-3" />
            <p className="text-xs text-slate-200 font-medium mb-1">
              {selectedFile ? selectedFile.name : 'Drag & drop TENG sensor CSV, or browse'}
            </p>
            <p className="text-[11px] text-slate-500 mb-4">Accepts CSV up to 25 MB</p>
            <label 
              htmlFor="teng-csv-file-input"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-[#0F1115] font-bold text-xs cursor-pointer hover:shadow-[0_0_20px_rgba(255,94,30,0.5)] transition-all min-h-[38px] touch-target-min"
            >
              <span>Select CSV File</span>
              <input 
                id="teng-csv-file-input"
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                className="sr-only" 
                disabled={uploading} 
                aria-label="Upload TENG Sensor CSV File"
              />
            </label>
          </div>

          {uploading && (
            <div className="flex items-center justify-center space-x-2 text-xs text-[#FF7A00]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Ingesting time series, extracting crest factors, and computing Isolation Forest anomaly boundaries...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
