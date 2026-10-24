import {
  Machine, DashboardStats, FleetStatus, MaintenanceTask,
  Incident, AnalysisResult, TelemetryPoint, SampleDataset, AnalysisJob, Alert
} from '../types';

const API_BASE = '/api';

export const api = {
  // Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/demo/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Alerts
  async getAlerts(machineId?: string, severity?: string, status?: string): Promise<Alert[]> {
    const params = new URLSearchParams();
    if (machineId) params.append('machine_id', machineId);
    if (severity) params.append('severity', severity);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/alerts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  // Machines
  async getMachines(category?: string, status?: string, search?: string): Promise<Machine[]> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (status && status !== 'All') params.append('status', status);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/machines?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch machines');
    return res.json();
  },

  async getMachineDetail(id: string): Promise<{ machine: Machine; recent_alerts: any[]; recent_anomalies: any[] }> {
    const res = await fetch(`${API_BASE}/machines/${id}`);
    if (!res.ok) throw new Error('Failed to fetch machine detail');
    return res.json();
  },

  async createMachine(data: Partial<Machine>): Promise<Machine> {
    const res = await fetch(`${API_BASE}/machines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create machine');
    return res.json();
  },

  async updateMachine(id: string, data: Partial<Machine>): Promise<Machine> {
    const res = await fetch(`${API_BASE}/machines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update machine');
    return res.json();
  },

  // Telemetry
  async getTelemetry(machineId: string, timeRange: string = '24h'): Promise<{
    machine_id: string;
    machine_name: string;
    health_index: number;
    status: string;
    telemetry_stream: TelemetryPoint[];
    anomalies: any[];
  }> {
    const res = await fetch(`${API_BASE}/telemetry/${machineId}?time_range=${timeRange}`);
    if (!res.ok) throw new Error('Failed to fetch telemetry');
    return res.json();
  },

  async getSpectralFFT(machineId: string): Promise<{
    fundamental_frequency_hz: number;
    harmonics: Array<{ frequency_hz: number; label: string; amplitude_mms: number; status: string }>;
    iso_10816_vibration_zone: string;
  }> {
    const res = await fetch(`${API_BASE}/telemetry/${machineId}/spectral-fft`);
    if (!res.ok) throw new Error('Failed to fetch spectral FFT data');
    return res.json();
  },

  // Diagnostics & Datasets
  async getSampleDatasets(): Promise<SampleDataset[]> {
    const res = await fetch(`${API_BASE}/diagnostics/sample-datasets`);
    if (!res.ok) throw new Error('Failed to fetch sample datasets');
    return res.json();
  },

  async uploadCSV(machineId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('machine_id', machineId);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/diagnostics/upload-csv`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async submitAnalysisJob(machineId: string, datasetId?: string): Promise<AnalysisJob> {
    const res = await fetch(`${API_BASE}/diagnostics/submit-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId, dataset_id: datasetId })
    });
    if (!res.ok) throw new Error('Failed to submit analysis job');
    return res.json();
  },

  async getJobStatus(jobId: string): Promise<AnalysisJob> {
    const res = await fetch(`${API_BASE}/diagnostics/jobs/${jobId}`);
    if (!res.ok) throw new Error('Failed to fetch job status');
    return res.json();
  },

  async getAnalysisResults(machineId: string): Promise<AnalysisResult & { has_results: boolean }> {
    const res = await fetch(`${API_BASE}/diagnostics/results/${machineId}`);
    if (!res.ok) throw new Error('Failed to fetch analysis results');
    return res.json();
  },

  // Distributed Systems
  async getFleetStatus(): Promise<FleetStatus> {
    const res = await fetch(`${API_BASE}/distributed/status`);
    if (!res.ok) throw new Error('Failed to fetch fleet status');
    return res.json();
  },

  async stopWorker(workerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/distributed/workers/${workerId}/stop`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`Failed to stop worker ${workerId}`);
    return res.json();
  },

  async startWorker(workerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/distributed/workers/${workerId}/start`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`Failed to start worker ${workerId}`);
    return res.json();
  },

  async runDistributedRecoveryDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/distributed/demo/simulate-failure-recovery`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to execute recovery demo');
    return res.json();
  },

  // Maintenance
  async getMaintenanceTasks(status?: string, priority?: string): Promise<MaintenanceTask[]> {
    const params = new URLSearchParams();
    if (status && status !== 'All') params.append('status', status);
    if (priority && priority !== 'All') params.append('priority', priority);

    const res = await fetch(`${API_BASE}/maintenance/tasks?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch maintenance tasks');
    return res.json();
  },

  async createMaintenanceTask(data: Partial<MaintenanceTask>): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/maintenance/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create maintenance task');
    return res.json();
  },

  async updateMaintenanceTask(id: string, data: Partial<MaintenanceTask> & { audit_note?: string }): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/maintenance/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update maintenance task');
    return res.json();
  },

  // Incidents
  async getIncidents(status?: string, severity?: string): Promise<Incident[]> {
    const params = new URLSearchParams();
    if (status && status !== 'All') params.append('status', status);
    if (severity && severity !== 'All') params.append('severity', severity);

    const res = await fetch(`${API_BASE}/incidents?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  },

  async createIncident(data: Partial<Incident>): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create incident');
    return res.json();
  },

  async updateIncident(id: string, data: Partial<Incident> & { timeline_event?: string }): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update incident');
    return res.json();
  },

  // Hackathon Demo Launch
  async launchHackathonDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/launch`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to launch demo');
    return res.json();
  },

  getReportDownloadUrl(machineId: string): string {
    return `${API_BASE}/reports/${machineId}/pdf`;
  },

  // ----------------------------------------------------
  // TENG Sensor Monitoring
  // ----------------------------------------------------
  async getTengBenchmarks(): Promise<import('../types').TengBenchmark[]> {
    const res = await fetch(`${API_BASE}/teng/benchmarks`);
    if (!res.ok) throw new Error('Failed to fetch TENG benchmarks');
    return res.json();
  },

  async getTengTelemetry(machineId: string): Promise<import('../types').TengTelemetryResponse> {
    const res = await fetch(`${API_BASE}/teng/telemetry/${machineId}`);
    if (!res.ok) throw new Error('Failed to fetch TENG telemetry');
    return res.json();
  },

  async uploadTengCSV(machineId: string, file: File, datasetName?: string): Promise<any> {
    const formData = new FormData();
    formData.append('machine_id', machineId);
    formData.append('file', file);
    if (datasetName) formData.append('dataset_name', datasetName);

    const res = await fetch(`${API_BASE}/teng/upload-csv`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload TENG CSV');
    }
    return res.json();
  },

  async analyzeTengBenchmark(machineId: string, benchmarkId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/teng/analyze-benchmark?machine_id=${machineId}&benchmark_id=${benchmarkId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to analyze TENG benchmark');
    return res.json();
  },

  // ----------------------------------------------------
  // AI Image Analysis Platform
  // ----------------------------------------------------
  async getVisionSamples(): Promise<import('../types').VisionSample[]> {
    const res = await fetch(`${API_BASE}/vision/samples`);
    if (!res.ok) throw new Error('Failed to fetch vision samples');
    return res.json();
  },

  async getVerifiedSectors(): Promise<any> {
    const res = await fetch(`${API_BASE}/vision/sectors`);
    if (!res.ok) throw new Error('Failed to fetch verified sectors');
    return res.json();
  },

  async uploadImageInspection(machineId: string, file: File, componentName: string = 'Component', notes?: string): Promise<import('../types').ImageInspection> {
    const formData = new FormData();
    formData.append('machine_id', machineId);
    formData.append('component_name', componentName);
    formData.append('file', file);
    if (notes) formData.append('notes', notes);

    const res = await fetch(`${API_BASE}/vision/inspect`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Image inspection failed');
    }
    return res.json();
  },

  async inspectSampleImage(machineId: string, sampleFilename: string, componentName: string = 'Component'): Promise<import('../types').ImageInspection> {
    const formData = new FormData();
    formData.append('machine_id', machineId);
    formData.append('component_name', componentName);
    formData.append('sample_filename', sampleFilename);

    const res = await fetch(`${API_BASE}/vision/inspect`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Sample image inspection failed');
    }
    return res.json();
  },

  async getImageInspections(machineId: string): Promise<import('../types').ImageInspection[]> {
    const res = await fetch(`${API_BASE}/vision/inspections/${machineId}`);
    if (!res.ok) throw new Error('Failed to fetch image inspections');
    return res.json();
  },

  // ----------------------------------------------------
  // Symbiosis — Multimodal AI Fusion
  // ----------------------------------------------------
  async evaluateSymbiosis(machineId: string): Promise<import('../types').SymbiosisEvaluation> {
    const res = await fetch(`${API_BASE}/symbiosis/evaluate/${machineId}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Symbiosis evaluation failed');
    }
    return res.json();
  },

  async getLatestSymbiosis(machineId: string): Promise<import('../types').SymbiosisEvaluation> {
    const res = await fetch(`${API_BASE}/symbiosis/${machineId}`);
    if (!res.ok) {
      // If not yet evaluated, evaluate on-demand
      return this.evaluateSymbiosis(machineId);
    }
    return res.json();
  },

  // ----------------------------------------------------
  // Symbiosis.AI -- Circular Waste Exchange & Synergy Engine
  // ----------------------------------------------------
  async getSymbiosisMatches(
    companyId: string = 'comp_udyon',
    minScore: number = 60,
    maxDistanceKm: number = 500
  ): Promise<import('../types').SymbiosisMatchesResponse> {
    const params = new URLSearchParams({
      company_id: companyId,
      min_score: minScore.toString(),
      max_distance_km: maxDistanceKm.toString()
    });
    const res = await fetch(`${API_BASE}/symbiosis/marketplace/matches?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch symbiotic matches');
    return res.json();
  },

  async getSymbiosisMaterials(filters?: {
    type?: string;
    category?: string;
    search?: string;
    state?: string;
  }): Promise<{ status: string; count: number; listings: import('../types').SymbiosisMaterialListing[] }> {
    const params = new URLSearchParams();
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.state && filters.state !== 'all') params.append('state', filters.state);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/symbiosis/marketplace/materials${query}`);
    if (!res.ok) throw new Error('Failed to fetch material listings');
    return res.json();
  },

  async createSymbiosisListing(
    data: import('../types').CreateSymbiosisListingPayload
  ): Promise<{ status: string; message: string; listing: import('../types').SymbiosisMaterialListing }> {
    const res = await fetch(`${API_BASE}/symbiosis/marketplace/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to publish material listing');
    }
    return res.json();
  },

  async getSymbiosisImpact(
    companyId: string = 'comp_udyon'
  ): Promise<{ status: string; companyId: string; metrics: import('../types').SymbiosisImpactMetrics }> {
    const res = await fetch(`${API_BASE}/symbiosis/marketplace/impact?company_id=${companyId}`);
    if (!res.ok) throw new Error('Failed to fetch circular impact analytics');
    return res.json();
  },

  async getSymbiosisFactories(): Promise<{
    status: string;
    count: number;
    factories: import('../types').SymbiosisFactoryNode[];
  }> {
    const res = await fetch(`${API_BASE}/symbiosis/marketplace/companies`);
    if (!res.ok) throw new Error('Failed to fetch factory nodes');
    return res.json();
  },

  async getSymbiosisInquiries(): Promise<{
    status: string;
    count: number;
    inquiries: import('../types').SymbiosisTradeInquiry[];
  }> {
    const res = await fetch(`${API_BASE}/symbiosis/marketplace/inquiries`);
    if (!res.ok) throw new Error('Failed to fetch trade inquiries');
    return res.json();
  },

  async createSymbiosisInquiry(
    data: import('../types').CreateSymbiosisInquiryPayload
  ): Promise<{ status: string; message: string; inquiry: import('../types').SymbiosisTradeInquiry }> {
    const res = await fetch(`${API_BASE}/symbiosis/marketplace/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit trade inquiry');
    }
    return res.json();
  },

  // ----------------------------------------------------
  // Final Report Studio & Inspection Verification
  // ----------------------------------------------------
  async updateInspectionDefects(
    inspectionId: string,
    defects: import('../types').ImageDefect[],
    notes?: string,
    reviewerName?: string,
    visualSeverity?: string
  ): Promise<{ status: string; message: string; inspection_id: string; defects: import('../types').ImageDefect[]; annotated_image_url?: string }> {
    const res = await fetch(`${API_BASE}/vision/inspections/${inspectionId}/update-defects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defects,
        notes,
        reviewer_name: reviewerName,
        visual_severity: visualSeverity
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update inspection defects');
    }
    return res.json();
  },

  async getSingleInspection(inspectionId: string): Promise<import('../types').ImageInspection> {
    const res = await fetch(`${API_BASE}/vision/inspection/${inspectionId}`);
    if (!res.ok) throw new Error('Failed to fetch inspection');
    return res.json();
  },

  async getReportBundle(machineId: string, inspectionId?: string): Promise<import('../types').ReportBundle> {
    const query = inspectionId ? `?inspection_id=${inspectionId}` : '';
    const res = await fetch(`${API_BASE}/reports/bundle/${machineId}${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch report bundle');
    }
    return res.json();
  },

  async generateConsolidatedReport(
    payload: import('../types').ConsolidatedReportPayload
  ): Promise<Blob> {
    const res = await fetch(`${API_BASE}/reports/consolidated-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate consolidated PDF report');
    }
    return res.blob();
  }
};


