import os
import json
import logging
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models import (
    AnalysisJob, AnalysisResult, Anomaly, Alert, Machine, 
    UploadedDataset, MaintenanceTask, Incident
)
from ml.anomaly_detector import AnomalyDetector
from workers.celery_app import celery_app

logger = logging.getLogger("machineguard.worker")

def execute_job_analysis(job_id: str, worker_id: str = "worker_default") -> dict:
    """
    Core idempotent analysis routine executed by distributed workers.
    Ensures safe retry, lease-based claiming, and duplicate suppression.
    """
    db: Session = SessionLocal()
    try:
        job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found in database.")
            return {"status": "error", "message": "Job not found"}

        # IDEMPOTENCY CHECK: If already completed, do not recompute or create duplicate alerts
        if job.status == "COMPLETED":
            logger.info(f"Idempotency Guard: Job {job_id} already COMPLETED. Skipping duplicate computation.")
            existing_result = db.query(AnalysisResult).filter(AnalysisResult.job_id == job_id).first()
            return {
                "status": "already_completed",
                "job_id": job.id,
                "result_id": existing_result.id if existing_result else None
            }

        # Update job to PROCESSING with worker lease
        job.status = "PROCESSING"
        job.worker_id = worker_id
        job.started_at = datetime.utcnow()
        job.attempts += 1
        job.lease_expires_at = datetime.utcnow() + timedelta(seconds=45)
        db.commit()

        machine = db.query(Machine).filter(Machine.id == job.machine_id).first()
        if not machine:
            job.status = "FAILED"
            job.error_message = f"Machine {job.machine_id} does not exist"
            db.commit()
            return {"status": "error", "message": job.error_message}

        # Retrieve dataset
        csv_path = None
        if job.dataset_id:
            dataset = db.query(UploadedDataset).filter(UploadedDataset.id == job.dataset_id).first()
            if dataset and os.path.exists(dataset.file_path):
                csv_path = dataset.file_path

        # If no custom dataset uploaded, check if demo file exists for machine
        if not csv_path or not os.path.exists(csv_path):
            # Check demo files based on machine category
            demo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "demo_data"))
            cat = machine.category.lower()
            if "pump" in cat:
                csv_path = os.path.join(demo_dir, "pump_cavitation_pressure.csv")
            elif "cool" in cat or "medical" in cat:
                csv_path = os.path.join(demo_dir, "hospital_cooling_overheat.csv")
            elif "turbine" in cat:
                csv_path = os.path.join(demo_dir, "turbine_bearing_flaw.csv")
            elif machine.status in ["WARNING", "CRITICAL"]:
                csv_path = os.path.join(demo_dir, "abnormal_vibration_motor.csv")
            else:
                csv_path = os.path.join(demo_dir, "healthy_motor.csv")

        logger.info(f"[{worker_id}] Processing Job {job_id} for Machine {machine.name} using dataset {csv_path}")

        # Load telemetry
        df = pd.read_csv(csv_path)

        # Run AI Anomaly Detection
        detector = AnomalyDetector(contamination=0.06)
        machine_info = {
            "id": machine.id,
            "name": machine.name,
            "category": machine.category,
            "profile_config": machine.profile_config or {}
        }
        known_baseline = machine.profile_config.get("baseline", {}) if machine.profile_config else {}
        
        analysis_output = detector.run_analysis(df, machine_info, known_baseline)

        # Check if result record already exists (Idempotent DB check)
        existing_result = db.query(AnalysisResult).filter(AnalysisResult.job_id == job.id).first()
        if existing_result:
            result = existing_result
            result.anomaly_count = analysis_output["anomaly_count"]
            result.max_anomaly_score = analysis_output["max_anomaly_score"]
            result.health_index_evaluated = analysis_output["health_index"]
            result.baseline_metrics = analysis_output["baseline_metrics"]
            result.feature_importance = analysis_output["feature_importance"]
            result.summary = analysis_output["summary"]
            result.recommendations = analysis_output["recommendations"]
            result.fault_hypotheses = analysis_output["fault_hypotheses"]
        else:
            result = AnalysisResult(
                job_id=job.id,
                machine_id=machine.id,
                dataset_id=job.dataset_id,
                anomaly_count=analysis_output["anomaly_count"],
                max_anomaly_score=analysis_output["max_anomaly_score"],
                health_index_evaluated=analysis_output["health_index"],
                baseline_metrics=analysis_output["baseline_metrics"],
                feature_importance=analysis_output["feature_importance"],
                summary=analysis_output["summary"],
                recommendations=analysis_output["recommendations"],
                fault_hypotheses=analysis_output["fault_hypotheses"],
            )
            db.add(result)
        db.flush()

        # Delete old anomalies for this result if updating
        db.query(Anomaly).filter(Anomaly.result_id == result.id).delete()

        # Store anomaly instances
        created_anomalies = []
        for anom_data in analysis_output["anomalies"]:
            anom = Anomaly(
                result_id=result.id,
                machine_id=machine.id,
                timestamp=datetime.fromisoformat(anom_data["timestamp"]),
                anomaly_score=anom_data["anomaly_score"],
                severity=anom_data["severity"],
                description=anom_data["description"],
                top_influential_sensors=anom_data["top_influential_sensors"],
                feature_values=anom_data["feature_values"]
            )
            db.add(anom)
            created_anomalies.append(anom)
        db.flush()

        # Update machine status and health index
        machine.health_index = analysis_output["health_index"]
        machine.last_analyzed_at = datetime.utcnow()
        if analysis_output["overall_severity"] == "CRITICAL":
            machine.status = "CRITICAL"
        elif analysis_output["overall_severity"] == "HIGH":
            machine.status = "WARNING"
        elif machine.status != "OFFLINE":
            machine.status = "HEALTHY"

        # Alert Generation with Deduplication
        if analysis_output["overall_severity"] in ["CRITICAL", "HIGH"]:
            # Check for existing open alert in last 10 minutes for this machine
            ten_mins_ago = datetime.utcnow() - timedelta(minutes=10)
            existing_alert = db.query(Alert).filter(
                Alert.machine_id == machine.id,
                Alert.status.in_(["NEW", "ACKNOWLEDGED"]),
                Alert.timestamp >= ten_mins_ago
            ).first()

            if not existing_alert:
                top_anomaly = created_anomalies[0] if created_anomalies else None
                first_hypothesis = analysis_output["fault_hypotheses"][0] if analysis_output["fault_hypotheses"] else {}
                
                alert = Alert(
                    machine_id=machine.id,
                    anomaly_id=top_anomaly.id if top_anomaly else None,
                    severity=analysis_output["overall_severity"],
                    status="NEW",
                    title=f"{analysis_output['overall_severity']} Anomaly: {first_hypothesis.get('fault', 'Telemetry Deviation')}",
                    description=analysis_output["summary"],
                    readings_snapshot={
                        "max_score": analysis_output["max_anomaly_score"],
                        "leading_hypothesis": first_hypothesis.get("fault"),
                        "component": first_hypothesis.get("component")
                    }
                )
                db.add(alert)
                db.flush()

                # If CRITICAL, generate Incident and Maintenance Task
                if analysis_output["overall_severity"] == "CRITICAL":
                    incident = Incident(
                        machine_id=machine.id,
                        title=f"Critical Infrastructure Threat: {machine.name} ({first_hypothesis.get('fault', 'Unstable Operation')})",
                        operational_impact=f"Potential unplanned disruption to {machine.category} operations at {machine.location_label}. Risk of thermal or structural breakdown.",
                        severity="CRITICAL",
                        status="INVESTIGATING",
                        recommended_inspections=analysis_output["recommendations"],
                        timeline=[{
                            "time": datetime.utcnow().isoformat(),
                            "event": f"Automated anomaly detection by {worker_id} flagged critical pattern.",
                            "actor": f"MachineGuard AI Engine ({worker_id})"
                        }]
                    )
                    db.add(incident)

                    # Maintenance task
                    task = MaintenanceTask(
                        machine_id=machine.id,
                        alert_id=alert.id,
                        title=f"Inspect {first_hypothesis.get('component', 'Assembly')} on {machine.name}",
                        description=f"Automated maintenance ticket from Job {job.id}. Evidence: {first_hypothesis.get('evidence', '')}",
                        priority="CRITICAL",
                        assignee="Senior Field Specialist",
                        status="OPEN",
                        risk_score=round(analysis_output["max_anomaly_score"] * 100, 1),
                        due_date=datetime.utcnow() + timedelta(hours=4),
                        audit_trail=[{
                            "timestamp": datetime.utcnow().isoformat(),
                            "user": "System (Automated Trigger)",
                            "action": "TASK_CREATED",
                            "note": f"Triggered from Job {job.id} by {worker_id}"
                        }]
                    )
                    db.add(task)

        # Mark job COMPLETED
        job.status = "COMPLETED"
        job.completed_at = datetime.utcnow()
        job.lease_expires_at = None
        db.commit()

        logger.info(f"[{worker_id}] Successfully finished Job {job_id}. Health Index: {machine.health_index}%")
        return {
            "status": "success",
            "job_id": job.id,
            "worker_id": worker_id,
            "health_index": machine.health_index,
            "anomalies_found": analysis_output["anomaly_count"]
        }

    except Exception as e:
        db.rollback()
        logger.exception(f"Error executing analysis job {job_id}: {str(e)}")
        try:
            job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
            if job:
                job.error_message = str(e)
                if job.attempts >= job.max_attempts:
                    job.status = "FAILED"
                else:
                    job.status = "RETRYING"
                db.commit()
        except Exception:
            pass
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def analyze_dataset_celery(self, job_id: str, worker_id: str = "celery_worker"):
    try:
        return execute_job_analysis(job_id, worker_id)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=5)
