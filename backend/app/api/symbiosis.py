from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import os
import pandas as pd

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models import (
    Machine, TengDataset, ImageInspection, SymbiosisEvaluation,
    Alert, MaintenanceTask
)
from backend.app.supabase_client import sync_record_to_supabase
from ml.teng_analyzer import TengAnalyzer
from ml.symbiosis_engine import SymbiosisMultimodalFusion

router = APIRouter(prefix="/symbiosis", tags=["Symbiosis — Multimodal AI Fusion"])

@router.post("/evaluate/{machine_id}")
def evaluate_multimodal_fusion(machine_id: str, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    # 1. Fetch Latest TENG Telemetry & Evaluation
    teng_ds = db.query(TengDataset).filter(TengDataset.machine_id == machine_id).order_by(TengDataset.created_at.desc()).first()
    teng_summary = None
    if teng_ds:
        teng_summary = {
            "health_index": teng_ds.health_index,
            "summary_metrics": teng_ds.summary_metrics or {},
            "max_anomaly_score": teng_ds.max_anomaly_score,
            "fault_flags": teng_ds.fault_flags or []
        }
    else:
        # Load demo TENG telemetry
        demo_teng_path = settings.DEMO_DATA_DIR / ("teng_bearing_impact.csv" if machine.status in ["WARNING", "CRITICAL"] else "teng_healthy_motor.csv")
        if os.path.exists(demo_teng_path):
            df_teng = pd.read_csv(demo_teng_path)
            analyzer = TengAnalyzer()
            analysis = analyzer.analyze_teng_dataset(df_teng, machine.name)
            teng_summary = analysis

    # 2. Fetch Latest Visual Inspection
    image_insp = db.query(ImageInspection).filter(ImageInspection.machine_id == machine_id).order_by(ImageInspection.created_at.desc()).first()
    vision_summary = None
    if image_insp:
        vision_summary = {
            "component_name": image_insp.component_name,
            "visual_condition_score": image_insp.visual_condition_score,
            "visual_severity": image_insp.visual_severity,
            "defects": image_insp.defects or []
        }

    # 3. Fetch Operational History
    alerts_count = db.query(Alert).filter(Alert.machine_id == machine_id).count()
    history_summary = {
        "past_alerts_count": alerts_count,
        "operational_status": machine.status
    }

    machine_meta = {
        "id": machine.id,
        "name": machine.name,
        "category": machine.category,
        "status": machine.status
    }

    # Run Symbiosis Multimodal Fusion
    fusion_output = SymbiosisMultimodalFusion.fuse_multimodal_assessment(
        teng_summary,
        vision_summary,
        history_summary,
        machine_meta
    )

    # Save to database
    symbiosis_eval = SymbiosisEvaluation(
        machine_id=machine.id,
        teng_dataset_id=teng_ds.id if teng_ds else None,
        image_inspection_id=image_insp.id if image_insp else None,
        composite_health_index=fusion_output["composite_health_index"],
        overall_severity=fusion_output["overall_severity"],
        primary_fault_cause=fusion_output["primary_fault_cause"],
        confidence_score=fusion_output["confidence_score"],
        attribution_breakdown=fusion_output["attribution_breakdown"],
        cross_modal_correlations=fusion_output["cross_modal_correlations"],
        recommended_actions=fusion_output["recommended_actions"]
    )
    db.add(symbiosis_eval)

    # Update machine health index and status based on multimodal truth
    machine.health_index = fusion_output["composite_health_index"]
    if fusion_output["overall_severity"] == "CRITICAL":
        machine.status = "CRITICAL"
    elif fusion_output["overall_severity"] == "HIGH":
        machine.status = "WARNING"
    elif machine.status != "OFFLINE":
        machine.status = "HEALTHY"

    # If Critical Multimodal Anomaly, ensure Maintenance Task is logged
    if fusion_output["overall_severity"] in ["CRITICAL", "HIGH"]:
        task_exists = db.query(MaintenanceTask).filter(
            MaintenanceTask.machine_id == machine.id,
            MaintenanceTask.status == "OPEN"
        ).first()

        if not task_exists:
            work_order = MaintenanceTask(
                machine_id=machine.id,
                title=f"Multimodal Action: Address {fusion_output['primary_fault_cause']}",
                description=f"Automated Symbiosis ticket combining TENG vibration and CV defect analysis. Evidence: {fusion_output['cross_modal_correlations'][0]['finding'] if fusion_output['cross_modal_correlations'] else 'Multimodal variance.'}",
                priority=fusion_output["overall_severity"],
                assignee="Senior Field Specialist",
                status="OPEN",
                risk_score=round(100.0 - fusion_output["composite_health_index"], 1),
                due_date=datetime.utcnow() + timedelta(hours=6),
                audit_trail=[{
                    "timestamp": datetime.utcnow().isoformat(),
                    "user": "Symbiosis AI Engine",
                    "action": "MULTIMODAL_FUSION_WORK_ORDER",
                    "note": f"Confidence: {int(fusion_output['confidence_score']*100)}%"
                }]
            )
            db.add(work_order)

    db.commit()
    db.refresh(symbiosis_eval)

    # Sync to Supabase table symbiosis_evaluations and machines
    try:
        sync_record_to_supabase("symbiosis_evaluations", {
            "id": symbiosis_eval.id,
            "machine_id": machine.id,
            "teng_dataset_id": teng_ds.id if teng_ds else None,
            "image_inspection_id": image_insp.id if image_insp else None,
            "composite_health_index": fusion_output["composite_health_index"],
            "overall_severity": fusion_output["overall_severity"],
            "primary_fault_cause": fusion_output["primary_fault_cause"],
            "confidence_score": fusion_output["confidence_score"],
            "attribution_breakdown": fusion_output["attribution_breakdown"],
            "cross_modal_correlations": fusion_output["cross_modal_correlations"],
            "recommended_actions": fusion_output["recommended_actions"],
            "created_at": symbiosis_eval.created_at
        })
        sync_record_to_supabase("machines", {
            "id": machine.id,
            "name": machine.name,
            "category": machine.category,
            "asset_tag": machine.asset_tag,
            "location_label": machine.location_label,
            "status": machine.status,
            "health_index": machine.health_index,
            "is_monitored": machine.is_monitored,
            "last_analyzed_at": datetime.utcnow()
        })
    except Exception:
        pass

    return {
        "status": "success",
        "evaluation_id": symbiosis_eval.id,
        "machine_id": machine.id,
        "machine_name": machine.name,
        "composite_health_index": fusion_output["composite_health_index"],
        "overall_severity": fusion_output["overall_severity"],
        "primary_fault_cause": fusion_output["primary_fault_cause"],
        "confidence_score": fusion_output["confidence_score"],
        "attribution_breakdown": fusion_output["attribution_breakdown"],
        "teng_vector": fusion_output["teng_vector"],
        "vision_vector": fusion_output["vision_vector"],
        "history_vector": fusion_output["history_vector"],
        "cross_modal_correlations": fusion_output["cross_modal_correlations"],
        "recommended_actions": fusion_output["recommended_actions"],
        "created_at": symbiosis_eval.created_at.isoformat()
    }

@router.get("/{machine_id}")
def get_symbiosis_evaluation(machine_id: str, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    symbiosis_eval = db.query(SymbiosisEvaluation).filter(
        SymbiosisEvaluation.machine_id == machine_id
    ).order_by(SymbiosisEvaluation.created_at.desc()).first()

    if not symbiosis_eval:
        # Trigger on-demand evaluation
        return evaluate_multimodal_fusion(machine_id, db)

    return {
        "evaluation_id": symbiosis_eval.id,
        "machine_id": machine.id,
        "machine_name": machine.name,
        "composite_health_index": symbiosis_eval.composite_health_index,
        "overall_severity": symbiosis_eval.overall_severity,
        "primary_fault_cause": symbiosis_eval.primary_fault_cause,
        "confidence_score": symbiosis_eval.confidence_score,
        "attribution_breakdown": symbiosis_eval.attribution_breakdown or {},
        "cross_modal_correlations": symbiosis_eval.cross_modal_correlations or [],
        "recommended_actions": symbiosis_eval.recommended_actions or [],
        "created_at": symbiosis_eval.created_at.isoformat()
    }
