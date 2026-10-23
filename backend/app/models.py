import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=True)
    role = Column(String(32), default="engineer") # admin, engineer, operator
    created_at = Column(DateTime, default=datetime.utcnow)

class Machine(Base):
    __tablename__ = "machines"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(120), nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True) 
    # Industrial Motors, Pumps, Compressors, Medical Equipment, Power Turbines, Industrial Robots, Vehicle Systems, Data Center Cooling Equipment
    asset_tag = Column(String(64), unique=True, nullable=False, index=True)
    location_label = Column(String(120), nullable=False)
    status = Column(String(32), default="HEALTHY", index=True) # HEALTHY, WARNING, CRITICAL, OFFLINE
    health_index = Column(Float, default=98.5) # 0 to 100
    profile_config = Column(JSON, default=dict) # expected sensors, baseline bounds, nominal RPM/pressure
    is_monitored = Column(Boolean, default=True)
    last_analyzed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sensor_readings = relationship("SensorReading", back_populates="machine", cascade="all, delete-orphan")
    datasets = relationship("UploadedDataset", back_populates="machine", cascade="all, delete-orphan")
    analysis_jobs = relationship("AnalysisJob", back_populates="machine", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="machine", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="machine", cascade="all, delete-orphan")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="machine", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="machine", cascade="all, delete-orphan")

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    sensor_type = Column(String(64), nullable=False, index=True) # vibration, temperature, current, pressure, acoustic
    value = Column(Float, nullable=False)
    unit = Column(String(32), nullable=False)
    source = Column(String(32), default="REAL") # REAL, SYNTHETIC_DEMO, REPLAY
    
    machine = relationship("Machine", back_populates="sensor_readings")
    
    __table_args__ = (
        Index("idx_reading_machine_time", "machine_id", "timestamp"),
        Index("idx_reading_type_time", "sensor_type", "timestamp"),
    )

class UploadedDataset(Base):
    __tablename__ = "uploaded_datasets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    row_count = Column(Integer, default=0)
    sensor_columns = Column(JSON, default=list)
    is_synthetic = Column(Boolean, default=False)
    provenance = Column(String(255), default="Manual CSV Ingestion")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    machine = relationship("Machine", back_populates="datasets")
    jobs = relationship("AnalysisJob", back_populates="dataset", cascade="all, delete-orphan")

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    dataset_id = Column(String(36), ForeignKey("uploaded_datasets.id"), nullable=True, index=True)
    status = Column(String(32), default="PENDING", index=True) # PENDING, PROCESSING, COMPLETED, FAILED, RETRYING
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    worker_id = Column(String(64), nullable=True, index=True)
    idempotency_key = Column(String(128), unique=True, nullable=False, index=True)
    lease_expires_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    machine = relationship("Machine", back_populates="analysis_jobs")
    dataset = relationship("UploadedDataset", back_populates="jobs")
    result = relationship("AnalysisResult", back_populates="job", uselist=False, cascade="all, delete-orphan")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("analysis_jobs.id"), nullable=False, unique=True, index=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    dataset_id = Column(String(36), ForeignKey("uploaded_datasets.id"), nullable=True)
    anomaly_count = Column(Integer, default=0)
    max_anomaly_score = Column(Float, default=0.0)
    health_index_evaluated = Column(Float, default=100.0)
    baseline_metrics = Column(JSON, default=dict)
    feature_importance = Column(JSON, default=list) # [{feature: "vibration_rms", importance: 0.42}]
    summary = Column(Text, nullable=False)
    recommendations = Column(JSON, default=list) # ["Inspect drive-end bearing", "Verify lubrication"]
    fault_hypotheses = Column(JSON, default=list) # [{component: "Bearings", fault: "Outer Race Fluting", probability: 0.78}]
    created_at = Column(DateTime, default=datetime.utcnow)
    
    job = relationship("AnalysisJob", back_populates="result")
    machine = relationship("Machine", back_populates="analysis_results")
    anomalies = relationship("Anomaly", back_populates="result", cascade="all, delete-orphan")

