import React from 'react';
import { Layers, Info, ShieldAlert } from 'lucide-react';
import { MotorSchematic } from '../components/MotorSchematic';

export const ComponentExplorerPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="glass-panel p-6 border-l-4 border-l-[#FF5E1E] bg-[#161920]/85 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-wide">
              Equipment Component Explorer
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#251A14] text-[#FF7A00] border border-[#FF5E1E]/30 uppercase tracking-widest">
              Digital Twin
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Educational electromechanical inspection model for high-voltage industrial induction motors. 
            Correlates sensor channels with physical failure modes, acoustic indicators, and non-destructive testing procedures.
          </p>
        </div>
      </div>

      {/* Advisory Notice */}
      <div className="p-3.5 rounded-xl bg-[#1C2028] border border-white/5 flex items-start space-x-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Diagnostic notice: This schematic represents engineering domain correlation logic. It does not imply internal physical optical scanning 
          of enclosed machinery. Sensor telemetry values are mapped through multivariate anomaly rules and vibration FFT frequencies.
        </p>
      </div>

      {/* Interactive Motor Digital Twin Schematic */}
      <MotorSchematic />
    </div>
  );
};
