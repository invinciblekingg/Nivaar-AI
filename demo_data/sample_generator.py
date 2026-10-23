import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_datasets(output_dir: str = "."):
    os.makedirs(output_dir, exist_ok=True)
    np.random.seed(42)
    base_time = datetime(2026, 10, 23, 8, 0, 0)
    
    # 1. Healthy Industrial Motor (Baseline)
    n = 150
    timestamps = [base_time + timedelta(seconds=i * 10) for i in range(n)]
    vibration_x = 1.2 + 0.15 * np.sin(np.linspace(0, 30, n)) + np.random.normal(0, 0.08, n)
    vibration_y = 1.0 + 0.12 * np.cos(np.linspace(0, 30, n)) + np.random.normal(0, 0.07, n)
    temperature = 42.0 + 0.5 * np.linspace(0, 1, n) + np.random.normal(0, 0.3, n)
    current = 14.8 + np.random.normal(0, 0.2, n)
    rpm = 1785 + np.random.normal(0, 3.0, n)
    
    df_healthy_motor = pd.DataFrame({
        "timestamp": [t.isoformat() for t in timestamps],
        "vibration_x_rms_mms": np.round(vibration_x, 3),
        "vibration_y_rms_mms": np.round(vibration_y, 3),
        "winding_temperature_c": np.round(temperature, 2),
        "motor_current_amps": np.round(current, 2),
        "shaft_speed_rpm": np.round(rpm, 1)
    })
    df_healthy_motor.to_csv(os.path.join(output_dir, "healthy_motor.csv"), index=False)
    print("Created healthy_motor.csv")

    # 2. Industrial Motor with Abnormal Bearing Vibration
    # Starts normal, then at t=80 begins developing outer race bearing defect (spikes, high kurtosis)
    vibration_x_abn = vibration_x.copy()
    vibration_y_abn = vibration_y.copy()
    temp_abn = temperature.copy()
    current_abn = current.copy()
    
    for i in range(80, n):
        severity_factor = (i - 80) / (n - 80)
        vibration_x_abn[i] += severity_factor * 3.8 + (np.random.choice([0, 2.5, 4.2], p=[0.75, 0.15, 0.1]))
        vibration_y_abn[i] += severity_factor * 2.6 + (np.random.choice([0, 2.0, 3.5], p=[0.8, 0.15, 0.05]))
        temp_abn[i] += severity_factor * 16.5
        current_abn[i] += severity_factor * 2.8 + np.random.normal(0, 0.4)
        
    df_motor_abnormal = pd.DataFrame({
        "timestamp": [t.isoformat() for t in timestamps],
        "vibration_x_rms_mms": np.round(vibration_x_abn, 3),
        "vibration_y_rms_mms": np.round(vibration_y_abn, 3),
        "winding_temperature_c": np.round(temp_abn, 2),
        "motor_current_amps": np.round(current_abn, 2),
        "shaft_speed_rpm": np.round(rpm, 1)
    })
    df_motor_abnormal.to_csv(os.path.join(output_dir, "abnormal_vibration_motor.csv"), index=False)
    print("Created abnormal_vibration_motor.csv")

    # 3. Industrial Centrifugal Pump with Cavitation Pressure Drops
    discharge_press = 58.0 + np.random.normal(0, 0.6, n)
    suction_press = 18.5 + np.random.normal(0, 0.3, n)
    pump_vibe = 1.8 + np.random.normal(0, 0.1, n)
    flow_rate = 145.0 + np.random.normal(0, 1.2, n)
    
    # Cavitation kicks in at index 65
    for i in range(65, n):
        c_factor = (i - 65) / (n - 65)
        suction_press[i] -= c_factor * 11.2 + np.random.normal(0, 1.5) # Vacuum collapse
        discharge_press[i] += np.random.choice([-8.0, 6.0], p=[0.6, 0.4]) * c_factor # Violent hunting
        pump_vibe[i] += c_factor * 4.9 + np.random.normal(0, 0.8) # High frequency implosion noise
        flow_rate[i] -= c_factor * 35.0
        
    df_pump = pd.DataFrame({
        "timestamp": [t.isoformat() for t in timestamps],
        "suction_pressure_psi": np.round(suction_press, 2),
        "discharge_pressure_psi": np.round(discharge_press, 2),
        "pump_casing_vibration_mms": np.round(pump_vibe, 3),
        "volumetric_flow_gpm": np.round(flow_rate, 1)
    })
    df_pump.to_csv(os.path.join(output_dir, "pump_cavitation_pressure.csv"), index=False)
    print("Created pump_cavitation_pressure.csv")

    # 4. Hospital / Data Center Cooling Chiller - Overheating & Refrigerant Leak
    chilled_water_supply_t = 6.2 + np.random.normal(0, 0.2, n)
    chilled_water_return_t = 11.8 + np.random.normal(0, 0.3, n)
    condenser_temp = 32.5 + np.random.normal(0, 0.4, n)
    compressor_current = 48.0 + np.random.normal(0, 0.8, n)
    
    for i in range(70, n):
        leak_fac = (i - 70) / (n - 70)
        chilled_water_supply_t[i] += leak_fac * 7.5 # Chilling capacity collapses
        chilled_water_return_t[i] += leak_fac * 8.2
        condenser_temp[i] += leak_fac * 24.0 # Severe thermal buildup
        compressor_current[i] += leak_fac * 18.0 + np.random.normal(0, 1.5)
        
    df_cooling = pd.DataFrame({
        "timestamp": [t.isoformat() for t in timestamps],
        "chilled_water_supply_c": np.round(chilled_water_supply_t, 2),
        "chilled_water_return_c": np.round(chilled_water_return_t, 2),
        "condenser_temp_c": np.round(condenser_temp, 2),
        "compressor_current_amps": np.round(compressor_current, 2)
    })
    df_cooling.to_csv(os.path.join(output_dir, "hospital_cooling_overheat.csv"), index=False)
    print("Created hospital_cooling_overheat.csv")

    # 5. Power Turbine Generator - Severe Bearing Flaw
    turbine_vibe_radial = 2.1 + np.random.normal(0, 0.15, n)
    turbine_vibe_axial = 1.4 + np.random.normal(0, 0.12, n)
    bearing_pad_temp = 68.0 + np.random.normal(0, 0.5, n)
    lube_oil_pressure_bar = 3.2 + np.random.normal(0, 0.05, n)
    
    for i in range(75, n):
        t_fac = (i - 75) / (n - 75)
        turbine_vibe_radial[i] += t_fac * 6.2 + np.random.normal(0, 0.5)
        turbine_vibe_axial[i] += t_fac * 4.1 + np.random.normal(0, 0.4)
        bearing_pad_temp[i] += t_fac * 29.5
        lube_oil_pressure_bar[i] -= t_fac * 1.4 # Loss of lube oil film
        
    df_turbine = pd.DataFrame({
        "timestamp": [t.isoformat() for t in timestamps],
        "radial_vibration_mms": np.round(turbine_vibe_radial, 3),
        "axial_vibration_mms": np.round(turbine_vibe_axial, 3),
        "bearing_pad_temp_c": np.round(bearing_pad_temp, 2),
        "lube_oil_pressure_bar": np.round(lube_oil_pressure_bar, 2)
    })
    df_turbine.to_csv(os.path.join(output_dir, "turbine_bearing_flaw.csv"), index=False)
    print("Created turbine_bearing_flaw.csv")

if __name__ == "__main__":
    generate_datasets("d:/Hackathon/demo_data")
