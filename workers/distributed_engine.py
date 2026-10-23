import os
import time
import uuid
import logging
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models import AnalysisJob, WorkerHeartbeat, AnalysisResult
from workers.tasks import execute_job_analysis

logger = logging.getLogger("machineguard.distributed_engine")

class DistributedWorkerInstance:
    """
    Represents an independently running distributed AI worker.
    Has its own execution loop, heartbeat thread, state, and identity.
    """
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.is_running = True
        self.is_active = True
        self.current_job_id: Optional[str] = None
        self.completed_count = 0
        self.failed_count = 0
        self.thread: Optional[threading.Thread] = None
        self.heartbeat_thread: Optional[threading.Thread] = None

    def start(self):
        self.is_running = True
        self.is_active = True
        self.thread = threading.Thread(target=self._run_loop, name=f"Thread-{self.worker_id}", daemon=True)
        self.heartbeat_thread = threading.Thread(target=self._heartbeat_loop, name=f"Heartbeat-{self.worker_id}", daemon=True)
        self.thread.start()
        self.heartbeat_thread.start()
        logger.info(f"Worker [{self.worker_id}] started successfully.")

    def stop(self):
        self.is_active = False
        # Do not kill the thread immediately so it can simulate freeze or abrupt stop
        logger.warning(f"Worker [{self.worker_id}] STOPPED via operator command.")

    def resume(self):
        self.is_active = True
        logger.info(f"Worker [{self.worker_id}] RESUMED.")

    def _heartbeat_loop(self):
        while self.is_running:
            try:
                if self.is_active:
                    self._send_heartbeat()
            except Exception as e:
                logger.error(f"Error in heartbeat loop for {self.worker_id}: {e}")
            time.sleep(3.0)

    def _send_heartbeat(self):
        db: Session = SessionLocal()
        try:
            hb = db.query(WorkerHeartbeat).filter(WorkerHeartbeat.worker_id == self.worker_id).first()
            if not hb:
                hb = WorkerHeartbeat(
                    worker_id=self.worker_id,
                    status="ACTIVE",
                    active_jobs_count=1 if self.current_job_id else 0,
                    completed_jobs_count=self.completed_count,
                    failed_jobs_count=self.failed_count,
                    last_heartbeat=datetime.utcnow(),
                    system_info={
                        "pid": os.getpid(),
                        "thread_name": threading.current_thread().name,
                        "type": "AI Anomaly Detection Worker",
                        "supported_models": ["IsolationForest", "FFT_Vibration", "ZScore_Baseline"]
                    }
                )
                db.add(hb)
            else:
                hb.status = "ACTIVE" if self.is_active else "STOPPED"
                hb.active_jobs_count = 1 if self.current_job_id else 0
                hb.completed_jobs_count = self.completed_count
                hb.failed_jobs_count = self.failed_count
                hb.last_heartbeat = datetime.utcnow()
            db.commit()
        except Exception as e:
            db.rollback()
        finally:
            db.close()

    def _run_loop(self):
        while self.is_running:
            if not self.is_active:
                time.sleep(1.0)
                continue

            # Poll for available pending or retrying jobs
            job_id_to_process = self._claim_next_job()
            if job_id_to_process:
                self.current_job_id = job_id_to_process
                try:
                    res = execute_job_analysis(job_id_to_process, self.worker_id)
                    if res.get("status") in ["success", "already_completed"]:
                        self.completed_count += 1
                    else:
                        self.failed_count += 1
                except Exception as e:
                    self.failed_count += 1
                    logger.error(f"Worker {self.worker_id} crashed while processing {job_id_to_process}: {e}")
                finally:
                    self.current_job_id = None
            else:
                time.sleep(1.5)

    def _claim_next_job(self) -> Optional[str]:
        db: Session = SessionLocal()
        try:
            # Query for PENDING or RETRYING jobs, or jobs assigned specifically to this worker
            # Order by created_at ascending
            job = db.query(AnalysisJob).filter(
                AnalysisJob.status.in_(["PENDING", "RETRYING"]),
                AnalysisJob.attempts < AnalysisJob.max_attempts
            ).order_by(AnalysisJob.created_at.asc()).first()

            if job:
                job.status = "PROCESSING"
                job.worker_id = self.worker_id
                job.started_at = datetime.utcnow()
                job.lease_expires_at = datetime.utcnow() + timedelta(seconds=25)
                db.commit()
                return job.id
            return None
        except Exception as e:
            db.rollback()
            return None
        finally:
            db.close()


