import React, { useState, useEffect } from 'react';
import { 
  Activity, ArrowLeft, Download, RefreshCw, AlertTriangle, 
  CheckCircle, Radio, Wrench, ShieldAlert, Cpu, BarChart2
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  Tooltip, CartesianGrid, AreaChart, Area, BarChart, Bar 
} from 'recharts';
import { Machine, TelemetryPoint } from '../types';
import { api } from '../services/api';

interface MachineDetailPageProps {
  machineId: string;
  onBack: () => void;
  onNavigateDiagnostics: () => void;
}

export const MachineDetailPage: React.FC<MachineDetailPageProps> = ({
  machineId,
  onBack,
  onNavigateDiagnostics,
}) => {
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    machine_id: string;
    machine_name: string;
    health_index: number;
    status: string;
    telemetry_stream: TelemetryPoint[];
    anomalies: any[];
  } | null>(null);

  const [fftData, setFftData] = useState<{
    fundamental_frequency_hz: number;
    harmonics: Array<{ frequency_hz: number; label: string; amplitude_mms: number; status: string }>;
    iso_10816_vibration_zone: string;
  } | null>(null);

  const [machineMeta, setMachineMeta] = useState<Machine | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [telemetryRes, fftRes, machineRes] = await Promise.all([
        api.getTelemetry(machineId, timeRange),
        api.getSpectralFFT(machineId),
        api.getMachineDetail(machineId)
      ]);
      setData(telemetryRes);
      setFftData(fftRes);
      setMachineMeta(machineRes.machine);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [machineId, timeRange]);

  if (loading && !data) {
    return (
      <div className="h-96 flex items-center justify-center space-x-3 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin text-[#FF7A00]" />
        <span>Loading high-resolution machine telemetry...</span>
      </div>
    );
  }

  const stream = data?.telemetry_stream || [];
  const isDemo = stream.some((s) => s.is_demo);

  // Check what channels exist in stream
  const sample = stream[0] || {};
  const hasVibX = 'vibration_x_rms_mms' in sample;
  const hasVibY = 'vibration_y_rms_mms' in sample;
  const hasTemp = 'winding_temperature_c' in sample || 'condenser_temp_c' in sample || 'bearing_pad_temp_c' in sample;
  const hasCurrent = 'motor_current_amps' in sample || 'compressor_current_amps' in sample;
  const hasPressure = 'discharge_pressure_psi' in sample || 'suction_pressure_psi' in sample || 'lube_oil_pressure_bar' in sample;

  const tempKey = 'winding_temperature_c' in sample ? 'winding_temperature_c' : ('condenser_temp_c' in sample ? 'condenser_temp_c' : 'bearing_pad_temp_c');
  const currentKey = 'motor_current_amps' in sample ? 'motor_current_amps' : 'compressor_current_amps';

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161920]/85 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] shadow-xl">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            aria-label="Back to overview dashboard"
            className="p-2.5 rounded-xl bg-[#1C2028] border border-white/10 text-slate-300 hover:text-white hover:border-[#FF5E1E]/50 touch-target-min transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-wide">{data?.machine_name || 'Machine Telemetry'}</h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded uppercase font-mono ${
                data?.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#2A1810] text-[#FF5E1E] border border-[#FF5E1E]/40'
              }`}>
                {data?.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {machineMeta?.category} • {machineMeta?.location_label} • Asset Tag: <span className="font-mono text-slate-300">{machineMeta?.asset_tag}</span>
            </p>
          </div>
        </div>

        {/* Provenance Badge & Time Range Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Real vs Synthetic Benchmark Provenance Tag */}
          <div className={`px-3 py-1.5 rounded-xl text-xs font-mono border flex items-center space-x-1.5 ${
            isDemo 
              ? 'bg-[#251A14] text-[#FF9E66] border-[#FF5E1E]/30' 
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}>
            <Radio className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>{isDemo ? 'BENCHMARK REPLAY STREAM' : 'VERIFIED PHYSICAL SENSOR'}</span>
          </div>

          {/* Time range switchers with 36-44pt Touch Targets (Apple HIG Fitts's Law) */}
          <div className="flex items-center bg-[#1C2028] border border-white/10 rounded-xl p-1 space-x-1 text-xs">
            {['1h', '6h', '24h', '7d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold min-h-[36px] touch-target-min transition-all ${
                  timeRange === range
                    ? 'bg-[#FF5E1E] text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <a
            href={api.getReportDownloadUrl(machineId)}
            target="_blank"
            rel="noreferrer"
            aria-label="Download Machine PDF Compliance Report"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#1C2028] text-[#FF9E66] border border-[#FF5E1E]/40 text-xs font-semibold hover:bg-[#252B36] hover:border-[#FF5E1E] min-h-[36px] touch-target-min transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* Equipment Diagnostics KPI Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-slate-400">Health Index</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">{data?.health_index.toFixed(1)}%</span>
            <span className={`text-[11px] font-bold ${data && data.health_index >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {data && data.health_index >= 85 ? 'Stable' : 'Degraded'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">ISO 10816 Vibration Envelope</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-slate-400">Vibration ISO Zone</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-base font-bold text-[#FF7A00] truncate">{fftData?.iso_10816_vibration_zone || 'Zone B'}</span>
          </div>
          <p className="text-[10px] text-slate-500">Fundamental: {fftData?.fundamental_frequency_hz} Hz</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-slate-400">Telemetry Sampling</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">{stream.length}</span>
            <span className="text-[10px] text-slate-400">Samples</span>
          </div>
          <p className="text-[10px] text-slate-500">Continuous 10s intervals</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-slate-400">Detected Anomalies</span>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${data && data.anomalies.length > 0 ? 'text-[#FF8A3D]' : 'text-emerald-400'}`}>
              {data?.anomalies.length || 0}
            </span>
            <span className="text-[10px] text-slate-400">Windows</span>
          </div>
          <p className="text-[10px] text-slate-500">Isolation Forest evaluation</p>
        </div>
      </div>

      {/* Chart 1: Vibration Telemetry Amplitude (X & Y) */}
      <div className="glass-card p-5 space-y-4 chart-container-optimized">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#FF7A00]" />
              <span>Vibration Amplitude Telemetry (X & Y Axis RMS)</span>
            </h3>
            <p className="text-xs text-slate-400">Continuous tri-axial accelerometer readings compared against ISO alarm boundaries</p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-mono">
            <span className="flex items-center space-x-1 text-[#FF7A00]">
              <span className="w-2.5 h-0.5 bg-[#FF5E1E] inline-block" />
              <span>Vibration X (mm/s)</span>
            </span>
            <span className="flex items-center space-x-1 text-[#2FC7A8]">
              <span className="w-2.5 h-0.5 bg-[#2FC7A8] inline-block" />
              <span>Vibration Y (mm/s)</span>
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stream}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickFormatter={(t) => t.slice(11, 16)} />
              <YAxis stroke="#64748B" fontSize={10} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#161920', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey={hasVibX ? "vibration_x_rms_mms" : (sample.radial_vibration_mms ? "radial_vibration_mms" : "pump_casing_vibration_mms")} 
                stroke="#FF5E1E" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false}
              />
              {hasVibY && (
                <Line type="monotone" dataKey="vibration_y_rms_mms" stroke="#2FC7A8" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Thermal & Current / Pressure Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thermal Telemetry */}
        <div className="glass-card p-5 space-y-4 chart-container-optimized">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Operating Temperature Trajectory (°C)</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Thermal Envelope</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stream}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF7A00" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickFormatter={(t) => t.slice(11, 16)} />
                <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161920', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                />
                <Area type="monotone" dataKey={tempKey} stroke="#FF7A00" strokeWidth={2} fillOpacity={1} fill="url(#tempGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current / Pressure Spectrum */}
        <div className="glass-card p-5 space-y-4 chart-container-optimized">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>{hasCurrent ? 'Motor Load Current (Amps)' : 'Operating Pressure (PSI/Bar)'}</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Duty Cycle</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stream}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickFormatter={(t) => t.slice(11, 16)} />
                <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161920', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey={hasCurrent ? currentKey : (sample.discharge_pressure_psi ? 'discharge_pressure_psi' : 'lube_oil_pressure_bar')} 
                  stroke="#10B981" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Spectral Frequency FFT & Harmonic Indicators */}
      {fftData && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-[#FF7A00]" />
                <span>Spectral FFT Vibration Spectrum & Bearing Defect Frequencies</span>
              </h3>
              <p className="text-xs text-slate-400">Order tracking analysis identifying 1X unbalance, 2X misalignment, and BPFO bearing spikes</p>
            </div>
            <span className="text-xs font-mono text-[#FF7A00] font-bold">1X = {fftData.fundamental_frequency_hz} Hz</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fftData.harmonics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161920', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                />
                <Bar dataKey="amplitude_mms" fill="#FF5E1E" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
