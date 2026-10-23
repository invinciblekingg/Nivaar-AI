import os
import shutil
import hashlib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
from datetime import datetime

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models import Machine, UploadedDataset, AnalysisJob, AnalysisResult, Anomaly
from backend.app.schemas import (
    UploadedDatasetResponse, JobSubmitRequest, 
    AnalysisJobResponse, AnalysisResultResponse
)
from workers.distributed_engine import fleet_supervisor
from workers.tasks import execute_job_analysis

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])

@router.get("/sample-datasets")
def get_sample_datasets():
    """Lists preloaded benchmark datasets available for 1-click analysis."""
    demo_dir = settings.DEMO_DATA_DIR
    files = [
        {
            "id": "demo-motor-healthy",
            "name": "Healthy Industrial Motor Baseline",
            "filename": "healthy_motor.csv",
            "category": "Industrial Motors",
            "description": "Stable 1785 RPM running condition with nominal ISO Class I vibration levels.",
            "is_synthetic": True
        },
        {
            "id": "demo-motor-abnormal",
            "name": "Motor Bearing Fluting & Vibration Surge",
            "filename": "abnormal_vibration_motor.csv",
            "category": "Industrial Motors",
            "description": "Progressive outer race spalling defect with impulsive shock pulses and elevated kurtosis.",
            "is_synthetic": True
        },
        {
            "id": "demo-pump-cavitation",
            "name": "Centrifugal Pump Impeller Cavitation",
            "filename": "pump_cavitation_pressure.csv",
            "category": "Pumps",
            "description": "Suction pressure collapse with vapor bubble implosions and violent discharge pressure hunting.",
            "is_synthetic": True
        },
        {
            "id": "demo-cooling-overheat",
            "name": "Hospital Chiller Thermal Loss",
            "filename": "hospital_cooling_overheat.csv",
            "category": "Medical Equipment",
            "description": "Refrigerant charge leak causing condenser thermal escalation risking ICU and MRI cooling.",
            "is_synthetic": True
        },
        {
            "id": "demo-turbine-bearing",
            "name": "Peaking Turbine Bearing Pad Degradation",
            "filename": "turbine_bearing_flaw.csv",
            "category": "Power Turbines",
            "description": "Severe boundary friction and loss of hydrodynamic lubrication film on high-speed shaft.",
            "is_synthetic": True
        }
    ]
    return files

@router.post("/upload-csv", response_model=UploadedDatasetResponse)
async def upload_csv(
    machine_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV telemetry datasets are supported.")

    file_id = f"{machine_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    target_path = settings.UPLOAD_DIR / file_id

    # Stream save file with size check (limit 25MB)
    size = 0
    with open(target_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > 25 * 1024 * 1024:
                os.remove(target_path)
                raise HTTPException(status_code=400, detail="CSV file exceeds 25MB maximum limit.")
            buffer.write(chunk)

    try:
        df = pd.read_csv(target_path)
        if df.empty:
            os.remove(target_path)
            raise HTTPException(status_code=400, detail="Uploaded CSV dataset is empty.")

        sensor_cols = [c for c in df.columns if c.lower() not in ["timestamp", "time", "date"]]
        
        dataset = UploadedDataset(
            machine_id=machine_id,
            filename=file.filename,
            file_path=str(target_path),
            row_count=len(df),
            sensor_columns=sensor_cols,
            is_synthetic=False,
            provenance="User Uploaded Real Telemetry"
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        return dataset
    except Exception as e:
        if os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV dataset: {str(e)}")

@router.post("/submit-job", response_model=AnalysisJobResponse)
def submit_analysis_job(req: JobSubmitRequest, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == req.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    # Generate deterministic idempotency key if not provided
    idempotency_key = req.idempotency_key or f"{req.machine_id}_{req.dataset_id or 'default'}_{int(datetime.utcnow().timestamp() // 60)}"

    # Check for existing job with same idempotency key
    existing_job = db.query(AnalysisJob).filter(AnalysisJob.idempotency_key == idempotency_key).first()
    if existing_job:
        return existing_job

    job = AnalysisJob(
        machine_id=req.machine_id,
        dataset_id=req.dataset_id,
        idempotency_key=idempotency_key,
        status="PENDING",
        attempts=0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Distributed Fleet Supervisor will automatically claim this job in parallel
    return job

@router.get("/jobs/{job_id}", response_model=AnalysisJobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/results/{machine_id}")
def get_machine_analysis_results(machine_id: str, db: Session = Depends(get_db)):
    result = db.query(AnalysisResult).filter(
        AnalysisResult.machine_id == machine_id
    ).order_by(AnalysisResult.created_at.desc()).first()

    if not result:
        # Return fallback structured response if not yet analyzed
        return {
            "has_results": False,
            "message": "No analysis completed yet for this equipment. Upload sensor telemetry or run diagnostic job to initiate."
        }

    anomalies = db.query(Anomaly).filter(
        Anomaly.result_id == result.id
    ).order_by(Anomaly.anomaly_score.desc()).limit(20).all()

    return {
        "has_results": True,
        "id": result.id,
        "job_id": result.job_id,
        "machine_id": result.machine_id,
        "anomaly_count": result.anomaly_count,
        "max_anomaly_score": result.max_anomaly_score,
        "health_index_evaluated": result.health_index_evaluated,
        "baseline_metrics": result.baseline_metrics,
        "feature_importance": result.feature_importance,
        "summary": result.summary,
        "recommendations": result.recommendations,
        "fault_hypotheses": result.fault_hypotheses,
        "created_at": result.created_at.isoformat(),
        "anomalies": [
            {
                "id": a.id,
                "timestamp": a.timestamp.isoformat(),
                "anomaly_score": a.anomaly_score,
                "severity": a.severity,
                "description": a.description,
                "top_influential_sensors": a.top_influential_sensors,
                "feature_values": a.feature_values
            } for a in anomalies
        ]
    }
