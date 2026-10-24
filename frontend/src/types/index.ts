export type EquipmentCategory = 
  | 'Industrial Motors'
  | 'Pumps'
  | 'Compressors'
  | 'Medical Equipment'
  | 'Power Turbines'
  | 'Industrial Robots'
  | 'Vehicle Systems'
  | 'Data Center Cooling Equipment';

export type EquipmentStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

export interface Machine {
  id: string;
  name: string;
  category: EquipmentCategory;
  asset_tag: string;
  location_label: string;
  status: EquipmentStatus;
  health_index: number;
  profile_config?: Record<string, any>;
  is_monitored: boolean;
  last_analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TelemetryPoint {
  timestamp: string;
  is_demo?: boolean;
  [key: string]: any;
}

export interface AnomalyItem {
  id?: string;
  timestamp: string;
  anomaly_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  top_influential_sensors?: string[];
  feature_values?: Record<string, any>;
}

export interface FaultHypothesis {
  component: string;
  fault: string;
  confidence: number;
  evidence: string;
}

export interface AnalysisResult {
  id: string;
  job_id: string;
  machine_id: string;
  anomaly_count: number;
  max_anomaly_score: number;
  health_index_evaluated: number;
  baseline_metrics: Record<string, any>;
  feature_importance: Array<{ feature: string; importance: number }>;
  summary: string;
  recommendations: string[];
  fault_hypotheses: FaultHypothesis[];
  created_at: string;
  anomalies?: AnomalyItem[];
}

export interface AnalysisJob {
  id: string;
  machine_id: string;
  dataset_id?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  attempts: number;
  max_attempts: number;
  worker_id?: string;
  idempotency_key: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Alert {
  id: string;
  machine_id: string;
  machine_name?: string;
  anomaly_id?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  title: string;
  description: string;
  readings_snapshot?: Record<string, any>;
  acknowledged_by?: string;
  timestamp: string;
}

export interface MaintenanceTask {
  id: string;
  machine_id: string;
  machine_name?: string;
  alert_id?: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignee: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  risk_score: number;
  due_date?: string;
  audit_trail: Array<{ timestamp: string; user: string; action: string; note: string }>;
  created_at: string;
  completed_at?: string;
}

export interface Incident {
  id: string;
  machine_id: string;
  machine_name?: string;
  category?: string;
  location_label?: string;
  title: string;
  operational_impact: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
  timeline: Array<{ time: string; event: string; actor: string }>;
  recommended_inspections: string[];
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export interface WorkerInstance {
  id: string;
  worker_id: string;
  status: 'ACTIVE' | 'STOPPED' | 'DEAD';
  active_jobs_count: number;
  completed_jobs_count: number;
  failed_jobs_count: number;
  last_heartbeat: string;
  system_info: Record<string, any>;
  is_healthy: boolean;
}

export interface FleetStatus {
  active_workers_count: number;
  total_workers: number;
  workers: WorkerInstance[];
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total_jobs: number;
  };
}

export interface DashboardStats {
  total_machines: number;
  monitored_machines: number;
  healthy_machines: number;
  warning_machines: number;
  critical_machines: number;
  critical_alerts: number;
  avg_health_index: number;
  active_workers: number;
  pending_jobs: number;
  in_flight_jobs: number;
  completed_jobs: number;
  open_incidents: number;
}

export interface SampleDataset {
  id: string;
  name: string;
  filename: string;
  category: string;
  description: string;
  is_synthetic: boolean;
}

// ----------------------------------------------------
// TENG-Based Vibration & Energy Harvesting Telemetry
// ----------------------------------------------------
export interface TengReading {
  timestamp: string;
  voltage_v: number;
  vibration_frequency_hz: number;
  signal_amplitude_vpp: number;
  charge_transfer_nc: number;
  anomaly_score?: number;
  is_anomaly?: boolean;
  fault_flag?: string;
}

export interface TengSummaryMetrics {
  vpp: number;
  vrms: number;
  crest_factor: number;
  dominant_freq_hz: number;
  mean_charge_nc: number;
  kurtosis: number;
}

export interface TengDataset {
  id: string;
  machine_id: string;
  dataset_name: string;
  sample_count: number;
  duration_seconds: number;
  max_anomaly_score: number;
  health_index: number;
  summary_metrics: TengSummaryMetrics;
  fault_flags: string[];
  created_at: string;
}

export interface TengBenchmark {
  id: string;
  name: string;
  file_name: string;
  condition: string;
  description: string;
  expected_freq: number;
  expected_vpp: number;
  expected_anomaly: boolean;
}

export interface TengTelemetryResponse {
  machine_id: string;
  source: string;
  sample_count: number;
  health_index: number;
  summary_metrics: TengSummaryMetrics;
  max_anomaly_score: number;
  fault_flags: string[];
  readings: TengReading[];
}

// ----------------------------------------------------
// AI Image Analysis Platform
// ----------------------------------------------------
export interface ImageDefect {
  id?: string;
  defect_type: 'crack' | 'corrosion' | 'wear_spalling' | 'loose_mount_gap' | string;
  label: string;
  type?: string;
  confidence: number;
  is_confirmed: boolean;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  bbox_xywh?: [number, number, number, number];
  normalized_bbox?: [number, number, number, number];
  polygon?: Array<[number, number]>;
  svg_path?: string;
  has_segmentation_mask?: boolean;
  area_pct: number;
  coverage_pct?: number;
  area_pixels?: number;
  description: string;
  classification?: string;
  severity?: 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'LOW' | string;
  physical_indicator?: string;
  recommendation?: string;
}

export interface DeepClassification {
  available: boolean;
  model_name?: string;
  dataset_provenance?: string;
  license?: string;
  predicted_defect?: string;
  predicted_label?: string;
  confidence?: number;
  confidence_pct?: number;
  is_confirmed?: boolean;
  classification_status?: 'CONFIRMED_OBSERVATION' | 'UNCERTAIN_PREDICTION';
  uncertainty_score?: number;
  normalized_entropy?: number;
  class_probabilities?: Record<string, number>;
  error?: string;
}

export interface DeepCrackClassification {
  available: boolean;
  model_name?: string;
  dataset_provenance?: string;
  predicted_class?: 'structural_crack' | 'sound_surface';
  predicted_label?: string;
  crack_probability?: number;
  sound_probability?: number;
  confidence?: number;
  confidence_pct?: number;
  is_confirmed?: boolean;
  classification_status?: 'CONFIRMED_OBSERVATION' | 'UNCERTAIN_PREDICTION';
  normalized_entropy?: number;
  accuracy_tier?: string;
  error?: string;
}

export interface ImageInspection {
  id: string;
  machine_id: string;
  component_name: string;
  raw_image_url: string;
  annotated_image_url: string;
  defects: ImageDefect[];
  defect_count: number;
  visual_condition_score: number;
  visual_severity: 'NEGLIGIBLE' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  deep_classification?: DeepClassification;
  deep_crack_classification?: DeepCrackClassification;
  notes?: string;
  created_at: string;
}

export interface VisionSample {
  id: string;
  name: string;
  filename: string;
  component: string;
  sector?: string;
  description: string;
  expected_defects: string[];
  expected_severity: string;
}

// ----------------------------------------------------
// Symbiosis — Multimodal AI Fusion
// ----------------------------------------------------
export interface AttributionBreakdown {
  teng_sensor_pct: number;
  visual_inspection_pct: number;
  machine_history_pct: number;
}

export interface CrossModalCorrelation {
  correlation_type: string;
  signal: string;
  visual_defect: string;
  significance: string;
  explanation: string;
}

export interface RecommendedAction {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  action: string;
  timeframe: string;
}

export interface SymbiosisEvaluation {
  id?: string;
  evaluation_id?: string;
  machine_id: string;
  machine_name: string;
  composite_health_index: number;
  overall_severity: 'HEALTHY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  primary_fault_cause: string;
  confidence_score: number;
  attribution_breakdown: AttributionBreakdown;
  teng_vector: Record<string, any>;
  vision_vector: Record<string, any>;
  history_vector: Record<string, any>;
  cross_modal_correlations: CrossModalCorrelation[];
  recommended_actions: RecommendedAction[];
  created_at: string;
}

// ----------------------------------------------------
// Symbiosis.AI -- Circular Waste Exchange & Synergy Engine
// ----------------------------------------------------
export interface SymbiosisMaterialPricing {
  amount: number;
  unit: string;
  type: string;
}

export interface SymbiosisMaterialQuality {
  purity?: number;
  moisture?: number;
  grade?: string;
  contaminants?: string;
}

export interface SymbiosisCoordinates {
  latitude: number;
  longitude: number;
}

export interface SymbiosisMaterialListing {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  city: string;
  state: string;
  coordinates: SymbiosisCoordinates;
  type: 'waste' | 'requirement';
  materialType: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  quality: SymbiosisMaterialQuality;
  hazardous: 'hazardous' | 'non-hazardous';
  availability: 'continuous' | 'one-time' | 'periodic';
  pricing: SymbiosisMaterialPricing;
  verified: boolean;
  views: number;
  inquiries: number;
  createdAt: string;
}

export interface SymbiosisEnvironmentalImpact {
  co2SavedTons: number;
  landfillDivertedTons: number;
  waterSavedKL: number;
  energySavedGJ: number;
}

export interface SymbiosisSynergyMatch {
  matchId: string;
  companyId: string;
  companyName: string;
  industryType: string;
  city: string;
  state: string;
  distanceKm: number;
  matchScore: number;
  matchFactors: string[];
  producerMaterial: {
    materialType: string;
    category: string;
    quantity: number;
    unit: string;
    pricing: SymbiosisMaterialPricing;
  };
  consumerRequirement: {
    materialType: string;
    category: string;
    quantity: number;
    unit: string;
  };
  environmentalImpact: SymbiosisEnvironmentalImpact;
  estimatedAnnualSavingsINR: number;
  synergyType: 'outbound_byproduct' | 'inbound_feedstock';
}

export interface SymbiosisMatchesResponse {
  status: string;
  companyId: string;
  companyName: string;
  totalMatches: number;
  producedWasteMatches: SymbiosisSynergyMatch[];
  requiredMaterialMatches: SymbiosisSynergyMatch[];
}

export interface SymbiosisImpactMetrics {
  totalMaterialsExchangedTons: number;
  landfillDivertedTons: number;
  co2EmissionsAvoidedTons: number;
  waterConservedKiloliters: number;
  energyConservedGJ: number;
  totalCostSavingsINR: number;
  circularityIndexPct: number;
  categoryBreakdown: { category: string; tonnage: number; percentage: number }[];
  monthlyTrends: { month: string; exchangedTons: number; co2SavedTons: number; savingsLakhs: number }[];
}

export interface SymbiosisFactoryNode {
  id: string;
  companyName: string;
  industryType: string;
  city: string;
  state: string;
  coordinates: SymbiosisCoordinates;
  verified: boolean;
  materialsExchanged: string[];
}

export interface SymbiosisTradeInquiry {
  id: string;
  listingId: string;
  materialTitle: string;
  buyerCompanyId: string;
  buyerCompanyName: string;
  sellerCompanyId: string;
  sellerCompanyName: string;
  quantityRequested: number;
  unit: string;
  offeredPrice: number;
  status: 'PROPOSED' | 'NEGOTIATING' | 'ACCEPTED' | 'IN_TRANSIT' | 'COMPLETED';
  logisticsType: string;
  latestMessage: string;
  updatedAt: string;
}

export interface CreateSymbiosisListingPayload {
  title: string;
  companyId?: string;
  companyName?: string;
  city?: string;
  state?: string;
  type: 'waste' | 'requirement';
  materialType: string;
  category: string;
  description: string;
  quantity: number;
  unit?: string;
  quality?: SymbiosisMaterialQuality;
  hazardous?: string;
  availability?: string;
  pricing?: SymbiosisMaterialPricing;
}

export interface CreateSymbiosisInquiryPayload {
  listingId: string;
  buyerCompanyId?: string;
  buyerCompanyName?: string;
  quantityRequested: number;
  unit?: string;
  offeredPrice: number;
  logisticsType?: string;
  initialMessage: string;
}

// ----------------------------------------------------
// Final Report Studio & Consolidated Reports
// ----------------------------------------------------
export interface ReportBundle {
  status: string;
  machine: Machine;
  selected_inspection?: ImageInspection & { defects: ImageDefect[] };
  inspections_history: Array<{
    id: string;
    component_name: string;
    defect_count: number;
    confirmed_count: number;
    visual_severity: string;
    visual_condition_score: number;
    created_at?: string;
    filename: string;
  }>;
  teng_telemetry: {
    dataset_id?: string;
    filename: string;
    metrics: Record<string, number>;
    chart_samples: Array<{ time: number; voltage: number; frequency: number }>;
    health_index: number;
    fault_flags: string[];
  };
  symbiosis: {
    id?: string;
    composite_health_index: number;
    overall_severity: string;
    primary_fault_cause: string;
    confidence_score: number;
    attribution_breakdown: Record<string, number>;
    cross_modal_correlations: Array<{ signal: string; visual: string; correlation: number }>;
    recommended_actions: string[];
  };
  alerts: Alert[];
  maintenance_tasks: MaintenanceTask[];
  integrity_check: {
    has_machine: boolean;
    has_inspection: boolean;
    has_teng: boolean;
    has_symbiosis: boolean;
    is_complete: boolean;
    missing_streams: string[];
    notes: string;
  };
}

export interface ConsolidatedReportPayload {
  machine_id: string;
  inspection_id?: string;
  reviewer_name?: string;
  reviewer_title?: string;
  signoff_status?: string;
  executive_notes?: string;
  priority_override?: string;
}



