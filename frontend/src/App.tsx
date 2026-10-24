import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { HackathonDemoModal } from './components/HackathonDemoModal';
import { OverviewPage } from './pages/OverviewPage';
import { MachineRegistryPage } from './pages/MachineRegistryPage';
import { MachineDetailPage } from './pages/MachineDetailPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { ComponentExplorerPage } from './pages/ComponentExplorerPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { DistributedSystemsPage } from './pages/DistributedSystemsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { TengMonitoringPage } from './pages/TengMonitoringPage';
import { ImageAnalysisPage } from './pages/ImageAnalysisPage';
import { SymbiosisPage } from './pages/SymbiosisPage';
import { FinalReportStudioPage } from './pages/FinalReportStudioPage';

import { api } from './services/api';
import { DashboardStats, Machine, Alert } from './types';
import { 
  subscribeToMachines, subscribeToAlerts, 
  subscribeToMaintenanceTasks, subscribeToIncidents 
} from './services/supabase';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('m-motor-104');
  const [targetInspectionId, setTargetInspectionId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const handleToggleMenu = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarCollapsed(prev => !prev);
    } else {
      setMobileMenuOpen(prev => !prev);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchGlobalData = async () => {
    try {
      const [statsRes, machinesRes, alertsRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getMachines().catch(() => []),
        api.getAlerts().catch(() => [])
      ]);
      if (statsRes) setStats(statsRes);
      if (Array.isArray(alertsRes) && alertsRes.length > 0) setAlerts(alertsRes);
      if (machinesRes && machinesRes.length > 0) {
        setMachines(machinesRes);
        if (!selectedMachineId) {
          setSelectedMachineId(machinesRes[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching global telemetry data:', e);
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Supabase Real-Time Channel Subscriptions
  useEffect(() => {
    const unsubMachines = subscribeToMachines((payload) => {
      console.log('[Supabase Realtime] Machine state updated:', payload);
      fetchGlobalData();
    });

    const unsubAlerts = subscribeToAlerts((payload) => {
      console.log('[Supabase Realtime] New alert event:', payload);
      fetchGlobalData();
    });

    const unsubTasks = subscribeToMaintenanceTasks((payload) => {
      console.log('[Supabase Realtime] Maintenance task update:', payload);
      fetchGlobalData();
    });

    const unsubIncidents = subscribeToIncidents((payload) => {
      console.log('[Supabase Realtime] Incident event:', payload);
      fetchGlobalData();
    });

    return () => {
      unsubMachines();
      unsubAlerts();
      unsubTasks();
      unsubIncidents();
    };
  }, []);

  // WebSocket Live Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          console.log('[WebSocket] Connected to MachineGuard AI Live Telemetry Gateway');
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'ALERT_TRIGGERED' || msg.type === 'JOB_STATUS_UPDATE') {
              fetchGlobalData();
            }
          } catch (e) {
            // ping/pong text
          }
        };
        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 3000);
        };
      } catch (e) {
        reconnectTimeout = setTimeout(connectWs, 5000);
      }
    };

    connectWs();
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleSelectMachine = (id: string) => {
    setSelectedMachineId(id);
    setCurrentTab('telemetry');
  };

  const handleLaunchDemo = () => {
    setIsDemoModalOpen(true);
  };

  return (
    <div className="min-h-screen industrial-ambient-bg text-slate-100 flex flex-col font-sans selection:bg-[#FF5E1E] selection:text-white">
      {/* Screen Reader Live Telemetry & Alarm Announcer (WCAG 4.1.3) */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {stats ? `Fleet telemetry updated. ${stats.active_workers} workers active. ${stats.critical_alerts} critical alerts, ${stats.warning_machines} warnings.` : 'MachineGuard AI loading telemetry.'}
      </div>

      {/* Top Enterprise Header */}
      <Navbar
        stats={stats}
        onLaunchDemo={handleLaunchDemo}
        isDemoRunning={isDemoRunning}
        isMobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={handleToggleMenu}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'symbiosis') {
              window.location.href = 'https://symbiosis-ai.onrender.com/';
              return;
            }
            setCurrentTab(tab);
            setMobileMenuOpen(false);
          }}
          openIncidentsCount={stats?.open_incidents || 1}
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          isCollapsed={sidebarCollapsed}
        />

        {/* Primary Page Canvas */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-transparent">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentTab === 'overview' && (
              <OverviewPage
                stats={stats}
                machines={machines}
                alerts={alerts}
                onSelectTab={setCurrentTab}
                onSelectMachine={handleSelectMachine}
              />
            )}

            {currentTab === 'registry' && (
              <MachineRegistryPage
                machines={machines}
                onSelectMachine={handleSelectMachine}
                onRefresh={fetchGlobalData}
              />
            )}

            {currentTab === 'telemetry' && (
              <MachineDetailPage
                machineId={selectedMachineId}
                onBack={() => setCurrentTab('overview')}
                onNavigateDiagnostics={() => setCurrentTab('diagnostics')}
              />
            )}

            {currentTab === 'diagnostics' && (
              <DiagnosticsPage
                machines={machines}
                selectedMachineId={selectedMachineId}
                onSelectMachine={setSelectedMachineId}
              />
            )}

            {currentTab === 'explorer' && (
              <ComponentExplorerPage />
            )}

            {currentTab === 'maintenance' && (
              <MaintenancePage
                machines={machines}
              />
            )}

            {currentTab === 'distributed' && (
              <DistributedSystemsPage />
            )}

            {currentTab === 'incidents' && (
              <IncidentsPage
                machines={machines}
                onSelectMachine={handleSelectMachine}
              />
            )}

            {currentTab === 'teng' && (
              <TengMonitoringPage
                machines={machines}
                selectedMachineId={selectedMachineId}
                onSelectMachine={setSelectedMachineId}
              />
            )}

            {currentTab === 'vision' && (
              <ImageAnalysisPage
                machines={machines}
                selectedMachineId={selectedMachineId}
                onSelectMachine={setSelectedMachineId}
                onNavigateToReportStudio={(machineId, inspectionId) => {
                  setSelectedMachineId(machineId);
                  setTargetInspectionId(inspectionId);
                  setCurrentTab('report-studio');
                }}
              />
            )}

            {currentTab === 'report-studio' && (
              <FinalReportStudioPage
                machines={machines}
                selectedMachineId={selectedMachineId}
                initialInspectionId={targetInspectionId || undefined}
                onSelectMachine={setSelectedMachineId}
              />
            )}

            {currentTab === 'symbiosis' && (
              (() => {
                if (typeof window !== 'undefined') {
                  window.location.href = 'https://symbiosis-ai.onrender.com/';
                }
                return (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <div className="w-10 h-10 border-2 border-[#FF5E1E] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-300">Redirecting to Symbiosis AI...</p>
                  </div>
                );
              })()
            )}
          </div>
        </main>
      </div>

      {/* 10-Step Interactive Hackathon Demo Modal */}
      <HackathonDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onDemoCompleted={() => {
          fetchGlobalData();
        }}
      />
    </div>
  );
}

export default App;
