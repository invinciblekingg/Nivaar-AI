from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.app.database import get_db
from backend.app.models import Alert, Machine
from backend.app.schemas import AlertUpdate
from backend.app.supabase_client import sync_record_to_supabase

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("")
def get_alerts(
    machine_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if machine_id:
        query = query.filter(Alert.machine_id == machine_id)
    if severity:
        query = query.filter(Alert.severity == severity)
    if status:
        query = query.filter(Alert.status == status)

    alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()
    res = []
    for a in alerts:
        m = db.query(Machine).filter(Machine.id == a.machine_id).first()
        res.append({
            "id": a.id,
            "machine_id": a.machine_id,
            "machine_name": m.name if m else "Monitored Asset",
            "anomaly_id": a.anomaly_id,
            "severity": a.severity,
            "status": a.status,
            "title": a.title,
            "description": a.description,
            "readings_snapshot": a.readings_snapshot or {},
            "acknowledged_by": a.acknowledged_by,
            "timestamp": a.timestamp.isoformat() if a.timestamp else datetime.utcnow().isoformat(),
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None
        })
    return res

@router.put("/{alert_id}")
def update_alert(
    alert_id: str,
    data: AlertUpdate,
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if data.status:
        alert.status = data.status
        if data.status == "RESOLVED":
            alert.resolved_at = datetime.utcnow()
    if data.acknowledged_by:
        alert.acknowledged_by = data.acknowledged_by

    db.commit()
    db.refresh(alert)

    try:
        sync_record_to_supabase("alerts", {
            "id": alert.id,
            "machine_id": alert.machine_id,
            "severity": alert.severity,
            "status": alert.status,
            "title": alert.title,
            "description": alert.description,
            "acknowledged_by": alert.acknowledged_by,
            "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None
        })
    except Exception:
        pass

    m = db.query(Machine).filter(Machine.id == alert.machine_id).first()
    return {
        "id": alert.id,
        "machine_id": alert.machine_id,
        "machine_name": m.name if m else "Monitored Asset",
        "anomaly_id": alert.anomaly_id,
        "severity": alert.severity,
        "status": alert.status,
        "title": alert.title,
        "description": alert.description,
        "readings_snapshot": alert.readings_snapshot or {},
        "acknowledged_by": alert.acknowledged_by,
        "timestamp": alert.timestamp.isoformat() if alert.timestamp else datetime.utcnow().isoformat(),
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None
    }
