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

import { api } from './services/api';
import { DashboardStats, Machine, Alert } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('m-motor-104');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const fetchGlobalData = async () => {
    try {
      const [statsRes, machinesRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getMachines().catch(() => [])
      ]);
      if (statsRes) setStats(statsRes);
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
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setMobileMenuOpen(false);
          }}
          openIncidentsCount={stats?.open_incidents || 1}
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
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
              />
            )}

            {currentTab === 'symbiosis' && (
              <SymbiosisPage
                machines={machines}
                selectedMachineId={selectedMachineId}
                onSelectMachine={setSelectedMachineId}
              />
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
