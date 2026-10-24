import urllib.request
import urllib.parse
import json
import sys

def run_tests():
    print("--- 1. Testing Backend Health & API Gateway ---")
    try:
        req = urllib.request.urlopen("http://localhost:8000/api/health", timeout=5)
        health = json.loads(req.read().decode())
        print(f"Health check status: {health.get('status')} | Version: {health.get('version')}")
        assert health.get('status') == 'healthy'
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

    print("\n--- 2. Testing AI Vision Defect Detection Pipeline (Bearing Crack Sample) ---")
    # Inspect bearing_outer_race_crack.jpg on m-motor-104
    payload = urllib.parse.urlencode({
        "machine_id": "m-motor-104",
        "sample_filename": "bearing_outer_race_crack.jpg",
        "component_name": "Drive-End Cylindrical Bearing Ring"
    }).encode("utf-8")
    
    req = urllib.request.Request(
        "http://localhost:8000/api/vision/inspect",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    res = urllib.request.urlopen(req, timeout=15)
    inspection = json.loads(res.read().decode())
    insp_id = inspection["id"]
    defects = inspection.get("defects", [])
    print(f"Inspection ID: {insp_id}")
    print(f"Visual Severity: {inspection.get('visual_severity')}")
    print(f"Defect Count: {len(defects)}")
    print(f"Annotated Image URL: {inspection.get('annotated_image_url')}")
    assert len(defects) > 0, "Expected at least 1 defect detected"
    
    first_defect = defects[0]
    print(f"Defect 0: {first_defect.get('label')} | Type: {first_defect.get('defect_type')} | Confidence: {first_defect.get('confidence')}")
    print(f"Bounding Box: {first_defect.get('bbox')}")
    print(f"Has Segmentation Mask: {first_defect.get('has_segmentation_mask')}")
    print(f"SVG Path length: {len(first_defect.get('svg_path', ''))}")
    assert first_defect.get('has_segmentation_mask') is True, "Expected segmentation mask on crack defect"
    assert len(first_defect.get('svg_path', '')) > 0, "Expected valid SVG path for irregular crack"

    print("\n--- 3. Testing User Review & Defect Confirmation Endpoint ---")
    # Update defects: confirm first defect
    defects[0]["is_confirmed"] = True
    update_payload = json.dumps({
        "defects": defects,
        "reviewer_notes": "Reviewed and confirmed by Lead NDT Technician on Nivaar AI",
        "reviewer_name": "Chief Diagnostic Engineer"
    }).encode("utf-8")

    req_update = urllib.request.Request(
        f"http://localhost:8000/api/vision/inspections/{insp_id}/update-defects",
        data=update_payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    res_update = urllib.request.urlopen(req_update, timeout=10)
    update_result = json.loads(res_update.read().decode())
    print(f"Update Result Status: {update_result.get('status')}")
    print(f"Re-annotated Image: {update_result.get('annotated_image_url')}")
    assert update_result.get("status") == "success"

    print("\n--- 4. Testing Final Report Studio Multimodal Bundle API ---")
    req_bundle = urllib.request.urlopen(f"http://localhost:8000/api/reports/bundle/m-motor-104?inspection_id={insp_id}", timeout=10)
    bundle = json.loads(req_bundle.read().decode())
    insp = bundle.get('selected_inspection') or {}
    print(f"Bundle Inspection Defect Count: {len(insp.get('defects', []))}")
    teng = bundle.get('teng_telemetry', {})
    print(f"TENG Telemetry: V_pp={teng.get('metrics', {}).get('v_pp')} V")
    integrity = bundle.get('integrity_check', {})
    print(f"Integrity check is_complete: {integrity.get('is_complete')} | notes: {integrity.get('notes')}")
    assert bundle['machine']['id'] == 'm-motor-104'

    print("\n--- 5. Testing Consolidated Engineering PDF Generation ---")
    pdf_payload = json.dumps({
        "machine_id": "m-motor-104",
        "inspection_id": insp_id,
        "reviewer_name": "Dr. Sarah Chen, Chief Reliability Engineer",
        "reviewer_title": "Senior Staff Diagnostic Engineer",
        "reviewer_notes": "All visible crack defects verified with pure red bounding box contours. TENG high-voltage harmonic spikes correlate with mechanical outer race impact shocks. Immediate raceway replacement recommended.",
        "maintenance_priority": "CRITICAL",
        "sign_off_status": "Certified True & Accurate"
    }).encode("utf-8")

    req_pdf = urllib.request.Request(
        "http://localhost:8000/api/reports/consolidated-pdf",
        data=pdf_payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    res_pdf = urllib.request.urlopen(req_pdf, timeout=20)
    pdf_bytes = res_pdf.read()
    print(f"Generated PDF Size: {len(pdf_bytes)} bytes ({len(pdf_bytes)/1024:.1f} KB)")
    print(f"PDF Header: {pdf_bytes[:10]}")
    assert pdf_bytes.startswith(b"%PDF"), "Response is not a valid PDF file"
    assert len(pdf_bytes) > 20000, f"PDF file size too small: {len(pdf_bytes)}"

    # Save artifact copy
    with open("consolidated_test_report.pdf", "wb") as f:
        f.write(pdf_bytes)
    print("Consolidated PDF saved to consolidated_test_report.pdf")

    print("\n--- 6. Verifying Frontend Dev Server ---")
    req_fe = urllib.request.urlopen("http://localhost:5173", timeout=5)
    fe_html = req_fe.read().decode()
    print(f"Frontend HTTP Status: {req_fe.getcode()} | HTML Length: {len(fe_html)} bytes")
    assert "Udyon" in fe_html or "Nivaar" in fe_html, "Expected platform title in frontend HTML"

    print("\n==============================================")
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==============================================")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
