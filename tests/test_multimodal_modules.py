import pytest
import os
import pandas as pd
import numpy as np
from PIL import Image

from ml.teng_analyzer import TengAnalyzer
from ml.image_detector import ImageDefectDetector
from ml.symbiosis_engine import SymbiosisMultimodalFusion
from backend.app.config import settings

def test_teng_analyzer_feature_extraction():
    analyzer = TengAnalyzer()
    # Create synthetic TENG data
    t = np.linspace(0, 10, 100)
    v = 5.0 * np.sin(2 * np.pi * 30.0 * t) + np.random.normal(0, 0.2, 100)
    df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01", periods=100, freq="100ms"),
        "voltage_v": v,
        "vibration_frequency_hz": np.full(100, 30.0),
        "signal_amplitude_vpp": np.full(100, 10.0),
        "charge_transfer_nc": np.full(100, 2.5)
    })

    result = analyzer.analyze_teng_dataset(df, "Test Motor")
    assert "summary_metrics" in result
    assert "health_index" in result
    assert 0.0 <= result["health_index"] <= 100.0
    metrics = result["summary_metrics"]
    assert metrics["vpp"] > 0
    assert metrics["vrms"] > 0
    assert metrics["dominant_freq_hz"] > 0
    assert "anomalies" in result

def test_image_defect_detector():
    detector = ImageDefectDetector(output_dir=str(settings.STORAGE_DIR / "annotated_images"))
    # Test on generated sample image if exists
    test_img = settings.DEMO_DATA_DIR / "images" / "bearing_outer_race_crack.jpg"
    if not os.path.exists(test_img):
        img = Image.new("RGB", (400, 400), color=(100, 100, 100))
        test_img = settings.DEMO_DATA_DIR / "images" / "dummy_test.jpg"
        img.save(test_img)

    result = detector.analyze_image(str(test_img), "Drive Bearing")
    assert "defects" in result
    assert "total_defects_found" in result
    assert "visual_condition_score" in result
    assert 0.0 <= result["visual_condition_score"] <= 100.0
    assert result["visual_severity"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    for defect in result["defects"]:
        assert 0.0 <= defect["confidence"] <= 1.0
        assert len(defect["bbox"]) == 4

def test_symbiosis_multimodal_fusion():
    teng_summary = {
        "health_index": 62.0,
        "max_anomaly_score": 0.55,
        "summary_metrics": {
            "v_pp": 24.5,
            "v_rms": 8.2,
            "crest_factor": 4.8,
            "dominant_frequency_hz": 89.4,
            "charge_transfer_nc": 5.1,
            "v_kurtosis": 5.8
        },
        "fault_flags": ["HIGH_VIBRATION_SPIKE"]
    }
    vision_summary = {
        "visual_condition_score": 58.0,
        "visual_severity": "HIGH",
        "defects": [
            {
                "type": "Structural Crack",
                "label": "Structural Fatigue Micro-Crack",
                "confidence": 0.91,
                "classification": "CONFIRMED_OBSERVATION"
            }
        ]
    }
    history_summary = {
        "past_alerts_count": 3,
        "operational_status": "WARNING"
    }

    fusion = SymbiosisMultimodalFusion.fuse_multimodal_assessment(
        teng_summary=teng_summary,
        vision_summary=vision_summary,
        history_summary=history_summary,
        machine_meta={"name": "Test Turbine 505", "id": "m-turb-505", "category": "Power Turbines"}
    )

    assert "composite_health_index" in fusion
    assert 0.0 <= fusion["composite_health_index"] <= 100.0
    assert "attribution_breakdown" in fusion
    attr = fusion["attribution_breakdown"]
    total_pct = attr["teng_sensor_pct"] + attr["visual_inspection_pct"] + attr["machine_history_pct"]
    assert total_pct == 100
    assert "cross_modal_correlations" in fusion
    assert len(fusion["cross_modal_correlations"]) > 0
    assert "recommended_actions" in fusion
    assert len(fusion["recommended_actions"]) > 0
