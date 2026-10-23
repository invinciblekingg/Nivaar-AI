import React from 'react';
import { 
  Server, ShieldCheck, AlertTriangle, AlertOctagon, 
  Activity, Cpu, Clock, CheckCircle2, ArrowUpRight, TrendingDown,
  Layers, Wrench, Download
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, PieChart, Pie, Cell 
} from 'recharts';
import { DashboardStats, Machine, Alert, EquipmentCategory } from '../types';
import { NavTab } from '../components/Sidebar';
import { api } from '../services/api';

interface OverviewPageProps {
  stats: DashboardStats | null;
  machines: Machine[];
  alerts: Alert[];
  onSelectTab: (tab: NavTab) => void;
  onSelectMachine: (machineId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Industrial Motors': '#FF5E1E',
  'Pumps': '#2FC7A8',
  'Compressors': '#FF8A3D',
  'Medical Equipment': '#EC4899',
  'Power Turbines': '#F59E0B',
  'Industrial Robots': '#A855F7',
  'Vehicle Systems': '#10B981',
  'Data Center Cooling Equipment': '#FF7A00',
};

export const OverviewPage: React.FC<OverviewPageProps> = ({
  stats,
  machines,
  alerts,
  onSelectTab,
  onSelectMachine,
}) => {
  // Category breakdown for Pie Chart
  const categoryCounts: Record<string, number> = {};
  machines.forEach((m) => {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
  });
  const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || '#94A3B8',
  }));

  // Synthetic trend points for overview health timeline
  const trendData = [
    { time: '02:00', health: 98.2, anomalies: 0 },
    { time: '04:00', health: 97.8, anomalies: 1 },
    { time: '06:00', health: 96.5, anomalies: 0 },
    { time: '08:00', health: 91.2, anomalies: 3 },
    { time: '10:00', health: 86.4, anomalies: 5 },
    { time: '12:00', health: stats ? stats.avg_health_index : 84.5, anomalies: 7 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Theme Banner */}
      <div className="glass-panel p-6 border-l-4 border-l-[#FF5E1E] bg-[#161920]/85 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-wide">
              Operational Resilience Command
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#251A14] text-[#FF7A00] border border-[#FF5E1E]/30 uppercase tracking-widest font-semibold">
              Disruption Prevention
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Continuous AI telemetry surveillance and distributed fault diagnostics safeguarding vital municipal, 
            healthcare, manufacturing, and energy infrastructure against catastrophic operational downtime.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onSelectTab('diagnostics')}
            aria-label="Upload Telemetry CSV dataset"
            className="px-4 py-2.5 rounded-xl bg-[#1C2028] text-[#FF9E66] border border-[#FF5E1E]/40 text-xs font-semibold hover:bg-[#252B36] hover:border-[#FF5E1E] min-h-[38px] touch-target-min transition-all flex items-center space-x-2 shadow-md"
          >
            <span>Upload Telemetry CSV</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#FF7A00]" />
          </button>
        </div>
      </div>

      {/* 8 Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Machines */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="View registered fleet in registry"
          onClick={() => onSelectTab('registry')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTab('registry');
            }
          }}
          className="glass-card p-4 hover:border-[#FF5E1E]/40 cursor-pointer transition-all space-y-2 focus:outline-none"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Registered Fleet</span>
            <Server className="w-4 h-4 text-[#FF7A00]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{stats ? stats.total_machines : machines.length}</span>
            <span className="text-[11px] text-emerald-400 font-semibold">100% Active</span>
          </div>
          <p className="text-xs text-slate-400">Across 8 critical categories</p>
        </div>

        {/* Card 2: Healthy Equipment */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="Filter healthy machines in registry"
          onClick={() => onSelectTab('registry')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTab('registry');
            }
          }}
          className="glass-card p-4 hover:border-emerald-500/40 cursor-pointer transition-all space-y-2 focus:outline-none"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Healthy State</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400">{stats ? stats.healthy_machines : 5}</span>
            <span className="text-[11px] text-slate-300 font-mono font-medium">Nominal ISO</span>
          </div>
          <p className="text-xs text-slate-400">Within baseline envelope</p>
        </div>

        {/* Card 3: Warning Tier */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="Filter warning tier machines in registry"
          onClick={() => onSelectTab('registry')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTab('registry');
            }
          }}
          className="glass-card p-4 hover:border-amber-500/40 cursor-pointer transition-all space-y-2 focus:outline-none"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Requires Inspection</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-400">{stats ? stats.warning_machines : 2}</span>
            <span className="text-[11px] text-amber-400/90 font-semibold">Drift Flagged</span>
          </div>
          <p className="text-xs text-slate-400">Statistical anomalies active</p>
        </div>

        {/* Card 4: Critical Disruption Risk */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="Navigate to critical incident command"
          onClick={() => onSelectTab('incidents')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTab('incidents');
            }
          }}
          className="glass-card p-4 hover:border-red-500/40 cursor-pointer transition-all space-y-2 border-l-2 border-l-red-500 focus:outline-none"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-red-300">Critical Incidents</span>
            <AlertOctagon className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-red-400">{stats ? stats.critical_machines : 2}</span>
            <span className="text-[11px] text-red-400 font-bold uppercase font-mono">Immediate Action</span>
          </div>
          <p className="text-xs text-slate-400">Hospital & Turbine alerts</p>
        </div>

        {/* Card 5: Fleet Health Index */}
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Avg Fleet Health</span>
            <Activity className="w-4 h-4 text-[#2FC7A8]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{stats ? stats.avg_health_index : 84.2}%</span>
            <span className="text-[10px] text-slate-400 font-mono">Weighted Mean</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-500 via-amber-400 to-[#2FC7A8] h-full rounded-full transition-all duration-500"
              style={{ width: `${stats ? stats.avg_health_index : 84.2}%` }}
            />
          </div>
        </div>

        {/* Card 6: Distributed AI Workers */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="View distributed AI workers status"
          onClick={() => onSelectTab('distributed')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTab('distributed');
            }
          }}
          className="glass-card p-4 hover:border-[#FF5E1E]/40 cursor-pointer transition-all space-y-2 focus:outline-none"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active AI Workers</span>
            <Cpu className="w-4 h-4 text-[#FF7A00]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#FF7A00]">{stats ? stats.active_workers : 2}</span>
            <span className="text-[10px] text-slate-400 font-mono">Alpha / Beta</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-mono flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            Heartbeat Sync Active
          </p>
        </div>

        {/* Card 7: Queue Depth / Pending Jobs */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="View distributed task queue"
          onClick={() => onSelectTab('distributed')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTab('distributed');
            }
          }}
          className="glass-card p-4 hover:border-[#FF5E1E]/40 cursor-pointer transition-all space-y-2 focus:outline-none"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Task Queue Status</span>
            <Clock className="w-4 h-4 text-[#FF8A3D]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{stats ? stats.pending_jobs + stats.in_flight_jobs : 0}</span>
            <span className="text-[10px] text-slate-400">In-Flight / Queued</span>
          </div>
          <p className="text-[11px] text-slate-500">{stats ? stats.completed_jobs : 32} total jobs executed</p>
        </div>

        {/* Card 8: Open Work Orders */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="View active maintenance work orders"
          onClick={() => onSelectTab('maintenance')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTab('maintenance');
            }
          }}
          className="glass-card p-4 hover:border-amber-500/40 cursor-pointer transition-all space-y-2 focus:outline-none"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Maintenance Orders</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">3 Active</span>
            <span className="text-[10px] text-amber-400">Assigned</span>
          </div>
          <p className="text-[11px] text-slate-500">Prioritized by AI risk score</p>
        </div>
      </div>

      {/* Main Charts & Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fleet Health Timeline Trend */}
        <div className="lg:col-span-8 glass-card p-5 space-y-4 chart-container-optimized">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#FF7A00]" />
                <span>Fleet Aggregate Health Index & Anomaly Stream</span>
              </h3>
              <p className="text-xs text-slate-400">Composite sensor reliability index calculated across monitored industrial assets</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C2028] text-[#FF9E66] border border-[#FF5E1E]/30">
              Live Replay Stream
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5E1E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF5E1E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis domain={[60, 100]} stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161920', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="health" 
                  stroke="#FF5E1E" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#healthGrad)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equipment Category Breakdown Pie */}
        <div className="lg:col-span-4 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#2FC7A8]" />
              <span>Asset Category Coverage</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">8 Profiles</span>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#101827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-300">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center space-x-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Equipment Alerts & Monitored Equipment Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Critical Alerts Stream */}
        <div className="lg:col-span-6 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Active Disruption Threat Alerts</span>
            </h3>
            <button
              onClick={() => onSelectTab('incidents')}
              className="text-xs text-[#FF7A00] hover:text-[#FF9E66] hover:underline flex items-center space-x-1"
            >
              <span>Incident Command</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {alerts.slice(0, 3).map((alert) => (
              <div 
                key={alert.id}
                role="button"
                tabIndex={0}
                aria-label={`View machine telemetry for alert: ${alert.title}`}
                onClick={() => onSelectMachine(alert.machine_id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMachine(alert.machine_id);
                  }
                }}
                className="p-3 rounded-xl bg-[#1C2028] border border-white/5 hover:border-red-500/40 cursor-pointer transition-all space-y-1.5 focus:outline-none"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    alert.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white leading-tight">{alert.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">{alert.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Monitored Machines Roster Highlight */}
        <div className="lg:col-span-6 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Server className="w-4 h-4 text-[#FF7A00]" />
              <span>Primary Infrastructure Assets</span>
            </h3>
            <button
              onClick={() => onSelectTab('registry')}
              className="text-xs text-[#FF7A00] hover:text-[#FF9E66] hover:underline flex items-center space-x-1"
            >
              <span>View All Registry</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {machines.slice(0, 4).map((m) => (
              <div 
                key={m.id}
                role="button"
                tabIndex={0}
                aria-label={`View telemetry details for ${m.name}`}
                onClick={() => onSelectMachine(m.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMachine(m.id);
                  }
                }}
                className="p-3 rounded-xl bg-[#1C2028] border border-white/5 hover:border-[#FF5E1E]/40 cursor-pointer transition-all flex items-center justify-between focus:outline-none"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{m.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 bg-slate-800 rounded">
                      {m.asset_tag}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{m.location_label}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-mono font-bold ${
                    m.health_index >= 90 ? 'text-emerald-400' : m.health_index >= 70 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {m.health_index.toFixed(1)}% Health
                  </span>
                  <span className={`block text-[10px] uppercase font-bold ${
                    m.status === 'HEALTHY' ? 'text-emerald-400' : m.status === 'WARNING' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
