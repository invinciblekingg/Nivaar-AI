"""
Udyon & Symbiosis.AI -- Seamless Supabase Database Migration Tool
Migrates all existing local SQLite records (machines, alerts, tasks, incidents,
TENG telemetry, vision defect logs, and circular marketplace records) to Supabase.
Idempotent: Uses primary key upserts to prevent duplicate records.
"""

import os
import sys
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure workspace root is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app.config import settings, BASE_DIR
from backend.app.supabase_client import get_supabase_client, is_supabase_configured
from backend.app.models import (
    Machine, Alert, MaintenanceTask, Incident,
    TengDataset, ImageInspection, SymbiosisEvaluation
)
from backend.app.api.symbiosis_marketplace import COMPANIES_DB, LISTINGS_DB

def run_migration():
    print("=" * 70)
    print("  UDYON -> SUPABASE ENTERPRISE DATABASE MIGRATION")
    print("=" * 70)

    if not is_supabase_configured():
        print("[ERROR] Supabase is not configured. Please ensure SUPABASE_URL and SUPABASE_KEY are in .env")
        return False

    client = get_supabase_client()
    if not client:
        print("[ERROR] Could not connect to Supabase project.")
        return False

    print(f"[INFO] Target Supabase Project: {settings.SUPABASE_URL}")
    print("[INFO] Connecting to local SQLite database...")

    # Connect to SQLite
    sqlite_url = f"sqlite:///{BASE_DIR / 'machineguard.db'}"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    migrated_stats = {
        "machines": 0,
        "alerts": 0,
        "maintenance_tasks": 0,
        "incidents": 0,
        "teng_datasets": 0,
        "image_inspections": 0,
        "symbiosis_companies": 0,
        "symbiosis_materials": 0
    }

    try:
        # 1. Migrate Machines
        print("\n--- Migrating Machines ---")
        machines = db.query(Machine).all()
        for m in machines:
            record = {
                "id": m.id,
                "name": m.name,
                "category": m.category,
                "asset_tag": m.asset_tag,
                "location_label": m.location_label,
                "status": m.status,
                "health_index": m.health_index,
                "profile_config": m.profile_config or {},
                "is_monitored": m.is_monitored,
                "last_analyzed_at": m.last_analyzed_at.isoformat() if m.last_analyzed_at else None,
                "created_at": m.created_at.isoformat() if m.created_at else datetime.utcnow().isoformat(),
                "updated_at": m.updated_at.isoformat() if m.updated_at else datetime.utcnow().isoformat()
            }
            try:
                client.table("machines").upsert(record, on_conflict="id").execute()
                migrated_stats["machines"] += 1
            except Exception as e:
                print(f"  [WARN] Machine '{m.name}' sync error: {e}")
        print(f"  [OK] Successfully migrated {migrated_stats['machines']} machines.")

        # 2. Migrate Alerts
        print("\n--- Migrating Fleet Alerts ---")
        alerts = db.query(Alert).all()
        for a in alerts:
            record = {
                "id": a.id,
                "anomaly_id": a.anomaly_id,
                "machine_id": a.machine_id,
                "severity": a.severity,
                "status": a.status,
                "title": a.title,
                "description": a.description,
                "readings_snapshot": a.readings_snapshot or {},
                "acknowledged_by": a.acknowledged_by,
                "timestamp": a.timestamp.isoformat() if a.timestamp else datetime.utcnow().isoformat(),
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None
            }
            try:
                client.table("alerts").upsert(record, on_conflict="id").execute()
                migrated_stats["alerts"] += 1
            except Exception as e:
                print(f"  [WARN] Alert '{a.title}' sync error: {e}")
        print(f"  [OK] Successfully migrated {migrated_stats['alerts']} alerts.")

        # 3. Migrate Maintenance Tasks
        print("\n--- Migrating Maintenance Work Orders ---")
        tasks = db.query(MaintenanceTask).all()
        for t in tasks:
            record = {
                "id": t.id,
                "machine_id": t.machine_id,
                "alert_id": t.alert_id,
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "assignee": t.assignee,
                "status": t.status,
                "risk_score": t.risk_score,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "audit_trail": t.audit_trail or [],
                "created_at": t.created_at.isoformat() if t.created_at else datetime.utcnow().isoformat(),
                "completed_at": t.completed_at.isoformat() if t.completed_at else None
            }
            try:
                client.table("maintenance_tasks").upsert(record, on_conflict="id").execute()
                migrated_stats["maintenance_tasks"] += 1
            except Exception as e:
                print(f"  [WARN] Task '{t.title}' sync error: {e}")
        print(f"  [OK] Successfully migrated {migrated_stats['maintenance_tasks']} maintenance tasks.")

        # 4. Migrate Incidents
        print("\n--- Migrating Incident Response Records ---")
        incidents = db.query(Incident).all()
        for inc in incidents:
            record = {
                "id": inc.id,
                "machine_id": inc.machine_id,
                "title": inc.title,
                "operational_impact": inc.operational_impact,
                "severity": inc.severity,
                "status": inc.status,
                "timeline": inc.timeline or [],
                "recommended_inspections": inc.recommended_inspections or [],
                "resolution_notes": inc.resolution_notes,
                "created_at": inc.created_at.isoformat() if inc.created_at else datetime.utcnow().isoformat(),
                "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None
            }
            try:
                client.table("incidents").upsert(record, on_conflict="id").execute()
                migrated_stats["incidents"] += 1
            except Exception as e:
                print(f"  [WARN] Incident '{inc.title}' sync error: {e}")
        print(f"  [OK] Successfully migrated {migrated_stats['incidents']} incidents.")

        # 5. Migrate TENG Datasets
        print("\n--- Migrating TENG Vibration Datasets ---")
        teng_list = db.query(TengDataset).all()
        for tds in teng_list:
            record = {
                "id": tds.id,
                "machine_id": tds.machine_id,
                "filename": tds.filename,
                "file_path": tds.file_path,
                "row_count": tds.row_count,
                "summary_metrics": tds.summary_metrics or {},
                "health_index": tds.health_index,
                "max_anomaly_score": tds.max_anomaly_score,
                "fault_flags": tds.fault_flags or [],
                "created_at": tds.created_at.isoformat() if tds.created_at else datetime.utcnow().isoformat()
            }
            try:
                client.table("teng_datasets").upsert(record, on_conflict="id").execute()
                migrated_stats["teng_datasets"] += 1
            except Exception as e:
                print(f"  [WARN] TENG dataset sync error: {e}")
        print(f"  [OK] Successfully migrated {migrated_stats['teng_datasets']} TENG datasets.")

        # 6. Migrate Image Inspections
        print("\n--- Migrating Computer Vision Inspections ---")
        inspections = db.query(ImageInspection).all()
        for insp in inspections:
            record = {
                "id": insp.id,
                "machine_id": insp.machine_id,
                "filename": insp.filename,
                "file_path": insp.file_path,
                "annotated_file_path": insp.annotated_file_path,
                "component_name": insp.component_name,
                "defects": insp.defects or [],
                "total_defects_found": insp.total_defects_found,
                "confirmed_count": insp.confirmed_count,
                "uncertain_count": insp.uncertain_count,
                "max_confidence": insp.max_confidence,
                "visual_severity": insp.visual_severity,
                "visual_condition_score": insp.visual_condition_score,
                "condition_text": insp.condition_text,
                "created_at": insp.created_at.isoformat() if insp.created_at else datetime.utcnow().isoformat()
            }
            try:
                client.table("image_inspections").upsert(record, on_conflict="id").execute()
                migrated_stats["image_inspections"] += 1
            except Exception as e:
                print(f"  [WARN] Image inspection sync error: {e}")
        print(f"  [OK] Successfully migrated {migrated_stats['image_inspections']} image inspections.")

        # 7. Migrate Symbiosis Partner Companies & Materials Marketplace
        print("\n--- Migrating Symbiosis Circular Economy Entities ---")
        for cid, cdata in COMPANIES_DB.items():
            record = {
                "id": cdata["id"],
                "company_name": cdata["companyName"],
                "industry_type": cdata["industryType"],
                "city": cdata["city"],
                "state": cdata["state"],
                "latitude": cdata["coordinates"]["latitude"],
                "longitude": cdata["coordinates"]["longitude"],
                "verified": cdata.get("verified", True)
            }
            try:
                client.table("symbiosis_companies").upsert(record, on_conflict="id").execute()
                migrated_stats["symbiosis_companies"] += 1
            except Exception as e:
                print(f"  [WARN] Symbiosis company sync error: {e}")

        for listing in LISTINGS_DB:
            record = {
                "id": listing["id"],
                "title": listing["title"],
                "company_id": listing["companyId"],
                "company_name": listing["companyName"],
                "type": listing["type"],
                "material_type": listing["materialType"],
                "category": listing["category"],
                "description": listing.get("description", ""),
                "quantity": float(listing.get("quantity", 0)),
                "unit": listing.get("unit", "Metric Tons"),
                "quality": listing.get("quality", {}),
                "pricing": listing.get("pricing", {}),
                "hazardous": listing.get("hazardous", "non-hazardous"),
                "availability": listing.get("availability", "continuous"),
                "verified": listing.get("verified", True),
                "views": listing.get("views", 1),
                "inquiries": listing.get("inquiries", 0),
                "created_at": listing.get("createdAt", datetime.utcnow().isoformat())
            }
            try:
                client.table("symbiosis_materials").upsert(record, on_conflict="id").execute()
                migrated_stats["symbiosis_materials"] += 1
            except Exception as e:
                print(f"  [WARN] Symbiosis material sync error: {e}")
        print(f"  [OK] Migrated {migrated_stats['symbiosis_companies']} partner facilities and {migrated_stats['symbiosis_materials']} marketplace materials.")

    finally:
        db.close()

    print("\n" + "=" * 70)
    print("  MIGRATION SUMMARY:")
    for entity, count in migrated_stats.items():
        print(f"    - {entity}: {count} records migrated")
    print("=" * 70)
    return True

if __name__ == "__main__":
    run_migration()
