import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models import Machine, ImageInspection
from backend.app.supabase_client import upload_file_to_supabase, sync_record_to_supabase
from ml.image_detector import ImageDefectDetector

router = APIRouter(prefix="/vision", tags=["AI Image Analysis Platform"])

detector = ImageDefectDetector(output_dir=str(settings.STORAGE_DIR / "annotated_images"))

@router.get("/samples")
def get_sample_images():
    """Lists preloaded industrial component inspection images with known defects and authentic unseen test sets."""
    return [
        {
            "id": "sample-crack",
            "name": "Bearing Outer Race Structural Crack",
            "filename": "bearing_outer_race_crack.jpg",
            "component": "Drive-End Bearing",
            "sector": "Sector 1: Rotating Machinery & Bearings",
            "target_machine_id": "m-motor-104",
            "description": "Severe linear surface fissure along outer raceway under cyclic rotational load.",
            "expected_defects": ["Structural Crack", "Linear Fissure"],
            "expected_severity": "CRITICAL"
        },
        {
            "id": "sample-corrosion",
            "name": "Centrifugal Pump Volute Casing Corrosion",
            "filename": "pump_casing_corrosion.jpg",
            "component": "Pump Volute Casing",
            "sector": "Sector 2: Industrial Infrastructure & Fluid Casing",
            "target_machine_id": "m-pump-201",
            "description": "Extensive iron-oxide oxidation rust patches on exterior fluid casing.",
            "expected_defects": ["Pitting Corrosion", "Iron-Oxide Rust"],
            "expected_severity": "SEVERE"
        },
        {
            "id": "sample-spalling",
            "name": "Motor Mounting Flange Mechanical Spalling",
            "filename": "motor_flange_spalling.jpg",
            "component": "Motor Drive Flange",
            "sector": "Sector 1: Rotating Machinery & Motors",
            "target_machine_id": "m-motor-104",
            "description": "Surface wear craters, micro-indentation pitting, and material fatigue flaking.",
            "expected_defects": ["Wear Spalling", "Fatigue Pitting"],
            "expected_severity": "MODERATE"
        },
        {
            "id": "neu-test-crazing",
            "name": "NEU Test Sample: Micro-Crazing Fissures",
            "filename": "neu_test_crazing.jpg",
            "component": "Hot-Rolled Steel Strip",
            "sector": "Sector 2: Manufacturing & Industrial Surface Defects (NEU-CLS Benchmark)",
            "target_machine_id": "m-motor-104",
            "description": "Unseen test image from Northeastern University benchmark. Fine micro-crazing fracture web.",
            "expected_defects": ["Crazing", "Micro-Fractures"],
            "expected_severity": "MODERATE"
        },
        {
            "id": "neu-test-inclusion",
            "name": "NEU Test Sample: Slag Inclusion Defect",
            "filename": "neu_test_inclusion.jpg",
            "component": "Alloy Surface Strip",
            "sector": "Sector 2: Manufacturing & Industrial Surface Defects (NEU-CLS Benchmark)",
            "target_machine_id": "m-motor-104",
            "description": "Unseen test image with foreign non-metallic slag inclusions rolled into metal matrix.",
            "expected_defects": ["Inclusion", "Material Flaw"],
            "expected_severity": "HIGH"
        },
        {
            "id": "neu-test-pitting",
            "name": "NEU Test Sample: Pitted Cavitation Surface",
            "filename": "neu_test_pitting.jpg",
            "component": "Hydraulic Surface Strip",
            "sector": "Sector 2: Manufacturing & Industrial Surface Defects (NEU-CLS Benchmark)",
            "target_machine_id": "m-pump-201",
            "description": "Unseen test image exhibiting localized surface pit cavities from material erosion.",
            "expected_defects": ["Pitted Surface", "Cavitation Pitting"],
            "expected_severity": "MODERATE"
        },
        {
            "id": "neu-test-scratches",
            "name": "NEU Test Sample: High-Velocity Surface Scratches",
            "filename": "neu_test_scratches.jpg",
            "component": "High-Speed Roller Strip",
            "sector": "Sector 2: Manufacturing & Industrial Surface Defects (NEU-CLS Benchmark)",
            "target_machine_id": "m-motor-104",
            "description": "Unseen test image with mechanical grooving and abrasive scratches.",
            "expected_defects": ["Scratches", "Abrasive Wear"],
            "expected_severity": "MEDIUM"
        },
        {
            "id": "sector3-civil-crack",
            "name": "Civil Infrastructure Structural Crack (Sector 3)",
            "filename": "civil_concrete_crack.jpg",
            "component": "Foundation / Concrete Pedestal",
            "sector": "Sector 3: Structural Infrastructure & Roads",
            "target_machine_id": "m-motor-104",
            "description": "Tang & Chen civil infrastructure benchmark specimen featuring longitudinal tensile fracture.",
            "expected_defects": ["Structural Crack", "Tensile Fracture"],
            "expected_severity": "CRITICAL"
        },
        {
            "id": "sector3-healthy-surface",
            "name": "Nominal Surface Baseline (Zero Defects)",
            "filename": "healthy_machined_surface.jpg",
            "component": "Precision Machined Raceway",
            "sector": "Sector 1: Rotating Machinery & Bearings",
            "target_machine_id": "m-motor-104",
            "description": "Pristine machined surface baseline demonstrating zero false alarm rate.",
            "expected_defects": [],
            "expected_severity": "NEGLIGIBLE"
        }
    ]

