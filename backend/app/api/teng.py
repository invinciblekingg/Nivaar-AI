import os
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models import Machine, TengReading, TengDataset
from ml.teng_analyzer import TengAnalyzer

router = APIRouter(prefix="/teng", tags=["TENG Sensor Monitoring"])

BENCHMARK_MAP = {
    "teng-healthy": "teng_healthy_motor.csv",
    "teng-impact": "teng_bearing_impact.csv",
    "teng-loose": "teng_loose_mount.csv",
    "healthy": "teng_healthy_motor.csv",
    "impact": "teng_bearing_impact.csv",
    "loose": "teng_loose_mount.csv"
}

@router.get("/benchmarks")
def get_teng_benchmarks():
    """Lists preloaded benchmark datasets for TENG vibration sensors."""
    return [
        {
            "id": "teng-healthy",
            "name": "Healthy Baseline (Continuous Contact)",
            "filename": "teng_healthy_motor.csv",
            "file_name": "teng_healthy_motor.csv",
            "condition": "HEALTHY",
            "expected_freq": 29.8,
            "expected_vpp": 6.5,
            "expected_anomaly": False,
            "description": "Nominal 29.75 Hz vibration excitation with stable 6.5 Vpp amplitude and low impact kurtosis.",
            "expected_fault": "Nominal Operation",
            "is_synthetic": True
        },
        {
            "id": "teng-impact",
            "name": "Abnormal Bearing Impact Chatter",
            "filename": "teng_bearing_impact.csv",
            "file_name": "teng_bearing_impact.csv",
            "condition": "CRITICAL",
            "expected_freq": 89.4,
            "expected_vpp": 24.2,
            "expected_anomaly": True,
            "description": "High-voltage transient spikes (22.4 Vpp) and impulsive kurtosis > 5.2 caused by outer raceway impacts.",
            "expected_fault": "Mechanical Shock Chatter",
            "is_synthetic": True
        },
        {
            "id": "teng-loose",
            "name": "Loose Mount Vibration Frequency Hunting",
            "filename": "teng_loose_mount.csv",
            "file_name": "teng_loose_mount.csv",
            "condition": "WARNING",
            "expected_freq": 24.5,
            "expected_vpp": 14.5,
            "expected_anomaly": True,
            "description": "Unstable contact-separation frequency oscillation (18-45 Hz) caused by mechanical looseness.",
            "expected_fault": "Frequency Instability / Mechanical Looseness",
            "is_synthetic": True
        }
    ]

@router.get("/telemetry/{machine_id}")
def get_teng_telemetry(machine_id: str, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    # Load latest TENG dataset or fallback to demo
    teng_ds = db.query(TengDataset).filter(TengDataset.machine_id == machine_id).order_by(TengDataset.created_at.desc()).first()

    csv_path = None
    if teng_ds and os.path.exists(teng_ds.file_path):
        csv_path = teng_ds.file_path
    else:
        demo_dir = settings.DEMO_DATA_DIR
        if machine.status in ["WARNING", "CRITICAL"]:
            csv_path = demo_dir / "teng_bearing_impact.csv"
        else:
            csv_path = demo_dir / "teng_healthy_motor.csv"

    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="No TENG sensor telemetry available.")

    df = pd.read_csv(csv_path)
    analyzer = TengAnalyzer()
    analysis = analyzer.analyze_teng_dataset(df, machine.name)

    return {
        "machine_id": machine.id,
        "machine_name": machine.name,
        "dataset_source": "VERIFIED_TENG_TELEMETRY" if teng_ds else "BENCHMARK_TENG_TELEMETRY",
        "health_index": analysis["health_index"],
        "max_anomaly_score": analysis.get("max_anomaly_score", 0.0),
        "summary_metrics": analysis["summary_metrics"],
        "fault_flags": analysis["fault_flags"],
        "telemetry_stream": analysis["telemetry_stream"],
        "readings": analysis["telemetry_stream"],
        "anomalies": analysis["anomalies"]
    }

