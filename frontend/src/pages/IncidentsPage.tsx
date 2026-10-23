import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, ShieldAlert, CheckCircle, Clock, AlertTriangle, 
  ChevronRight, ArrowRight, UserCheck, Check, MessageSquare
} from 'lucide-react';
import { Incident, Machine } from '../types';
import { api } from '../services/api';

interface IncidentsPageProps {
  machines: Machine[];
  onSelectMachine: (machineId: string) => void;
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({ machines, onSelectMachine }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [resolutionNote, setResolutionNote] = useState<string>('');

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await api.updateIncident(incidentId, {
        status: 'RESOLVED',
        resolution_notes: resolutionNote || 'Physical verification conducted; operating parameters stabilized.',
        timeline_event: 'Incident confirmed mitigated and officially closed by Operations Lead.'
      });
      setResolutionNote('');
      loadIncidents();
    } catch (err: any) {
      alert(err.message || 'Error resolving incident');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 border-l-4 border-l-red-500 bg-[#161920]/85 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              <span>Disruption Response & Incident Recovery Command</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
              High-Consequence Assets
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Emergency mitigation center coordinating technical response teams, tracking equipment recovery timelines, 
            and preventing community-wide utility, hospital, and critical power infrastructure disruptions.
          </p>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 rounded-xl bg-[#251A14] border border-[#FF5E1E]/30 flex items-start space-x-3 text-xs text-[#FF9E66]">
        <ShieldAlert className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Decision-Support Advisory:</strong> MachineGuard AI flags anomalous telemetry and recommends physical inspection routes. 
          To ensure grid and patient safety, MachineGuard AI <strong>never automatically trips or shuts down</strong> physical equipment without human engineering sign-off.
        </p>
      </div>

      {/* Incidents Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Incidents Roster */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
            Active Infrastructure Incidents ({incidents.length})
          </span>

          <div className="space-y-2.5">
            {incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select incident: ${inc.title} for ${inc.machine_name}`}
                  onClick={() => setSelectedIncident(inc)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIncident(inc);
                    }
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all focus:outline-none ${
                    isSelected
                      ? 'bg-[#1C2028] border-[#FF5E1E] shadow-[0_0_20px_rgba(255,94,30,0.25)]'
                      : 'bg-[#161920]/80 border-white/5 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                      inc.status === 'INVESTIGATING' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {inc.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white mt-2 leading-snug">{inc.title}</h3>
                  <span className="text-[11px] text-[#FF7A00] font-semibold block mt-0.5">{inc.machine_name}</span>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{inc.operational_impact}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Incident Command Center & Timeline */}
        {selectedIncident ? (
          <div className="lg:col-span-7 glass-card p-6 space-y-5">
            <div className="border-b border-[rgba(255,255,255,0.08)] pb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider font-bold">
                  {selectedIncident.severity} TIER DISRUPTION INCIDENT
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded font-mono ${
                  selectedIncident.status === 'INVESTIGATING' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {selectedIncident.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-white leading-snug">{selectedIncident.title}</h2>
              <div className="text-xs text-slate-400 flex items-center space-x-2">
                <span>
                  Asset:{' '}
                  <button
                    type="button"
                    onClick={() => onSelectMachine(selectedIncident.machine_id)}
                    aria-label={`View full telemetry and diagnostics for ${selectedIncident.machine_name}`}
                    className="text-[#FF7A00] font-bold hover:underline inline-flex items-center focus:outline-none"
                  >
                    <span>{selectedIncident.machine_name}</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </span>
                <span>•</span>
                <span>Location: <strong className="text-white">{selectedIncident.location_label}</strong></span>
              </div>
            </div>

            {/* Operational Impact */}
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 space-y-1">
              <span className="text-xs font-bold text-red-300 uppercase tracking-wide block">
                Operational Impact Assessment
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedIncident.operational_impact}
              </p>
            </div>

            {/* Recommended Physical Inspections */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Recommended On-Site Inspection Protocols
              </span>
              <div className="space-y-1.5 text-xs text-slate-300">
                {selectedIncident.recommended_inspections.map((ins, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <UserCheck className="w-3.5 h-3.5 text-[#FF7A00] shrink-0 mt-0.5" />
                    <span>{ins}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Incident Chronological Timeline */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#2FC7A8]" />
                <span>Incident Response Timeline</span>
              </span>

              <div className="space-y-2.5 border-l-2 border-slate-700 pl-4 ml-1">
                {selectedIncident.timeline.map((event, idx) => (
                  <div key={idx} className="space-y-0.5 text-xs">
                    <span className="text-[10px] font-mono text-[#FF7A00] font-bold block">
                      {new Date(event.time).toLocaleTimeString()} — {event.actor}
                    </span>
                    <p className="text-slate-200">{event.event}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution Action */}
            {selectedIncident.status === 'INVESTIGATING' && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <label htmlFor="incident-resolution-note" className="block text-xs font-semibold text-slate-300">
                  Record Physical Inspection Findings & Close Incident
                </label>
                <div className="flex space-x-2">
                  <input
                    id="incident-resolution-note"
                    type="text"
                    placeholder="e.g. Technician replaced expansion valve and topped up refrigerant. Temperatures normalized."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    aria-label="Record Physical Inspection Findings & Close Incident"
                    className="flex-1 p-2 bg-[#1C2028] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                  <button
                    onClick={() => handleResolveIncident(selectedIncident.id)}
                    aria-label="Mitigate and close incident"
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all flex items-center space-x-1.5 shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>Mitigate & Close</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-7 glass-card p-8 flex items-center justify-center text-slate-500 text-xs italic">
            Select an incident to view technical timeline and mitigation procedures.
          </div>
        )}
      </div>
    </div>
  );
};
