import React from 'react';
import { 
  ShieldAlert, Activity, Cpu, Download, Bell, 
  CheckCircle2, AlertTriangle, Layers, Flame, Menu, X
} from 'lucide-react';
import { DashboardStats } from '../types';

interface NavbarProps {
  stats: DashboardStats | null;
  onLaunchDemo?: () => void;
  isDemoRunning?: boolean;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  stats, 
  onLaunchDemo, 
  isDemoRunning,
  isMobileMenuOpen = false,
  onToggleMobileMenu
}) => {
  return (
    <header className="h-16 border-b border-[rgba(255,255,255,0.08)] bg-[#14171D] sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center space-x-3">
        {/* Navigation Drawer / Sidebar Toggle */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Toggle navigation menu"}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-[#1B1F27] border border-white/10 hover:border-[#FF5E1E]/50 touch-target-min transition-all cursor-pointer flex items-center justify-center shadow-sm active:scale-95"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-[#FF7A00]" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        )}

        <img 
          src="/udyon_logo.jpg" 
          alt="Udyon Logo" 
          className="w-10 h-10 rounded-xl object-cover border border-[#FF5E1E]/40 shadow-[0_0_15px_rgba(255,94,30,0.4)] shrink-0"
        />
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base sm:text-lg tracking-wider text-white">UD<span className="text-[#FF5E1E]">YON</span></span>
            <span className="text-[11px] uppercase font-semibold px-2 py-0.5 rounded bg-[#FF5E1E]/15 text-[#FF7A00] border border-[#FF5E1E]/30 tracking-widest font-mono hidden sm:inline-block">
              Multimodal AI & TENG
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium hidden sm:block">Predict Failures. Prevent Disruptions.</p>
        </div>
      </div>

      {/* Real-time Status Badges & Demo Trigger */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Distributed Fleet Status Pill */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#1B1F27] border border-[rgba(255,255,255,0.08)] text-xs text-slate-300">
          <Cpu className="w-4 h-4 text-[#FF7A00]" />
          <span>Distributed Fleet:</span>
          <span className="flex items-center text-emerald-400 font-medium font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] mr-1.5 inline-block" />
            {stats ? `${stats.active_workers} Active Workers` : '2 Active Workers'}
          </span>
        </div>

        {/* Critical Alerts Pill */}
        {stats && stats.critical_alerts > 0 && (
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{stats.critical_alerts} Critical Alerts</span>
          </div>
        )}
      </div>
    </header>
  );
};