class DistributedWorkerSupervisor:
    """
    Supervisor managing the fleet of independent workers, queue monitoring,
    worker heartbeat inspection, and automatic orphan job recovery.
    """
    def __init__(self):
        self.workers: Dict[str, DistributedWorkerInstance] = {}
        self.supervisor_running = False
        self.supervisor_thread: Optional[threading.Thread] = None

    def initialize_fleet(self):
        """Initializes at least 2 independent workers (Worker Alpha & Worker Beta)"""
        worker_ids = ["worker_alpha", "worker_beta"]
        for wid in worker_ids:
            if wid not in self.workers:
                worker = DistributedWorkerInstance(wid)
                self.workers[wid] = worker
                worker.start()

        if not self.supervisor_running:
            self.supervisor_running = True
            self.supervisor_thread = threading.Thread(target=self._supervise_loop, name="DistributedSupervisor", daemon=True)
            self.supervisor_thread.start()
            logger.info("Distributed Worker Supervisor initialized with Worker Alpha and Worker Beta.")

    def stop_worker(self, worker_id: str) -> bool:
        if worker_id in self.workers:
            self.workers[worker_id].stop()
            # Also update DB status to STOPPED
            db: Session = SessionLocal()
            try:
                hb = db.query(WorkerHeartbeat).filter(WorkerHeartbeat.worker_id == worker_id).first()
                if hb:
                    hb.status = "STOPPED"
                    db.commit()
            finally:
                db.close()
            return True
        return False

    def resume_worker(self, worker_id: str) -> bool:
        if worker_id in self.workers:
            self.workers[worker_id].resume()
            return True
        return False

    def get_status_summary(self) -> Dict[str, Any]:
        db: Session = SessionLocal()
        try:
            now = datetime.utcnow()
            heartbeats = db.query(WorkerHeartbeat).all()
            
            # Count queue depths
            pending_count = db.query(AnalysisJob).filter(AnalysisJob.status == "PENDING").count()
            processing_count = db.query(AnalysisJob).filter(AnalysisJob.status == "PROCESSING").count()
            completed_count = db.query(AnalysisJob).filter(AnalysisJob.status == "COMPLETED").count()
            failed_count = db.query(AnalysisJob).filter(AnalysisJob.status == "FAILED").count()
            
            worker_list = []
            for hb in heartbeats:
                is_stale = (now - hb.last_heartbeat).total_seconds() > 15
                is_healthy = (hb.status == "ACTIVE") and not is_stale
                worker_list.append({
                    "id": hb.id,
                    "worker_id": hb.worker_id,
                    "status": "DEAD" if is_stale else hb.status,
                    "active_jobs_count": hb.active_jobs_count,
                    "completed_jobs_count": hb.completed_jobs_count,
                    "failed_jobs_count": hb.failed_jobs_count,
                    "last_heartbeat": hb.last_heartbeat.isoformat(),
                    "system_info": hb.system_info or {},
                    "is_healthy": is_healthy
                })

            return {
                "active_workers_count": sum(1 for w in worker_list if w["is_healthy"]),
                "total_workers": len(worker_list),
                "workers": worker_list,
                "queue": {
                    "pending": pending_count,
                    "processing": processing_count,
                    "completed": completed_count,
                    "failed": failed_count,
                    "total_jobs": pending_count + processing_count + completed_count + failed_count
                }
            }
        finally:
            db.close()

    def _supervise_loop(self):
        """
        Background loop inspecting dead workers and orphaned jobs.
        If a worker stops or its lease expires, reclaims job and reassigns safely.
        """
        while self.supervisor_running:
            try:
                self._recover_orphaned_jobs()
            except Exception as e:
                logger.error(f"Error in supervisor loop: {e}")
            time.sleep(4.0)

    def _recover_orphaned_jobs(self):
        db: Session = SessionLocal()
        try:
            now = datetime.utcnow()
            # Find jobs currently in PROCESSING whose lease has expired
            orphaned_jobs = db.query(AnalysisJob).filter(
                AnalysisJob.status == "PROCESSING",
                AnalysisJob.lease_expires_at < now
            ).all()

            for job in orphaned_jobs:
                if job.attempts < job.max_attempts:
                    logger.warning(
                        f"FAULT RECOVERY TRIGGERED: Job {job.id} lease expired on {job.worker_id}. "
                        f"Re-queueing job (Attempt {job.attempts}/{job.max_attempts})."
                    )
                    job.status = "RETRYING"
                    job.worker_id = None
                    job.lease_expires_at = None
                    job.error_message = "Recovered from suspected dead worker lease timeout"
                else:
                    logger.error(f"Job {job.id} exceeded max attempts ({job.max_attempts}). Marking FAILED.")
                    job.status = "FAILED"
                    job.lease_expires_at = None
                db.commit()
        except Exception as e:
            db.rollback()
        finally:
            db.close()

# Global singleton supervisor
fleet_supervisor = DistributedWorkerSupervisor()
