from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.app.database import get_db
from backend.app.models import MaintenanceTask, Machine, Alert
from backend.app.schemas import (
    MaintenanceTaskCreate, MaintenanceTaskUpdate, MaintenanceTaskResponse
)

router = APIRouter(prefix="/maintenance", tags=["Predictive Maintenance"])

@router.get("/tasks")
def get_maintenance_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    machine_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MaintenanceTask)
    if status:
        query = query.filter(MaintenanceTask.status == status)
    if priority:
        query = query.filter(MaintenanceTask.priority == priority)
    if machine_id:
        query = query.filter(MaintenanceTask.machine_id == machine_id)

    tasks = query.order_by(MaintenanceTask.created_at.desc()).all()
    res = []
    for t in tasks:
        m = db.query(Machine).filter(Machine.id == t.machine_id).first()
        res.append({
            "id": t.id,
            "machine_id": t.machine_id,
            "machine_name": m.name if m else "Unknown Equipment",
            "alert_id": t.alert_id,
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "assignee": t.assignee,
            "status": t.status,
            "risk_score": t.risk_score,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "audit_trail": t.audit_trail or [],
            "created_at": t.created_at.isoformat(),
            "completed_at": t.completed_at.isoformat() if t.completed_at else None
        })
    return res

@router.post("/tasks")
def create_maintenance_task(data: MaintenanceTaskCreate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == data.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    task = MaintenanceTask(
        machine_id=data.machine_id,
        alert_id=data.alert_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        assignee=data.assignee,
        status="OPEN",
        risk_score=data.risk_score,
        due_date=data.due_date,
        audit_trail=[{
            "timestamp": datetime.utcnow().isoformat(),
            "user": "Maintenance Supervisor",
            "action": "TASK_CREATED",
            "note": "Manual work order issued."
        }]
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.put("/tasks/{task_id}")
def update_maintenance_task(task_id: str, data: MaintenanceTaskUpdate, db: Session = Depends(get_db)):
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")

    trail = list(task.audit_trail or [])
    if data.status and data.status != task.status:
        trail.append({
            "timestamp": datetime.utcnow().isoformat(),
            "user": "Maintenance Tech",
            "action": f"STATUS_CHANGED_{data.status}",
            "note": data.audit_note or f"Status shifted from {task.status} to {data.status}"
        })
        task.status = data.status
        if data.status == "COMPLETED":
            task.completed_at = datetime.utcnow()

    if data.title:
        task.title = data.title
    if data.description:
        task.description = data.description
    if data.priority:
        task.priority = data.priority
    if data.assignee:
        task.assignee = data.assignee
    if data.due_date:
        task.due_date = data.due_date

    task.audit_trail = trail
    db.commit()
    db.refresh(task)
    return task
