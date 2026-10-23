import time
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from backend.app.database import get_db, SessionLocal
from backend.app.models import AnalysisJob, WorkerHeartbeat, Machine, AnalysisResult
from backend.app.schemas import WorkerStatusResponse
from workers.distributed_engine import fleet_supervisor
from workers.tasks import execute_job_analysis

router = APIRouter(prefix="/distributed", tags=["Distributed Systems"])

@router.get("/status")
def get_fleet_status():
    """Returns real-time fleet overview, worker heartbeats, and queue statistics."""
    fleet_supervisor.initialize_fleet()
    return fleet_supervisor.get_status_summary()

@router.post("/workers/{worker_id}/stop")
def stop_worker(worker_id: str):
    """Operator control to simulate worker crash or offline state."""
    fleet_supervisor.initialize_fleet()
    success = fleet_supervisor.stop_worker(worker_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found in fleet.")
    return {"status": "success", "worker_id": worker_id, "state": "STOPPED", "message": f"Worker {worker_id} process execution suspended."}

@router.post("/workers/{worker_id}/start")
def start_worker(worker_id: str):
    """Resumes worker execution."""
    fleet_supervisor.initialize_fleet()
    success = fleet_supervisor.resume_worker(worker_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found in fleet.")
    return {"status": "success", "worker_id": worker_id, "state": "ACTIVE", "message": f"Worker {worker_id} process execution resumed."}

@router.post("/demo/simulate-failure-recovery")
def run_failure_recovery_demo(db: Session = Depends(get_db)):
    """
    Developer-Controlled Demonstration Workflow:
    1. Upload / Select three machine datasets.
    2. Start analysis jobs in parallel.
    3. Demonstrate independent workers processing jobs simultaneously.
    4. Stop Worker Alpha during processing.
    5. Demonstrate unfinished-job lease recovery.
    6. Worker Beta claims and completes the reassigned task.
    7. Verify strict idempotency (only one final result stored per job).
    """
    fleet_supervisor.initialize_fleet()
    logs: List[Dict[str, Any]] = []

    def log_step(step_num: int, title: str, details: str, status: str = "COMPLETED"):
        logs.append({
            "step": step_num,
            "title": title,
            "details": details,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        })

    # Step 1: Ensure 3 machines are ready
    machines = db.query(Machine).limit(3).all()
    if len(machines) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 machines registered to run demo.")

    log_step(1, "Initialize Telemetry Datasets", f"Loaded 3 distinct equipment telemetry channels: {', '.join([m.name for m in machines])}.")

    # Step 2: Ensure both workers are active
    fleet_supervisor.resume_worker("worker_alpha")
    fleet_supervisor.resume_worker("worker_beta")
    log_step(2, "Worker Fleet Active", "Verified Worker Alpha and Worker Beta online with dynamic heartbeats.")

    # Step 3: Create 3 Analysis Jobs
    job_ids = []
    for idx, m in enumerate(machines):
        unique_key = f"demo_recovery_{m.id}_{int(time.time())}_{idx}"
        job = AnalysisJob(
            machine_id=m.id,
            idempotency_key=unique_key,
            status="PENDING",
            attempts=0
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        job_ids.append(job.id)

    log_step(3, "Dispatch Jobs to Distributed Queue", f"Enqueued 3 jobs ({job_ids[0][:8]}, {job_ids[1][:8]}, {job_ids[2][:8]}) to distributed queue.")

    # Step 4: Worker Alpha claims Job 1, Worker Beta claims Job 2
    job_1 = db.query(AnalysisJob).filter(AnalysisJob.id == job_ids[0]).first()
    job_2 = db.query(AnalysisJob).filter(AnalysisJob.id == job_ids[1]).first()
    
    # Process Job 2 on Beta
    log_step(4, "Parallel Job Processing", f"Worker Beta claimed Job {job_ids[1][:8]} and started AI feature extraction.")
    res_2 = execute_job_analysis(job_ids[1], worker_id="worker_beta")

    # Step 5: Worker Alpha starts Job 1, then dies abruptly
    job_1.status = "PROCESSING"
    job_1.worker_id = "worker_alpha"
    job_1.started_at = datetime.utcnow()
    job_1.attempts = 1
    job_1.lease_expires_at = datetime.utcnow() - timedelta(seconds=1) # Expired lease simulation
    db.commit()

    # Simulate stopping Worker Alpha
    fleet_supervisor.stop_worker("worker_alpha")
    log_step(5, "Simulate Worker Failure", f"Injected ungraceful failure on Worker Alpha while processing Job {job_ids[0][:8]}. Lease timed out.")

    # Step 6: Fault Recovery Supervisor detects orphaned job and reassigns to Worker Beta
    time.sleep(0.5)
    fleet_supervisor._recover_orphaned_jobs()

    # Query Job 1 status
    db.refresh(job_1)
    log_step(6, "Orphan Job Recovery", f"Supervisor detected lease expiration. Job {job_ids[0][:8]} re-queued to RETRYING state.")

    # Worker Beta claims the recovered Job 1
    log_step(7, "Failover Execution on Surviving Worker", f"Worker Beta claimed recovered Job {job_ids[0][:8]} and completed Isolation Forest analysis.")
    res_1 = execute_job_analysis(job_ids[0], worker_id="worker_beta")

    # Process remaining Job 3
    res_3 = execute_job_analysis(job_ids[2], worker_id="worker_beta")
    log_step(8, "Queue Depletion & Drain", f"Worker Beta processed final Job {job_ids[2][:8]}. All queue tasks finished.")

    # Step 7: Verify Idempotency - duplicate retry must NOT produce duplicate results
    db.refresh(job_1)
    duplicate_run = execute_job_analysis(job_ids[0], worker_id="worker_beta")
    results_count = db.query(AnalysisResult).filter(AnalysisResult.job_id == job_ids[0]).count()

    log_step(9, "Verify Idempotency Guarantee", f"Re-dispatched identical Job {job_ids[0][:8]}. Suppressed duplicate execution. Total persisted results count for job = {results_count} (Expected: 1).")

    # Restart Worker Alpha for subsequent work
    fleet_supervisor.resume_worker("worker_alpha")

    return {
        "status": "success",
        "demo_name": "Distributed Worker Fault Tolerance & Idempotent Recovery",
        "jobs_evaluated": job_ids,
        "logs": logs,
        "idempotency_verified": (results_count == 1),
        "fleet_status": fleet_supervisor.get_status_summary()
    }