class Anomaly(Base):
    __tablename__ = "anomalies"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    result_id = Column(String(36), ForeignKey("analysis_results.id"), nullable=False, index=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    anomaly_score = Column(Float, nullable=False) # e.g. 0.0 to 1.0 (higher = more anomalous)
    feature_values = Column(JSON, default=dict)
    top_influential_sensors = Column(JSON, default=list)
    severity = Column(String(32), default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    result = relationship("AnalysisResult", back_populates="anomalies")
    machine = relationship("Machine", back_populates="anomalies")
    alerts = relationship("Alert", back_populates="anomaly", cascade="all, delete-orphan")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    anomaly_id = Column(String(36), ForeignKey("anomalies.id"), nullable=True, index=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    severity = Column(String(32), default="HIGH", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(32), default="NEW", index=True) # NEW, ACKNOWLEDGED, RESOLVED
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    readings_snapshot = Column(JSON, default=dict)
    acknowledged_by = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    
    anomaly = relationship("Anomaly", back_populates="alerts")
    machine = relationship("Machine", back_populates="alerts")
    tasks = relationship("MaintenanceTask", back_populates="alert")

class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    alert_id = Column(String(36), ForeignKey("alerts.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(32), default="HIGH", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    assignee = Column(String(120), default="Lead Maintenance Tech")
    status = Column(String(32), default="OPEN", index=True) # OPEN, IN_PROGRESS, COMPLETED, CANCELLED
    risk_score = Column(Float, default=75.0) # Explainable risk 0-100
    due_date = Column(DateTime, nullable=True)
    audit_trail = Column(JSON, default=list) # [{timestamp, user, action, note}]
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    machine = relationship("Machine", back_populates="maintenance_tasks")
    alert = relationship("Alert", back_populates="tasks")

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    operational_impact = Column(Text, nullable=False) # e.g. "Risk of HVAC cooling failure for hospital ICU wing"
    severity = Column(String(32), default="CRITICAL", index=True)
    status = Column(String(32), default="INVESTIGATING", index=True) # INVESTIGATING, MITIGATED, RESOLVED
    timeline = Column(JSON, default=list) # [{time, event, actor}]
    recommended_inspections = Column(JSON, default=list)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    machine = relationship("Machine", back_populates="incidents")

class WorkerHeartbeat(Base):
    __tablename__ = "worker_heartbeats"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    worker_id = Column(String(64), unique=True, nullable=False, index=True)
    status = Column(String(32), default="ACTIVE", index=True) # ACTIVE, STOPPED, DEAD
    active_jobs_count = Column(Integer, default=0)
    completed_jobs_count = Column(Integer, default=0)
    failed_jobs_count = Column(Integer, default=0)
    last_heartbeat = Column(DateTime, default=datetime.utcnow, index=True)
    system_info = Column(JSON, default=dict)

class TengReading(Base):
    __tablename__ = "teng_readings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    voltage_v = Column(Float, nullable=False)
    vibration_frequency_hz = Column(Float, nullable=False)
    signal_amplitude_v = Column(Float, nullable=False)
    charge_transfer_nc = Column(Float, default=0.0)
    source = Column(String(32), default="TENG_VIBRATION_SENSOR") # TENG_VIBRATION_SENSOR, BENCHMARK

class TengDataset(Base):
    __tablename__ = "teng_datasets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    row_count = Column(Integer, default=0)
    summary_metrics = Column(JSON, default=dict) # v_pp, v_rms, v_kurtosis, dominant_frequency_hz, etc.
    health_index = Column(Float, default=100.0)
    max_anomaly_score = Column(Float, default=0.0)
    fault_flags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

class ImageInspection(Base):
    __tablename__ = "image_inspections"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    annotated_file_path = Column(String(512), nullable=False)
    component_name = Column(String(120), default="Machine Component")
    defects = Column(JSON, default=list) # [{id, type, bbox, confidence, classification, physical_indicator}]
    total_defects_found = Column(Integer, default=0)
    confirmed_count = Column(Integer, default=0)
    uncertain_count = Column(Integer, default=0)
    max_confidence = Column(Float, default=0.0)
    visual_severity = Column(String(32), default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    visual_condition_score = Column(Float, default=100.0)
    condition_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SymbiosisEvaluation(Base):
    __tablename__ = "symbiosis_evaluations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    teng_dataset_id = Column(String(36), nullable=True)
    image_inspection_id = Column(String(36), nullable=True)
    composite_health_index = Column(Float, nullable=False)
    overall_severity = Column(String(32), default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    primary_fault_cause = Column(String(255), nullable=False)
    confidence_score = Column(Float, default=0.85)
    attribution_breakdown = Column(JSON, default=dict) # {teng_sensor_pct, visual_inspection_pct, machine_history_pct}
    cross_modal_correlations = Column(JSON, default=list)
    recommended_actions = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

