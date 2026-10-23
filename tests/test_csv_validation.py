import os
import pandas as pd
import pytest
from ml.anomaly_detector import AnomalyDetector
from ml.baseline_calculator import BaselineCalculator

def test_csv_loading_and_columns():
    csv_path = os.path.join(os.path.dirname(__file__), "..", "demo_data", "healthy_motor.csv")
    assert os.path.exists(csv_path), "Demo healthy_motor.csv must exist"
    
    df = pd.read_csv(csv_path)
    assert len(df) >= 100, "Dataset should have at least 100 rows"
    assert "timestamp" in df.columns
    assert "vibration_x_rms_mms" in df.columns
    assert "winding_temperature_c" in df.columns

def test_baseline_calculation():
    csv_path = os.path.join(os.path.dirname(__file__), "..", "demo_data", "healthy_motor.csv")
    df = pd.read_csv(csv_path)
    sensor_cols = ["vibration_x_rms_mms", "winding_temperature_c", "motor_current_amps"]
    
    baselines = BaselineCalculator.calculate_sensor_baselines(df, sensor_cols)
    assert "vibration_x_rms_mms" in baselines
    assert baselines["vibration_x_rms_mms"]["mean"] > 0
    assert baselines["vibration_x_rms_mms"]["rms"] > 0
    assert baselines["winding_temperature_c"]["mean"] >= 30.0
