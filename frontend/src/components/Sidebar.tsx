import React from 'react';
import { createPortal } from 'react-dom';
import { 
  LayoutDashboard, Server, Activity, Brain, 
  Layers, Wrench, Network, AlertOctagon,
  Zap, Camera, Sparkles, X
} from 'lucide-react';

export type NavTab = 
  | 'overview'
  | 'registry'
  | 'telemetry'
  | 'diagnostics'
  | 'explorer'
  | 'maintenance'
  | 'distributed'
  | 'incidents'
  | 'teng'
  | 'vision'
  | 'symbiosis';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openIncidentsCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onSelectTab, 
  openIncidentsCount,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false
}) => {
  const multimodalItems = [
    { id: 'teng' as NavTab, label: 'TENG Sensors', icon: Zap, badge: 'IoT Waveform', glow: 'text-[#FF5E1E]' },
    { id: 'vision' as NavTab, label: 'AI Vision Platform', icon: Camera, badge: 'CV Defects', glow: 'text-[#FF8A3D]' },
    { id: 'symbiosis' as NavTab, label: 'Symbiosis AI Fusion', icon: Sparkles, badge: 'Multimodal', glow: 'text-[#FFA15C]' },
  ];

  const mainMenuItems = [
    { id: 'overview' as NavTab, label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'registry' as NavTab, label: 'Machine Registry', icon: Server, badge: '8 Types' },
    { id: 'telemetry' as NavTab, label: 'Machine Telemetry', icon: Activity },
    { id: 'diagnostics' as NavTab, label: 'AI Diagnostics', icon: Brain },
    { id: 'explorer' as NavTab, label: 'Component Explorer', icon: Layers, badge: 'Digital Twin' },
    { id: 'maintenance' as NavTab, label: 'Predictive Maintenance', icon: Wrench },
    { id: 'distributed' as NavTab, label: 'Distributed Systems', icon: Network, badge: 'Mandatory' },
    { id: 'incidents' as NavTab, label: 'Disruption Response', icon: AlertOctagon, count: openIncidentsCount },
  ];

  const handleTabClick = (tabId: NavTab) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderNavBody = (collapsed: boolean = false) => (
    <div className="flex flex-col justify-between h-full min-h-full">
      <div className={`${collapsed ? 'p-2' : 'p-4'} space-y-6`}>
        {/* MULTIMODAL AI & SENSORS SECTION */}
        <div>
          {!collapsed ? (
            <div className="text-[11px] font-bold text-[#FF5E1E] uppercase tracking-wider px-3 mb-2.5 flex items-center justify-between">
              <span>Multimodal AI & TENG</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#FF5E1E]/20 text-[#FF7A00] border border-[#FF5E1E]/30 uppercase">
                LIVE
              </span>
            </div>
          ) : (
            <div className="h-px bg-white/10 my-2" />
          )}

          <nav className="space-y-1.5">
            {multimodalItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3.5'} py-3 rounded-xl text-xs font-medium min-h-[44px] touch-target-min transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF5E1E]/20 via-[#FF5E1E]/10 to-transparent text-[#FF5E1E] border-l-2 border-[#FF5E1E] font-bold shadow-[inset_4px_0_12px_rgba(255,94,30,0.15)]'
                      : 'text-slate-300 hover:text-white hover:bg-[#1E222B]/70'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? item.glow : 'text-slate-400'}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && item.badge && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border font-mono ${
                      isActive 
                        ? 'bg-[#FF5E1E]/20 text-[#FF8A3D] border-[#FF5E1E]/40' 
                        : 'bg-[#1C2028] text-slate-300 border-slate-700/60'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* CORE OPERATIONS */}
        <div>
          {!collapsed ? (
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2.5">
              Operations & Fleet
            </div>
          ) : (
            <div className="h-px bg-white/10 my-2" />
          )}

          <nav className="space-y-1.5">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${collapsed ? 'justify-center px-2 relative' : 'justify-between px-3.5'} py-3 rounded-xl text-xs font-medium min-h-[44px] touch-target-min transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF5E1E]/20 via-[#FF5E1E]/10 to-transparent text-[#FF5E1E] border-l-2 border-[#FF5E1E] font-bold shadow-[inset_4px_0_12px_rgba(255,94,30,0.15)]'
                      : 'text-slate-300 hover:text-white hover:bg-[#1E222B]/70'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FF5E1E]' : 'text-slate-400'}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && item.badge && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#1C2028] text-slate-300 border border-slate-700/60 font-mono">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`${collapsed ? 'absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500' : 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white font-mono'}`}>
                      {!collapsed ? item.count : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Distributed Architecture Indicator Card */}
        {!collapsed && (
          <div className="p-4 rounded-xl bg-[#1A1E26] border border-[rgba(255,255,255,0.08)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Cluster Architecture</span>
              <span className="text-[11px] font-mono text-[#FF7A00] font-bold">SYNCED</span>
            </div>
            <div className="text-xs text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Task Queue:</span>
                <span className="text-slate-200 font-mono">Redis Broker</span>
              </div>
              <div className="flex justify-between">
                <span>Workers:</span>
                <span className="text-slate-200 font-mono">2 Active (Alpha/Beta)</span>
              </div>
              <div className="flex justify-between">
                <span>Recovery:</span>
                <span className="text-emerald-400 font-mono">Auto-Lease</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-[rgba(255,255,255,0.08)] text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Nivaar AI Decision-Support</p>
          <p className="leading-relaxed text-[11px] text-slate-400">
            Advisory output only. Never executes automated machinery shutdowns without human inspection.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className={`hidden lg:flex ${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-200 border-r border-[rgba(255,255,255,0.08)] bg-[#14171D] flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]`}>
        {renderNavBody(isCollapsed)}
      </aside>

      {/* Mobile Slide-Over Navigation Sheet (Portaled to document.body) */}
      {isMobileOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          
          {/* Slide-over sheet */}
          <aside 
            className="relative w-72 max-w-[85vw] bg-[#14171D] border-r border-[rgba(255,255,255,0.15)] shadow-2xl z-[101] flex flex-col justify-between overflow-y-auto h-full"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            {/* Header with Title and explicit Close button */}
            <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#1B1F27]">
              <div className="flex items-center space-x-2.5">
                <img src="/nivaar_logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-bold text-sm tracking-wider text-white">NIVAAR <span className="text-[#FF5E1E]">AI</span></span>
              </div>
              <button
                onClick={onCloseMobile}
                aria-label="Close navigation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-[#FF5E1E]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {renderNavBody(false)}
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
};