@router.post("/upload-csv")
async def upload_teng_csv(
    machine_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV telemetry datasets are supported.")

    file_id = f"teng_{machine_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    target_path = settings.UPLOAD_DIR / file_id

    size = 0
    with open(target_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > 25 * 1024 * 1024:
                os.remove(target_path)
                raise HTTPException(status_code=400, detail="CSV file exceeds 25MB limit.")
            buffer.write(chunk)

    try:
        df = pd.read_csv(target_path)
        analyzer = TengAnalyzer()
        analysis = analyzer.analyze_teng_dataset(df, machine.name)

        teng_ds = TengDataset(
            machine_id=machine_id,
            filename=file.filename,
            file_path=str(target_path),
            row_count=len(df),
            summary_metrics=analysis["summary_metrics"],
            health_index=analysis["health_index"],
            max_anomaly_score=analysis["max_anomaly_score"],
            fault_flags=analysis["fault_flags"]
        )
        db.add(teng_ds)

        # Update machine health index
        machine.health_index = round((machine.health_index + analysis["health_index"]) / 2.0, 1)
        db.commit()
        db.refresh(teng_ds)

        return {
            "status": "success",
            "dataset_id": teng_ds.id,
            "filename": file.filename,
            "row_count": len(df),
            "sample_count": len(df),
            "health_index": analysis["health_index"],
            "max_anomaly_score": analysis.get("max_anomaly_score", 0.0),
            "summary_metrics": analysis["summary_metrics"],
            "fault_flags": analysis["fault_flags"],
            "readings": analysis["telemetry_stream"]
        }
    except Exception as e:
        if os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(status_code=400, detail=f"Failed to process TENG dataset: {str(e)}")

@router.post("/analyze-benchmark")
def analyze_benchmark(
    machine_id: str = Query(None),
    benchmark_id: Optional[str] = Query(None),
    benchmark_filename: Optional[str] = Query(None),
    machine_id_form: Optional[str] = Form(None),
    benchmark_id_form: Optional[str] = Form(None),
    benchmark_filename_form: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    target_machine_id = machine_id or machine_id_form
    if not target_machine_id:
        raise HTTPException(status_code=400, detail="machine_id is required")

    machine = db.query(Machine).filter(Machine.id == target_machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    target_b_id = benchmark_id or benchmark_id_form
    target_b_file = benchmark_filename or benchmark_filename_form

    if not target_b_file and target_b_id:
        target_b_file = BENCHMARK_MAP.get(target_b_id, f"{target_b_id}.csv")
    elif not target_b_file:
        target_b_file = "teng_healthy_motor.csv"

    # Ensure ends with .csv
    if not target_b_file.endswith(".csv"):
        target_b_file = f"{target_b_file}.csv"

    target_path = settings.DEMO_DATA_DIR / target_b_file
    if not os.path.exists(target_path):
        # Fallback to demo dir
        target_path = settings.DEMO_DATA_DIR / "teng_healthy_motor.csv"

    df = pd.read_csv(target_path)
    analyzer = TengAnalyzer()
    analysis = analyzer.analyze_teng_dataset(df, machine.name)

    teng_ds = TengDataset(
        machine_id=target_machine_id,
        filename=target_b_file,
        file_path=str(target_path),
        row_count=len(df),
        summary_metrics=analysis["summary_metrics"],
        health_index=analysis["health_index"],
        max_anomaly_score=analysis["max_anomaly_score"],
        fault_flags=analysis["fault_flags"]
    )
    db.add(teng_ds)
    machine.health_index = round((machine.health_index + analysis["health_index"]) / 2.0, 1)
    db.commit()
    db.refresh(teng_ds)

    return {
        "status": "success",
        "dataset_id": teng_ds.id,
        "filename": target_b_file,
        "condition": "HEALTHY" if "healthy" in target_b_file else ("CRITICAL" if "impact" in target_b_file else "WARNING"),
        "health_index": analysis["health_index"],
        "max_anomaly_score": analysis.get("max_anomaly_score", 0.0),
        "summary_metrics": analysis["summary_metrics"],
        "fault_flags": analysis["fault_flags"],
        "readings": analysis["telemetry_stream"]
    }
