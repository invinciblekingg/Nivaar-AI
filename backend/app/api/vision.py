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
from ml.image_detector import ImageDefectDetector

router = APIRouter(prefix="/vision", tags=["AI Image Analysis Platform"])

detector = ImageDefectDetector(output_dir=str(settings.STORAGE_DIR / "annotated_images"))

@router.get("/samples")
def get_sample_images():
    """Lists preloaded industrial component inspection images with known defects."""
    return [
        {
            "id": "sample-crack",
            "name": "Bearing Outer Race Structural Crack",
            "filename": "bearing_outer_race_crack.jpg",
            "component": "Drive-End Bearing",
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
            "target_machine_id": "m-motor-104",
            "description": "Surface wear craters, micro-indentation pitting, and material fatigue flaking.",
            "expected_defects": ["Wear Spalling", "Fatigue Pitting"],
            "expected_severity": "MODERATE"
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
            "visual_severity": analysis["visual_severity"],
            "visual_condition_score": analysis["visual_condition_score"],
            "condition_text": analysis["condition_text"],
            "defect_count": analysis["total_defects_found"],
            "total_defects": analysis["total_defects_found"],
            "confirmed_count": analysis["confirmed_count"],
            "uncertain_count": analysis["uncertain_count"],
            "max_confidence": analysis["max_confidence"],
            "defects": analysis["defects"],
            "created_at": created_at_iso
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computer vision analysis error: {str(e)}")

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

    return FileResponse(str(path))
