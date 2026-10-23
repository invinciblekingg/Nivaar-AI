import os
import uuid
import pytest
from datetime import datetime
from backend.app.database import SessionLocal
from backend.app.models import AnalysisJob, AnalysisResult, Machine
from workers.tasks import execute_job_analysis

def test_job_idempotency():
    db = SessionLocal()
    try:
        machine = db.query(Machine).first()
        assert machine is not None, "Need at least one machine seeded"

        job_key = f"test_idemp_{uuid.uuid4()}"
        job = AnalysisJob(
            machine_id=machine.id,
            idempotency_key=job_key,
            status="PENDING",
            attempts=0
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # First execution
        res1 = execute_job_analysis(job.id, worker_id="worker_test_1")
        assert res1.get("status") in ["success", "already_completed"]

        db.refresh(job)
        assert job.status == "COMPLETED"

        # Second execution with same job_id (simulating duplicate retry / duplicate message delivery)
        res2 = execute_job_analysis(job.id, worker_id="worker_test_2")
        assert res2.get("status") == "already_completed", "Idempotency check must skip re-processing"

        # Verify only one AnalysisResult exists for this job
        results_count = db.query(AnalysisResult).filter(AnalysisResult.job_id == job.id).count()
        assert results_count == 1, "There must be exactly one result persisted"

    finally:
        db.close()
