import React, { useState, useEffect } from 'react';
import { 
  Server, Plus, Search, Filter, ShieldCheck, AlertTriangle, 
  AlertOctagon, Activity, FileText, ArrowRight, X, Check
} from 'lucide-react';
import { Machine, EquipmentCategory, EquipmentStatus } from '../types';
import { api } from '../services/api';

interface MachineRegistryPageProps {
  machines: Machine[];
  onSelectMachine: (machineId: string) => void;
  onRefresh: () => void;
}

const CATEGORIES: Array<EquipmentCategory | 'All'> = [
  'All',
  'Industrial Motors',
  'Pumps',
  'Compressors',
  'Medical Equipment',
  'Power Turbines',
  'Industrial Robots',
  'Vehicle Systems',
  'Data Center Cooling Equipment',
];

export const MachineRegistryPage: React.FC<MachineRegistryPageProps> = ({
  machines,
  onSelectMachine,
  onRefresh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Machine form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<EquipmentCategory>('Industrial Motors');
  const [newAssetTag, setNewAssetTag] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newSensors, setNewSensors] = useState('vibration_x_rms_mms, winding_temperature_c, motor_current_amps');

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const filteredMachines = machines.filter((m) => {
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesStat = selectedStatus === 'All' || m.status === selectedStatus;
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location_label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStat && matchesSearch;
  });

  const handleRegisterMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAssetTag || !newLocation) return;

    try {
      await api.createMachine({
        name: newName,
        category: newCategory,
        asset_tag: newAssetTag,
        location_label: newLocation,
        status: 'HEALTHY',
        health_index: 99.0,
        is_monitored: true,
        profile_config: {
          sensors: newSensors.split(',').map((s) => s.trim()),
        }
      });
      setIsModalOpen(false);
      setNewName('');
      setNewAssetTag('');
      setNewLocation('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error registering machine');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
            <Server className="w-5 h-5 text-[#FF7A00]" />
            <span>Critical Infrastructure Asset Registry</span>
          </h1>
          <p className="text-xs text-slate-400">
            Enterprise equipment inventory with machine-specific sensor profiles & baseline monitoring envelopes
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-[#0F1115] font-bold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(255,94,30,0.35)] transition-all self-start sm:self-auto min-h-[38px] touch-target-min"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Machine</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by asset tag, machine name, or physical facility location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search machinery by tag, name, or location"
              className="w-full pl-9 pr-4 py-2 bg-[#1C2028] border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5E1E]"
            />
          </div>

          {/* Status selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 shrink-0 font-medium">Status:</span>
            {['All', 'HEALTHY', 'WARNING', 'CRITICAL'].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                aria-label={`Filter machinery by status: ${s}`}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] touch-target-min transition-all ${
                  selectedStatus === s
                    ? 'bg-[#FF5E1E] text-[#0F1115] font-bold shadow-sm'
                    : 'bg-[#1C2028] text-slate-300 hover:text-white border border-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills (All 8 mandatory types) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-xs shrink-0 font-semibold uppercase tracking-wider mr-1">
            Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] touch-target-min transition-all ${
                selectedCategory === cat
                  ? 'bg-[#251A14] text-[#FF7A00] font-bold border border-[#FF5E1E]/40'
                  : 'bg-[#1C2028] text-slate-300 hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMachines.map((m) => {
          const sensors = m.profile_config?.sensors || [];
          return (
            <div 
              key={m.id}
              className="glass-card p-5 space-y-4 hover:border-[#FF5E1E]/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-[#FF7A00] uppercase tracking-wider block font-bold">
                      {m.category}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5 leading-snug">{m.name}</h3>
                    <span className="text-[11px] font-mono text-slate-300 px-2 py-0.5 bg-[#1C2028] border border-white/5 rounded mt-1 inline-block">
                      {m.asset_tag}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded uppercase font-mono ${
                    m.status === 'HEALTHY' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : m.status === 'WARNING'
                      ? 'bg-[#251A14] text-[#FF9E66] border border-[#FF5E1E]/40'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-1">{m.location_label}</p>

                {/* Health Index Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Health Index</span>
                    <span className={`font-mono font-bold ${
                      m.health_index >= 90 ? 'text-emerald-400' : m.health_index >= 70 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {m.health_index.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#1C2028] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        m.health_index >= 90 ? 'bg-emerald-400' : m.health_index >= 70 ? 'bg-amber-400' : 'bg-red-500'
                      }`}
                      style={{ width: `${m.health_index}%` }}
                    />
                  </div>
                </div>

                {/* Sensor Profiles List */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Configured Sensor Channels ({sensors.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {sensors.slice(0, 3).map((s: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C2028] text-slate-300 border border-white/5">
                        {s}
                      </span>
                    ))}
                    {sensors.length > 3 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C2028] text-slate-400">
                        +{sensors.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <a
                  href={api.getReportDownloadUrl(m.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Audit</span>
                </a>
                <button
                  onClick={() => onSelectMachine(m.id)}
                  className="flex items-center space-x-1 text-xs text-[#FF7A00] hover:text-[#FF9E66] hover:underline font-semibold"
                >
                  <span>Inspect Telemetry</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-machine-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#161920] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 id="register-machine-modal-title" className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#FF7A00]" />
                <span>Register Industrial Machine</span>
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                aria-label="Close dialog"
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterMachine} className="space-y-3 text-xs">
              <div>
                <label htmlFor="reg-machine-name" className="block text-slate-400 mb-1">Equipment Name</label>
                <input
                  id="reg-machine-name"
                  type="text"
                  required
                  placeholder="e.g. Dual-Impeller Booster Pump P-404"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  aria-label="Equipment Name"
                  className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div>
                <label htmlFor="reg-machine-category" className="block text-slate-400 mb-1">Equipment Category</label>
                <select
                  id="reg-machine-category"
                  aria-label="Equipment Category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as EquipmentCategory)}
                  className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-machine-asset-tag" className="block text-slate-400 mb-1">Asset Tag</label>
                  <input
                    id="reg-machine-asset-tag"
                    type="text"
                    required
                    placeholder="EQ-PMP-404"
                    value={newAssetTag}
                    onChange={(e) => setNewAssetTag(e.target.value)}
                    aria-label="Asset Tag"
                    className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>
                <div>
                  <label htmlFor="reg-machine-location" className="block text-slate-400 mb-1">Physical Location</label>
                  <input
                    id="reg-machine-location"
                    type="text"
                    required
                    placeholder="Intake Bay 3, Plant West"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    aria-label="Physical Location"
                    className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-machine-sensors" className="block text-slate-400 mb-1">Expected Sensor Channels (comma-separated)</label>
                <input
                  id="reg-machine-sensors"
                  type="text"
                  value={newSensors}
                  onChange={(e) => setNewSensors(e.target.value)}
                  aria-label="Expected Sensor Channels"
                  className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#1C2028] text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-[#0F1115] font-bold hover:brightness-110 shadow-md min-h-[38px] touch-target-min"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
