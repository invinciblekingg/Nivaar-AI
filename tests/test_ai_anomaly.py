import os
import pandas as pd
import pytest
from ml.anomaly_detector import AnomalyDetector

def test_anomaly_detection_pipeline():
    abnormal_csv = os.path.join(os.path.dirname(__file__), "..", "demo_data", "abnormal_vibration_motor.csv")
    assert os.path.exists(abnormal_csv)
    df = pd.read_csv(abnormal_csv)

    detector = AnomalyDetector(contamination=0.08)
    machine_info = {
        "id": "m-motor-104",
        "name": "High-Voltage Induction Motor M-104",
        "category": "Industrial Motors"
    }
    
    results = detector.run_analysis(df, machine_info)
    assert results["anomaly_count"] > 0, "Abnormal dataset must flag anomalies"
    assert results["max_anomaly_score"] > 0.60, "Max anomaly score should be high"
    assert results["overall_severity"] in ["CRITICAL", "HIGH"]
    assert len(results["recommendations"]) > 0
    assert len(results["fault_hypotheses"]) > 0
    
    # Check that bearing fault was identified as hypothesis
    hyp_components = [h["component"] for h in results["fault_hypotheses"]]
    assert any("Bearing" in c for c in hyp_components)
