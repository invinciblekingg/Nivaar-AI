from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

# Machine Schemas
class MachineBase(BaseModel):
    name: str
    category: str
    asset_tag: str
    location_label: str
    status: str = "HEALTHY"
    health_index: float = 100.0
    profile_config: Dict[str, Any] = Field(default_factory=dict)
    is_monitored: bool = True

class MachineCreate(MachineBase):
    pass

class MachineUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    location_label: Optional[str] = None
    status: Optional[str] = None
    health_index: Optional[float] = None
    profile_config: Optional[Dict[str, Any]] = None
    is_monitored: Optional[bool] = None

class MachineResponse(MachineBase):
    id: str
    last_analyzed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Sensor Reading Schemas
class SensorReadingBase(BaseModel):
    machine_id: str
    timestamp: datetime
    sensor_type: str
    value: float
    unit: str
    source: str = "REAL"

class SensorReadingCreate(SensorReadingBase):
    pass

class SensorReadingResponse(SensorReadingBase):
    id: str
    class Config:
        from_attributes = True

# Dataset Schemas
class UploadedDatasetResponse(BaseModel):
    id: str
    machine_id: str
    filename: str
    row_count: int
    sensor_columns: List[str]
    is_synthetic: bool
    provenance: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Analysis Job Schemas
class JobSubmitRequest(BaseModel):
    machine_id: str
    dataset_id: Optional[str] = None
    idempotency_key: Optional[str] = None

class AnalysisJobResponse(BaseModel):
    id: str
    machine_id: str
    dataset_id: Optional[str] = None
    status: str
    attempts: int
    max_attempts: int
    worker_id: Optional[str] = None
    idempotency_key: str
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Anomaly & Results Schemas
class AnomalyResponse(BaseModel):
    id: str
    timestamp: datetime
    anomaly_score: float
    severity: str
    description: str
    top_influential_sensors: List[str]
    feature_values: Dict[str, Any]
    
    class Config:
        from_attributes = True

class AnalysisResultResponse(BaseModel):
    id: str
    job_id: str
    machine_id: str
    dataset_id: Optional[str] = None
    anomaly_count: int
    max_anomaly_score: float
    health_index_evaluated: float
    baseline_metrics: Dict[str, Any]
    feature_importance: List[Dict[str, Any]]
    summary: str
    recommendations: List[str]
    fault_hypotheses: List[Dict[str, Any]]
    created_at: datetime
    anomalies: List[AnomalyResponse] = []
    
    class Config:
        from_attributes = True

# Alerts
class AlertResponse(BaseModel):
    id: str
    machine_id: str
    machine_name: Optional[str] = None
    anomaly_id: Optional[str] = None
    severity: str
    status: str
    title: str
    description: str
    readings_snapshot: Dict[str, Any]
    acknowledged_by: Optional[str] = None
    timestamp: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AlertUpdate(BaseModel):
    status: Optional[str] = None # ACKNOWLEDGED, RESOLVED
    acknowledged_by: Optional[str] = None

# Maintenance Tasks
class MaintenanceTaskCreate(BaseModel):
    machine_id: str
    alert_id: Optional[str] = None
    title: str
    description: str
    priority: str = "HIGH"
    assignee: str = "Lead Maintenance Tech"
    risk_score: float = 70.0
    due_date: Optional[datetime] = None

class MaintenanceTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    audit_note: Optional[str] = None

class MaintenanceTaskResponse(BaseModel):
    id: str
    machine_id: str
    machine_name: Optional[str] = None
    alert_id: Optional[str] = None
    title: str
    description: str
    priority: str
    assignee: str
    status: str
    risk_score: float
    due_date: Optional[datetime] = None
    audit_trail: List[Dict[str, Any]]
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Incidents
class IncidentCreate(BaseModel):
    machine_id: str
    title: str
    operational_impact: str
    severity: str = "CRITICAL"
    recommended_inspections: List[str] = Field(default_factory=list)

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    resolution_notes: Optional[str] = None
    timeline_event: Optional[str] = None

class IncidentResponse(BaseModel):
    id: str
    machine_id: str
    machine_name: Optional[str] = None
    title: str
    operational_impact: str
    severity: str
    status: str
    timeline: List[Dict[str, Any]]
    recommended_inspections: List[str]
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Worker & Distributed Schemas
class WorkerHeartbeatReport(BaseModel):
    worker_id: str
    status: str
    active_jobs_count: int = 0
    completed_jobs_count: int = 0
    failed_jobs_count: int = 0
    system_info: Dict[str, Any] = Field(default_factory=dict)

class WorkerStatusResponse(BaseModel):
    id: str
    worker_id: str
    status: str
    active_jobs_count: int
    completed_jobs_count: int
    failed_jobs_count: int
    last_heartbeat: datetime
    system_info: Dict[str, Any]
    is_healthy: bool
    
    class Config:
        from_attributes = True

# Dashboard Stats
class DashboardStatsResponse(BaseModel):
    total_machines: int
    monitored_machines: int
    healthy_machines: int
    warning_machines: int
    critical_machines: int
    critical_alerts: int
    avg_health_index: float
    active_workers: int
    pending_jobs: int
    in_flight_jobs: int
    completed_jobs: int
    open_incidents: int
