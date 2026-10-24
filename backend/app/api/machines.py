from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.app.database import get_db
from backend.app.models import Machine, SensorReading, Anomaly, Alert
from backend.app.schemas import MachineCreate, MachineUpdate, MachineResponse
from backend.app.supabase_client import sync_record_to_supabase, get_supabase_client

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("", response_model=List[MachineResponse])
def get_machines(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Machine)
    if category:
        query = query.filter(Machine.category == category)
    if status:
        query = query.filter(Machine.status == status)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Machine.name.ilike(search_fmt)) | 
            (Machine.asset_tag.ilike(search_fmt)) |
            (Machine.location_label.ilike(search_fmt))
        )
    return query.order_by(Machine.created_at.desc()).all()

@router.get("/{machine_id}")
def get_machine_detail(machine_id: str, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # Recent alerts
    recent_alerts = db.query(Alert).filter(Alert.machine_id == machine_id).order_by(Alert.timestamp.desc()).limit(5).all()
    # Recent anomalies
    recent_anomalies = db.query(Anomaly).filter(Anomaly.machine_id == machine_id).order_by(Anomaly.timestamp.desc()).limit(10).all()

    return {
        "machine": machine,
        "recent_alerts": recent_alerts,
        "recent_anomalies": recent_anomalies
    }

@router.post("", response_model=MachineResponse)
def create_machine(data: MachineCreate, db: Session = Depends(get_db)):
    existing = db.query(Machine).filter(Machine.asset_tag == data.asset_tag).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Asset tag {data.asset_tag} already exists.")
    
    machine = Machine(
        name=data.name,
        category=data.category,
        asset_tag=data.asset_tag,
        location_label=data.location_label,
        status=data.status,
        health_index=data.health_index,
        profile_config=data.profile_config or {},
        is_monitored=data.is_monitored
    )
    db.add(machine)
    db.commit()
    db.refresh(machine)

    # Sync to Supabase
    try:
        sync_record_to_supabase("machines", {
            "id": machine.id,
            "name": machine.name,
            "category": machine.category,
            "asset_tag": machine.asset_tag,
            "location_label": machine.location_label,
            "status": machine.status,
            "health_index": machine.health_index,
            "profile_config": machine.profile_config or {},
            "is_monitored": machine.is_monitored,
            "created_at": machine.created_at,
            "updated_at": machine.updated_at
        })
    except Exception:
        pass

    return machine

@router.put("/{machine_id}", response_model=MachineResponse)
def update_machine(machine_id: str, data: MachineUpdate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(machine, field, val)
        
    machine.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(machine)

    # Sync to Supabase
    try:
        sync_record_to_supabase("machines", {
            "id": machine.id,
            "name": machine.name,
            "category": machine.category,
            "asset_tag": machine.asset_tag,
            "location_label": machine.location_label,
            "status": machine.status,
            "health_index": machine.health_index,
            "profile_config": machine.profile_config or {},
            "is_monitored": machine.is_monitored,
            "updated_at": machine.updated_at
        })
    except Exception:
        pass

    return machine

@router.delete("/{machine_id}")
def delete_machine(machine_id: str, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    db.delete(machine)
    db.commit()

    # Sync deletion to Supabase
    try:
        client = get_supabase_client()
        if client:
            client.table("machines").delete().eq("id", machine_id).execute()
    except Exception:
        pass

    return {"status": "success", "message": f"Machine {machine.name} deleted."}
