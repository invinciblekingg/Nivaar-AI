import React, { useState } from 'react';
import { Layers, Info, Box, Zap, Sparkles } from 'lucide-react';
import { MotorSchematic } from '../components/MotorSchematic';
import { Teng3DModelViewer } from '../components/Teng3DModelViewer';

export const ComponentExplorerPage: React.FC = () => {
  const [activeModel, setActiveModel] = useState<'teng' | 'motor'>('teng');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="glass-panel p-6 border-l-4 border-l-[#FF5E1E] bg-[#161920]/85 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-wide">
              Equipment Component Explorer
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#251A14] text-[#FF7A00] border border-[#FF5E1E]/30 uppercase tracking-widest font-bold">
              3D Digital Twin
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            High-fidelity interactive 3D digital twin of self-powered TENG vibration sensors and industrial electromechanical motor assemblies. 
            Inspect layer topology, contact surfaces, copper electrode patterns, and failure modes.
          </p>
        </div>

        {/* Digital Twin Selector Buttons */}
        <div className="flex items-center p-1 bg-[#12141A] rounded-xl border border-white/10 shrink-0">
          <button
            id="explorer-teng-tab-btn"
            onClick={() => setActiveModel('teng')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeModel === 'teng'
                ? 'bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-white shadow-[0_0_15px_rgba(255,94,30,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>TENG 3D Sensor</span>
          </button>
          <button
            id="explorer-motor-tab-btn"
            onClick={() => setActiveModel('motor')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeModel === 'motor'
                ? 'bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-white shadow-[0_0_15px_rgba(255,94,30,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Motor Assembly</span>
          </button>
        </div>
      </div>

      {/* Advisory Notice */}
      <div className="p-3.5 rounded-xl bg-[#1C2028] border border-white/5 flex items-start space-x-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {activeModel === 'teng' ? (
            <span>
              Interactive 3D Digital Twin: Tripo3D PBR-ready model of the Nivaar AI TENG vibration sensor. Use mouse drag or touch to rotate 360°, scroll wheel to zoom in to microscopic electrode details, and toggle kinetic micro-vibration simulation.
            </span>
          ) : (
            <span>
              Diagnostic notice: This schematic represents engineering domain correlation logic. Sensor telemetry values are mapped through multivariate anomaly rules and vibration FFT frequencies.
            </span>
          )}
        </p>
      </div>

      {/* Active Model Display */}
      {activeModel === 'teng' ? (
        <div className="space-y-4">
          <Teng3DModelViewer height="560px" vibrationHz={29.8} voltageV={6.48} />
        </div>
      ) : (
        <MotorSchematic />
      )}
    </div>
  );
};

