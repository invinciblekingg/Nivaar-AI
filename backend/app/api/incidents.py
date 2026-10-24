from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.app.database import get_db
from backend.app.models import Incident, Machine
from backend.app.schemas import IncidentCreate, IncidentUpdate, IncidentResponse
from backend.app.supabase_client import sync_record_to_supabase

router = APIRouter(prefix="/incidents", tags=["Disruption Response Center"])

@router.get("")
def get_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)

    incidents = query.order_by(Incident.created_at.desc()).all()
    res = []
    for inc in incidents:
        m = db.query(Machine).filter(Machine.id == inc.machine_id).first()
        res.append({
            "id": inc.id,
            "machine_id": inc.machine_id,
            "machine_name": m.name if m else "Critical Infrastructure Asset",
            "category": m.category if m else "General",
            "location_label": m.location_label if m else "Facility",
            "title": inc.title,
            "operational_impact": inc.operational_impact,
            "severity": inc.severity,
            "status": inc.status,
            "timeline": inc.timeline or [],
            "recommended_inspections": inc.recommended_inspections or [],
            "resolution_notes": inc.resolution_notes,
            "created_at": inc.created_at.isoformat(),
            "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None
        })
    return res

@router.post("")
def create_incident(data: IncidentCreate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == data.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    incident = Incident(
        machine_id=data.machine_id,
        title=data.title,
        operational_impact=data.operational_impact,
        severity=data.severity,
        status="INVESTIGATING",
        recommended_inspections=data.recommended_inspections or [
            "Perform immediate physical walkdown and vibration acoustic listening.",
            "Review thermal camera imaging across motor/bearing housing."
        ],
        timeline=[{
            "time": datetime.utcnow().isoformat(),
            "event": "Incident manually logged by Operations Controller.",
            "actor": "Human Operator"
        }]
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    try:
        sync_record_to_supabase("incidents", {
            "id": incident.id,
            "machine_id": incident.machine_id,
            "title": incident.title,
            "operational_impact": incident.operational_impact,
            "severity": incident.severity,
            "status": incident.status,
            "timeline": incident.timeline or [],
            "recommended_inspections": incident.recommended_inspections or [],
            "resolution_notes": incident.resolution_notes,
            "created_at": incident.created_at
        })
    except Exception:
        pass

    return incident

@router.put("/{incident_id}")
def update_incident(incident_id: str, data: IncidentUpdate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    tl = list(incident.timeline or [])
    if data.timeline_event:
        tl.append({
            "time": datetime.utcnow().isoformat(),
            "event": data.timeline_event,
            "actor": "Incident Command Responder"
        })

    if data.status:
        incident.status = data.status
        tl.append({
            "time": datetime.utcnow().isoformat(),
            "event": f"Incident status changed to {data.status}.",
            "actor": "Operations Manager"
        })
        if data.status == "RESOLVED":
            incident.resolved_at = datetime.utcnow()

    if data.resolution_notes:
        incident.resolution_notes = data.resolution_notes

    incident.timeline = tl
    db.commit()
    db.refresh(incident)

    try:
        sync_record_to_supabase("incidents", {
            "id": incident.id,
            "machine_id": incident.machine_id,
            "title": incident.title,
            "operational_impact": incident.operational_impact,
            "severity": incident.severity,
            "status": incident.status,
            "timeline": incident.timeline or [],
            "recommended_inspections": incident.recommended_inspections or [],
            "resolution_notes": incident.resolution_notes,
            "resolved_at": incident.resolved_at
        })
    except Exception:
        pass

    return incident