@router.post("/inspect")
async def inspect_component_image(
    machine_id: str = Form(...),
    component_name: str = Form("Machine Component"),
    file: Optional[UploadFile] = File(None),
    sample_filename: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    target_image_path = None
    orig_filename = ""

    if file and file.filename:
        orig_filename = file.filename
        file_id = f"img_{machine_id}_{int(datetime.utcnow().timestamp())}_{orig_filename}"
        target_image_path = settings.UPLOAD_DIR / file_id

        # Save file
        with open(target_image_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    elif sample_filename:
        orig_filename = sample_filename
        source_sample = settings.DEMO_DATA_DIR / "images" / sample_filename
        if not os.path.exists(source_sample):
            raise HTTPException(status_code=404, detail=f"Sample image {sample_filename} not found.")
        
        file_id = f"sample_{machine_id}_{int(datetime.utcnow().timestamp())}_{sample_filename}"
        target_image_path = settings.UPLOAD_DIR / file_id
        shutil.copyfile(source_sample, target_image_path)
    else:
        raise HTTPException(status_code=400, detail="Must provide an image upload or select a preloaded sample image.")

    try:
        # Run computer vision defect detection
        analysis = detector.analyze_image(str(target_image_path), component_name)

        # Store in database
        inspection = ImageInspection(
            machine_id=machine_id,
            filename=orig_filename,
            file_path=str(target_image_path),
            annotated_file_path=analysis["annotated_image_path"],
            component_name=component_name,
            defects=analysis["defects"],
            total_defects_found=analysis["total_defects_found"],
            confirmed_count=analysis["confirmed_count"],
            uncertain_count=analysis["uncertain_count"],
            max_confidence=analysis["max_confidence"],
            visual_severity=analysis["visual_severity"],
            visual_condition_score=analysis["visual_condition_score"],
            condition_text=analysis["condition_text"]
        )
        db.add(inspection)
        db.commit()
        db.refresh(inspection)

        # Upload images to Supabase Storage and sync record
        raw_storage_url = None
        annotated_storage_url = None
        try:
            with open(target_image_path, "rb") as f_raw:
                raw_bytes = f_raw.read()
            raw_storage_url = upload_file_to_supabase(
                bucket_name=settings.SUPABASE_BUCKET_IMAGES,
                remote_path=f"raw/{os.path.basename(target_image_path)}",
                file_bytes=raw_bytes
            )

            annotated_path = analysis["annotated_image_path"]
            if os.path.exists(annotated_path):
                with open(annotated_path, "rb") as f_ann:
                    ann_bytes = f_ann.read()
                annotated_storage_url = upload_file_to_supabase(
                    bucket_name=settings.SUPABASE_BUCKET_IMAGES,
                    remote_path=f"annotated/{analysis['annotated_filename']}",
                    file_bytes=ann_bytes
                )

            sync_record_to_supabase("image_inspections", {
                "id": inspection.id,
                "machine_id": machine_id,
                "filename": orig_filename,
                "file_path": str(target_image_path),
                "raw_storage_url": raw_storage_url,
                "annotated_file_path": str(analysis["annotated_image_path"]),
                "annotated_storage_url": annotated_storage_url,
                "component_name": component_name,
                "defects": analysis["defects"],
                "total_defects_found": analysis["total_defects_found"],
                "confirmed_count": analysis["confirmed_count"],
                "uncertain_count": analysis["uncertain_count"],
                "max_confidence": analysis["max_confidence"],
                "visual_severity": analysis["visual_severity"],
                "visual_condition_score": analysis["visual_condition_score"],
                "condition_text": analysis["condition_text"],
                "created_at": inspection.created_at
            })
        except Exception:
            pass

        created_at_iso = inspection.created_at.isoformat() if inspection.created_at else datetime.utcnow().isoformat()

        return {
            "status": "success",
            "id": inspection.id,
            "inspection_id": inspection.id,
            "machine_id": machine_id,
            "component_name": component_name,
            "filename": orig_filename,
            "raw_image_url": f"/api/vision/image/raw/{os.path.basename(target_image_path)}",
            "annotated_image_url": f"/api/vision/image/annotated/{analysis['annotated_filename']}",
            "raw_storage_url": raw_storage_url,
            "annotated_storage_url": annotated_storage_url,
            "visual_severity": analysis["visual_severity"],
            "visual_condition_score": analysis["visual_condition_score"],
            "condition_text": analysis["condition_text"],
            "defect_count": analysis["total_defects_found"],
            "total_defects": analysis["total_defects_found"],
            "confirmed_count": analysis["confirmed_count"],
            "uncertain_count": analysis["uncertain_count"],
            "max_confidence": analysis["max_confidence"],
            "deep_classification": analysis.get("deep_classification"),
            "deep_crack_classification": analysis.get("deep_crack_classification"),
            "defects": analysis["defects"],
            "created_at": created_at_iso
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computer vision analysis error: {str(e)}")

@router.get("/sectors")
def get_verified_sectors_catalog():
    """
    Returns authentic multi-sector research dataset provenance, sample counts,
    and verified test-set accuracy & confusion matrix metrics.
    """
    import json
    data_dir = settings.BASE_DIR / "benchmark_data"
    manifest_path = data_dir / "dataset_manifest.json"
    eval_path = data_dir / "evaluation_metrics.json"

    manifest = {}
    if manifest_path.exists():
        with open(manifest_path, "r") as mf:
            manifest = json.load(mf)

    eval_metrics = {}
    if eval_path.exists():
        with open(eval_path, "r") as ef:
            eval_metrics = json.load(ef)

    return {
        "status": "success",
        "platform": "Udyon Multi-Sector Predictive Platform",
        "dataset_manifest": manifest,
        "evaluation_metrics": eval_metrics
    }

@router.get("/charts/{filename}")
def get_evaluation_chart(filename: str):
    """Serves authentic training evaluation graphs and confusion matrices."""
    chart_path = settings.BASE_DIR / "benchmark_data" / "charts" / filename
    if not chart_path.exists():
        raise HTTPException(status_code=404, detail=f"Chart {filename} not found.")
    return FileResponse(str(chart_path))

@router.get("/inspections/{machine_id}")
def get_machine_inspections(machine_id: str, db: Session = Depends(get_db)):
    inspections = db.query(ImageInspection).filter(
        ImageInspection.machine_id == machine_id
    ).order_by(ImageInspection.created_at.desc()).all()

    res = []
    for insp in inspections:
        res.append({
            "id": insp.id,
            "inspection_id": insp.id,
            "machine_id": insp.machine_id,
            "filename": insp.filename,
            "component_name": insp.component_name,
            "raw_image_url": f"/api/vision/image/raw/{os.path.basename(insp.file_path)}",
            "annotated_image_url": f"/api/vision/image/annotated/{os.path.basename(insp.annotated_file_path)}",
            "visual_severity": insp.visual_severity,
            "visual_condition_score": insp.visual_condition_score,
            "condition_text": insp.condition_text,
            "defect_count": insp.total_defects_found,
            "total_defects": insp.total_defects_found,
            "confirmed_count": insp.confirmed_count,
            "uncertain_count": insp.uncertain_count,
            "max_confidence": insp.max_confidence,
            "defects": insp.defects or [],
            "created_at": insp.created_at.isoformat() if insp.created_at else datetime.utcnow().isoformat()
        })
    return res

@router.get("/inspection/{inspection_id}")
def get_single_inspection(inspection_id: str, db: Session = Depends(get_db)):
    insp = db.query(ImageInspection).filter(ImageInspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return {
        "id": insp.id,
        "inspection_id": insp.id,
        "machine_id": insp.machine_id,
        "filename": insp.filename,
        "component_name": insp.component_name,
        "raw_image_url": f"/api/vision/image/raw/{os.path.basename(insp.file_path)}",
        "annotated_image_url": f"/api/vision/image/annotated/{os.path.basename(insp.annotated_file_path)}",
        "visual_severity": insp.visual_severity,
        "visual_condition_score": insp.visual_condition_score,
        "condition_text": insp.condition_text,
        "defect_count": insp.total_defects_found,
        "total_defects": insp.total_defects_found,
        "confirmed_count": insp.confirmed_count,
        "uncertain_count": insp.uncertain_count,
        "max_confidence": insp.max_confidence,
        "defects": insp.defects or [],
        "created_at": insp.created_at.isoformat() if insp.created_at else datetime.utcnow().isoformat()
    }

from pydantic import BaseModel

class DefectUpdateRequest(BaseModel):
    defects: List[dict]
    notes: Optional[str] = None
    reviewer_name: Optional[str] = None
    visual_severity: Optional[str] = None

@router.put("/inspections/{inspection_id}")
@router.post("/inspections/{inspection_id}/update-defects")
def update_inspection_defects(
    inspection_id: str, 
    payload: DefectUpdateRequest, 
    db: Session = Depends(get_db)
):
    """
    Allows engineering personnel to review, confirm, reject, or adjust defect bounding boxes
    prior to final consolidated report generation. Re-renders the red annotations and persists to Supabase.
    """
    insp = db.query(ImageInspection).filter(ImageInspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection record not found")

    updated_defects = payload.defects
    confirmed_count = sum(1 for d in updated_defects if d.get("is_confirmed", True))
    uncertain_count = sum(1 for d in updated_defects if not d.get("is_confirmed", True))
    max_conf = max([d.get("confidence", 0.0) for d in updated_defects], default=0.0)

    # Determine severity
    if payload.visual_severity:
        severity = payload.visual_severity
    elif any(d.get("defect_type") == "crack" and d.get("is_confirmed", True) for d in updated_defects):
        severity = "CRITICAL"
    elif any(d.get("defect_type") == "corrosion" and d.get("is_confirmed", True) for d in updated_defects):
        severity = "SEVERE"
    elif confirmed_count > 0:
        severity = "MODERATE"
    else:
        severity = "LOW"

    # Re-render annotated image with updated red boxes
    try:
        raw_path = insp.file_path
        if not os.path.exists(raw_path):
            # Check demo images fallback
            demo_fallback = settings.DEMO_DATA_DIR / "images" / insp.filename
            if os.path.exists(demo_fallback):
                raw_path = str(demo_fallback)

        if os.path.exists(raw_path):
            annotated_filename = os.path.basename(insp.annotated_file_path)
            new_ann_path = detector.reannotate_image(raw_path, updated_defects, annotated_filename)
            insp.annotated_file_path = new_ann_path

            # Re-upload to Supabase
            try:
                with open(new_ann_path, "rb") as f_ann:
                    ann_bytes = f_ann.read()
                upload_file_to_supabase(
                    bucket_name=settings.SUPABASE_BUCKET_IMAGES,
                    remote_path=f"annotated/{annotated_filename}",
                    file_bytes=ann_bytes
                )
            except Exception:
                pass
    except Exception as e:
        print(f"[WARN] Re-annotation error: {e}")

    # Persist in DB
    insp.defects = updated_defects
    insp.total_defects_found = len(updated_defects)
    insp.confirmed_count = confirmed_count
    insp.uncertain_count = uncertain_count
    insp.max_confidence = max_conf
    insp.visual_severity = severity
    db.commit()
    db.refresh(insp)

    # Sync to Supabase
    try:
        sync_record_to_supabase("image_inspections", {
            "id": insp.id,
            "machine_id": insp.machine_id,
            "filename": insp.filename,
            "component_name": insp.component_name,
            "defects": updated_defects,
            "total_defects_found": len(updated_defects),
            "confirmed_count": confirmed_count,
            "uncertain_count": uncertain_count,
            "max_confidence": max_conf,
            "visual_severity": severity,
            "created_at": insp.created_at
        })
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Inspection defects successfully verified and saved.",
        "inspection_id": insp.id,
        "defect_count": len(updated_defects),
        "confirmed_count": confirmed_count,
        "visual_severity": severity,
        "annotated_image_url": f"/api/vision/image/annotated/{os.path.basename(insp.annotated_file_path)}?t={int(datetime.utcnow().timestamp())}",
        "defects": updated_defects
    }

@router.get("/image/{img_type}/{filename}")
def get_inspection_image(img_type: str, filename: str):
    if img_type == "annotated":
        path = settings.STORAGE_DIR / "annotated_images" / filename
    else:
        path = settings.UPLOAD_DIR / filename

    if not os.path.exists(path):
        # Fallback to demo images if needed
        demo_path = settings.DEMO_DATA_DIR / "images" / filename
        if os.path.exists(demo_path):
            path = demo_path
        else:
            raise HTTPException(status_code=404, detail="Image file not found.")

    return FileResponse(
        str(path),
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Cache-Control": "public, max-age=3600"
        }
    )

