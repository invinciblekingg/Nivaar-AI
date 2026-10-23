import React, { useState } from 'react';
import { Layers, Activity, AlertCircle, Wrench, Info, CheckCircle2 } from 'lucide-react';

export type MotorComponentKey = 'bearings' | 'rotor' | 'stator' | 'shaft' | 'cooling';

interface MotorComponentData {
  name: string;
  category: string;
  description: string;
  associatedSensors: string[];
  anomalyIndicators: string[];
  potentialFaults: Array<{ fault: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'; description: string }>;
  inspectionActions: string[];
}

const MOTOR_COMPONENTS: Record<MotorComponentKey, MotorComponentData> = {
  bearings: {
    name: 'Drive-End & Non-Drive End Bearings',
    category: 'Mechanical Rotating Element',
    description: 'Precision rolling-element bearings (deep groove ball or cylindrical roller) supporting the high-speed rotor shaft under radial and axial loads.',
    associatedSensors: ['vibration_x_rms_mms', 'vibration_y_rms_mms', 'bearing_pad_temp_c', 'ultrasound_db'],
    anomalyIndicators: [
      'Elevated vibration kurtosis (> 4.5) indicative of repetitive bearing impact shock waves.',
      'Crest factor excursions (> 3.2) during inner/outer race fluting or ball spalling.',
      'Localized high-frequency spikes near BPFO (Ball Pass Frequency Outer) and BPFI.'
    ],
    potentialFaults: [
      { fault: 'Outer Raceway Spalling', severity: 'CRITICAL', description: 'Fatigue pitting causing microscopic flaking and sharp impact pulses.' },
      { fault: 'Inadequate Lubrication / Grease Starvation', severity: 'HIGH', description: 'Boundary lubrication loss generating high-frequency acoustic friction.' },
      { fault: 'Electrical Fluting (EDM Currents)', severity: 'HIGH', description: 'VFD parasitic shaft currents arcing through the lubricant film.' }
    ],
    inspectionActions: [
      'Use high-frequency accelerometer and listen via ultrasound stethoscope for clicking/rumbling.',
      'Take grease sample to test for iron particulate and oxidation breakdown.',
      'Verify shaft grounding brush contact to mitigate parasitic EDM discharge.'
    ]
  },
  rotor: {
    name: 'Squirrel-Cage Rotor Assembly',
    category: 'Electromechanical Core',
    description: 'Conductive aluminum or copper rotor bars cast into a laminated steel core mounted tightly on the central shaft.',
    associatedSensors: ['motor_current_amps', 'vibration_x_rms_mms', 'shaft_speed_rpm'],
    anomalyIndicators: [
      'Sideband modulation around supply fundamental frequency (2 x slip frequency sidebands in current spectrum).',
      'Harmonic vibration peak at exactly 1X shaft running frequency (unbalance signature).'
    ],
    potentialFaults: [
      { fault: 'Broken / Cracked Rotor Bar', severity: 'HIGH', description: 'Thermal cycling stresses crack end rings, causing current torque oscillations.' },
      { fault: 'Rotor Dynamic Mass Unbalance', severity: 'MEDIUM', description: 'Mass center eccentricity inducing persistent centrifugal sinusoidal vibration.' }
    ],
    inspectionActions: [
      'Perform Motor Current Signature Analysis (MCSA) to measure pole-pass sideband amplitudes.',
      'Perform single-phase low-voltage rotation test (flux turn test) to detect broken bars.',
      'Perform precision dynamic balancing on balancing rig.'
    ]
  },
  stator: {
    name: 'Stator Core & 3-Phase Copper Windings',
    category: 'Electromagnetic Field Assembly',
    description: 'Stationary slotted iron core carrying insulated copper magnet wire coils generating the rotating magnetic field.',
    associatedSensors: ['winding_temperature_c', 'motor_current_amps', 'line_voltage_v'],
    anomalyIndicators: [
      'Thermal gradient escalation across winding phases exceeding Class F/H insulation limits.',
      'Negative-sequence current or current phase imbalance exceeding 3%.'
    ],
    potentialFaults: [
      { fault: 'Turn-to-Turn Insulation Degradation', severity: 'CRITICAL', description: 'Inter-turn dielectric breakdown leading to localized short circuit and fire risk.' },
      { fault: 'Stator Core Thermal Overheating', severity: 'HIGH', description: 'Continuous overload or poor ventilation causing varnish embrittlement.' }
    ],
    inspectionActions: [
      'Measure Insulation Resistance (Megger test) and Polarization Index (PI).',
      'Perform Surge Comparison Testing and offline DC winding resistance bridge check.',
      'Inspect stator air vents for particulate dust accumulation.'
    ]
  },
  shaft: {
    name: 'Output Shaft & Flexible Coupling',
    category: 'Mechanical Transmission',
    description: 'High-tensile alloy steel drive shaft transferring mechanical torque to downstream compressor, pump, or load.',
    associatedSensors: ['vibration_x_rms_mms', 'vibration_y_rms_mms', 'axial_vibration_mms'],
    anomalyIndicators: [
      'Pronounced 2X running speed vibration peak along with high 1X component.',
      'Elevated axial vibration exceeding 50% of radial amplitude.'
    ],
    potentialFaults: [
      { fault: 'Angular / Parallel Coupling Misalignment', severity: 'HIGH', description: 'Driver and driven shafts not co-linear, creating cyclic mechanical fatigue.' },
      { fault: 'Bent Shaft / Mechanical Looseness', severity: 'MEDIUM', description: 'Permanent shaft bow or loose foundation hold-down bolts.' }
    ],
    inspectionActions: [
      'Perform dual-axis laser shaft alignment across flexible coupling.',
      'Check shaft total indicated runout (TIR) with dial indicator.',
      'Torque foundation anchor bolts to manufacturer specification.'
    ]
  },
  cooling: {
    name: 'Cooling Jacket & External Forced-Air Fan',
    category: 'Thermal Management System',
    description: 'Cast iron cooling fins, external cowl, and bidirectional cooling fan for continuous convective heat dissipation.',
    associatedSensors: ['winding_temperature_c', 'ambient_air_temp_c', 'fan_speed_rpm'],
    anomalyIndicators: [
      'Rapid thermal rise (high dT/dt) while operating under normal nominal electrical current load.',
      'Elevated housing surface temperatures above 85°C.'
    ],
    potentialFaults: [
      { fault: 'Clogged Fin Air Passages', severity: 'HIGH', description: 'Industrial airborne grime, lint, or oil mist blocking convective air channels.' },
      { fault: 'Cooling Fan Blade Damage', severity: 'MEDIUM', description: 'Damaged fan impeller reducing volumetric airflow rate.' }
    ],
    inspectionActions: [
      'Visually inspect fan cowl and blow out debris with clean compressed air.',
      'Inspect cooling fan blades for cracks or loose clamping collar.',
      'Scan casing with calibrated FLIR thermal imaging camera.'
    ]
  }
};

export const MotorSchematic: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<MotorComponentKey>('bearings');
  const comp = MOTOR_COMPONENTS[selectedComponent];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Interactive SVG Digital Twin Schematic */}
      <div className="lg:col-span-7 glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#FF7A00]" />
              <span>Induction Motor Digital Twin Schematic</span>
            </h3>
            <p className="text-xs text-slate-400">Click any component sub-assembly to inspect diagnostic properties</p>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#251A14] text-[#FF9E66] border border-[#FF5E1E]/30">
            Interactive Model
          </span>
        </div>

        {/* SVG Equipment Visualization */}
        <div className="relative w-full aspect-[16/9] bg-[#0B1322] rounded-xl border border-[rgba(255,255,255,0.06)] flex items-center justify-center p-4 overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#152438_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

          <svg viewBox="0 0 800 450" className="w-full h-full max-h-[380px] drop-shadow-2xl">
            <defs>
              <linearGradient id="casingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
              <linearGradient id="statorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="shaftGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="50%" stopColor="#CBD5E1" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>
              <linearGradient id="rotorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C2410C" />
                <stop offset="50%" stopColor="#FF5E1E" />
                <stop offset="100%" stopColor="#9A3412" />
              </linearGradient>
            </defs>

            {/* Motor Feet / Base Mounts */}
            <rect x="220" y="340" width="70" height="30" fill="#1E293B" stroke="#475569" strokeWidth="2" rx="4" />
            <rect x="510" y="340" width="70" height="30" fill="#1E293B" stroke="#475569" strokeWidth="2" rx="4" />
            <line x1="180" y1="370" x2="620" y2="370" stroke="#334155" strokeWidth="4" />

            {/* Central Rotating Shaft (Clickable) */}
            <g 
              onClick={() => setSelectedComponent('shaft')}
              className="cursor-pointer transition-all hover:opacity-90"
            >
              <rect 
                x="80" y="205" width="640" height="40" 
                fill="url(#shaftGrad)" 
                stroke={selectedComponent === 'shaft' ? '#FF5E1E' : '#64748B'} 
                strokeWidth={selectedComponent === 'shaft' ? '3' : '1.5'}
                rx="4"
              />
              {/* Shaft Keyway */}
              <rect x="650" y="215" width="50" height="8" fill="#475569" />
            </g>

            {/* Cooling Fin Casing Outer Shell (Clickable) */}
            <g 
              onClick={() => setSelectedComponent('cooling')}
              className="cursor-pointer transition-all hover:opacity-90"
            >
              <rect 
                x="200" y="90" width="400" height="270" 
                fill="url(#casingGrad)" 
                stroke={selectedComponent === 'cooling' ? '#2FC7A8' : '#475569'} 
                strokeWidth={selectedComponent === 'cooling' ? '3' : '2'}
                rx="14"
              />
              {/* Cooling Fins */}
              {[-120, -95, -70, -45, -20, 5, 30, 55, 80, 105].map((offset, i) => (
                <line 
                  key={i} 
                  x1="220" y1={225 + offset} 
                  x2="580" y2={225 + offset} 
                  stroke={selectedComponent === 'cooling' ? '#2FC7A8' : '#334155'} 
                  strokeWidth="2.5" 
                />
              ))}
              {/* Terminal Box Top */}
              <rect x="330" y="55" width="140" height="40" fill="#1E293B" stroke="#475569" strokeWidth="2" rx="6" />
            </g>

            {/* Stator Windings (Clickable) */}
            <g 
              onClick={() => setSelectedComponent('stator')}
              className="cursor-pointer transition-all hover:opacity-90"
            >
              <rect 
                x="250" y="130" width="300" height="45" 
                fill="url(#statorGrad)" 
                stroke={selectedComponent === 'stator' ? '#F59E0B' : '#B45309'} 
                strokeWidth={selectedComponent === 'stator' ? '3' : '1.5'}
                rx="6"
              />
              <rect 
                x="250" y="275" width="300" height="45" 
                fill="url(#statorGrad)" 
                stroke={selectedComponent === 'stator' ? '#F59E0B' : '#B45309'} 
                strokeWidth={selectedComponent === 'stator' ? '3' : '1.5'}
                rx="6"
              />
            </g>

            {/* Rotor Core (Clickable) */}
            <g 
              onClick={() => setSelectedComponent('rotor')}
              className="cursor-pointer transition-all hover:opacity-90"
            >
              <rect 
                x="280" y="185" width="240" height="80" 
                fill="url(#rotorGrad)" 
                stroke={selectedComponent === 'rotor' ? '#FF5E1E' : '#0284C7'} 
                strokeWidth={selectedComponent === 'rotor' ? '3' : '2'}
                rx="6"
              />
              {/* Rotor Bar Slot Indents */}
              {[300, 330, 360, 390, 420, 450, 480, 500].map((rx, idx) => (
                <line key={idx} x1={rx} y1="185" x2={rx + 10} y2="265" stroke="#082F49" strokeWidth="2" strokeDasharray="3 3" />
              ))}
            </g>

            {/* Bearings (Drive-End & Non-Drive End) (Clickable) */}
            <g 
              onClick={() => setSelectedComponent('bearings')}
              className="cursor-pointer transition-all hover:opacity-90"
            >
              {/* Drive-End Bearing (Right) */}
              <rect 
                x="560" y="190" width="35" height="70" 
                fill="#DC2626" 
                stroke={selectedComponent === 'bearings' ? '#FF5E1E' : '#EF4444'} 
                strokeWidth={selectedComponent === 'bearings' ? '3' : '1.5'}
                rx="4"
              />
              {/* Balls in DE Bearing */}
              <circle cx="577" cy="205" r="7" fill="#FEE2E2" />
              <circle cx="577" cy="225" r="7" fill="#FEE2E2" />
              <circle cx="577" cy="245" r="7" fill="#FEE2E2" />

              {/* Non-Drive End Bearing (Left) */}
              <rect 
                x="205" y="190" width="35" height="70" 
                fill="#DC2626" 
                stroke={selectedComponent === 'bearings' ? '#FF5E1E' : '#EF4444'} 
                strokeWidth={selectedComponent === 'bearings' ? '3' : '1.5'}
                rx="4"
              />
              {/* Balls in NDE Bearing */}
              <circle cx="222" cy="205" r="7" fill="#FEE2E2" />
              <circle cx="222" cy="225" r="7" fill="#FEE2E2" />
              <circle cx="222" cy="245" r="7" fill="#FEE2E2" />
            </g>

            {/* Labels and Callouts */}
            <text x="560" y="175" fill="#EF4444" fontSize="12" fontWeight="bold">DE Bearing (Fluting Anomaly)</text>
            <text x="280" y="120" fill="#F59E0B" fontSize="12" fontWeight="bold">Stator Windings (3-Phase)</text>
            <text x="360" y="230" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">Rotor Core</text>
            <text x="640" y="270" fill="#94A3B8" fontSize="12" fontWeight="bold">Drive Shaft</text>
          </svg>

          {/* Component Quick Selector Pills */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-center space-x-2 bg-[#161920]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
            {(Object.keys(MOTOR_COMPONENTS) as MotorComponentKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSelectedComponent(k)}
                aria-label={`Select component: ${MOTOR_COMPONENTS[k].name}`}
                className={`px-2.5 py-1 text-[11px] rounded font-medium min-h-[30px] transition-all ${
                  selectedComponent === k
                    ? 'bg-[#FF5E1E] text-[#0F1115] font-bold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-[#1C2028]'
                }`}
              >
                {MOTOR_COMPONENTS[k].name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Pane for Selected Component */}
      <div className="lg:col-span-5 glass-card p-6 space-y-4">
        <div className="border-b border-white/10 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#FF7A00] uppercase tracking-wider font-bold">{comp.category}</span>
            <span className="text-xs text-slate-400">Component Health: 74%</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">{comp.name}</h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">{comp.description}</p>
        </div>

        {/* Associated Sensors */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-[#2FC7A8]" />
            <span>Associated Sensor Channels</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {comp.associatedSensors.map((s, idx) => (
              <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1C2028] text-slate-200 border border-white/5">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Anomaly Indicators */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>Telemetry Anomaly Signatures</span>
          </span>
          <div className="space-y-1 text-xs text-slate-300 bg-[#1C2028] p-2.5 rounded-lg border border-white/5">
            {comp.anomalyIndicators.map((ind, idx) => (
              <p key={idx} className="leading-snug flex items-start space-x-2">
                <span className="text-[#FF7A00] font-bold">•</span>
                <span>{ind}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Potential Fault Hypotheses */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Possible Failure Modes
          </span>
          <div className="space-y-1.5">
            {comp.potentialFaults.map((f, idx) => (
              <div key={idx} className="p-2 rounded bg-[#1C2028] border border-white/5 flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">{f.fault}</span>
                  <span className="text-[11px] text-slate-400">{f.description}</span>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  f.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#2A1810] text-[#FF5E1E] border border-[#FF5E1E]/40'
                }`}>
                  {f.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Inspection Steps */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Wrench className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>Recommended Physical Inspections</span>
          </span>
          <div className="space-y-1 text-xs text-slate-300">
            {comp.inspectionActions.map((act, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{act}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
