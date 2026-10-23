import os
import cv2
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_multimodal_data():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    demo_dir = os.path.join(base_dir, "demo_data")
    images_dir = os.path.join(demo_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    base_time = datetime(2026, 10, 23, 9, 0, 0)
    n = 160

    # 1. Healthy TENG Telemetry CSV
    t_span = np.linspace(0, 16, n)
    # TENG periodic contact-separation waveform with fundamental + small harmonic
    v_healthy = 3.2 * np.sin(2 * np.pi * 29.75 * t_span) + 0.6 * np.sin(2 * np.pi * 59.5 * t_span) + np.random.normal(0, 0.2, n)
    freq_healthy = 29.75 + np.random.normal(0, 0.2, n)
    amp_healthy = 3.2 + np.random.normal(0, 0.1, n)
    charge_healthy = 3.1 + np.random.normal(0, 0.15, n)

    df_teng_healthy = pd.DataFrame({
        "timestamp": [(base_time + timedelta(seconds=i*5)).isoformat() for i in range(n)],
        "voltage_v": np.round(v_healthy, 3),
        "vibration_frequency_hz": np.round(freq_healthy, 2),
        "signal_amplitude_v": np.round(amp_healthy, 3),
        "charge_transfer_nc": np.round(charge_healthy, 2)
    })
    df_teng_healthy.to_csv(os.path.join(demo_dir, "teng_healthy_motor.csv"), index=False)
    print("Created teng_healthy_motor.csv")

    # 2. Abnormal TENG Bearing Impact Chatter CSV
    v_impact = v_healthy.copy()
    freq_impact = freq_healthy.copy()
    amp_impact = amp_healthy.copy()
    charge_impact = charge_healthy.copy()

    for i in range(75, n):
        factor = (i - 75) / (n - 75)
        # Transient high-voltage spikes characteristic of rolling-element impact
        spike = np.random.choice([0.0, 7.5, 12.0, 16.5], p=[0.7, 0.15, 0.1, 0.05])
        v_impact[i] = v_impact[i] * (1.0 + factor * 1.5) + spike * (1 if np.random.random() > 0.5 else -1)
        freq_impact[i] += factor * 8.5 + np.random.normal(0, 1.2)
        amp_impact[i] += factor * 9.2 + spike * 0.4
        charge_impact[i] += factor * 8.0 + spike * 0.3

    df_teng_impact = pd.DataFrame({
        "timestamp": [(base_time + timedelta(seconds=i*5)).isoformat() for i in range(n)],
        "voltage_v": np.round(v_impact, 3),
        "vibration_frequency_hz": np.round(freq_impact, 2),
        "signal_amplitude_v": np.round(amp_impact, 3),
        "charge_transfer_nc": np.round(charge_impact, 2)
    })
    df_teng_impact.to_csv(os.path.join(demo_dir, "teng_bearing_impact.csv"), index=False)
    print("Created teng_bearing_impact.csv")

    # 3. TENG Loose Mount Frequency Hunting CSV
    v_loose = v_healthy.copy()
    freq_loose = freq_healthy.copy()
    for i in range(60, n):
        fac = (i - 60) / (n - 60)
        freq_loose[i] += 15.0 * np.sin(0.3 * i) + np.random.normal(0, 2.0)
        v_loose[i] += 5.0 * np.cos(0.2 * i) + np.random.normal(0, 0.8)

    df_teng_loose = pd.DataFrame({
        "timestamp": [(base_time + timedelta(seconds=i*5)).isoformat() for i in range(n)],
        "voltage_v": np.round(v_loose, 3),
        "vibration_frequency_hz": np.round(freq_loose, 2),
        "signal_amplitude_v": np.round(np.abs(v_loose), 3),
        "charge_transfer_nc": np.round(charge_healthy, 2)
    })
    df_teng_loose.to_csv(os.path.join(demo_dir, "teng_loose_mount.csv"), index=False)
    print("Created teng_loose_mount.csv")

    # 4. Generate Authentic Synthetic Images for Computer Vision
    # A. Bearing Outer Race with Structural Crack
    img_crack = np.full((500, 650, 3), (180, 185, 190), dtype=np.uint8) # Steel gray
    # Add brushed metal texture noise
    noise = np.random.normal(0, 8, (500, 650, 3)).astype(np.int16)
    img_crack = np.clip(img_crack.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Draw dark jagged crack fissure
    pts = [
        (180, 140), (200, 175), (225, 210), (240, 260), 
        (275, 310), (310, 350), (330, 390), (360, 430)
    ]
    for j in range(len(pts) - 1):
        p1 = pts[j]
        p2 = pts[j+1]
        cv2.line(img_crack, p1, p2, (20, 25, 30), 4, cv2.LINE_AA)
        # Small branch fissure
        if j == 3:
            cv2.line(img_crack, p1, (p1[0] + 35, p1[1] + 25), (35, 40, 45), 2, cv2.LINE_AA)
        if j == 5:
            cv2.line(img_crack, p2, (p2[0] - 25, p2[1] + 20), (35, 40, 45), 2, cv2.LINE_AA)

    cv2.imwrite(os.path.join(images_dir, "bearing_outer_race_crack.jpg"), img_crack)
    print("Created bearing_outer_race_crack.jpg")

    # B. Pump Casing with Surface Rust Oxidation
    img_rust = np.full((500, 650, 3), (120, 125, 130), dtype=np.uint8) # Cast iron
    noise = np.random.normal(0, 12, (500, 650, 3)).astype(np.int16)
    img_rust = np.clip(img_rust.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Draw rust patches (BGR format: Rust is high Red, medium Green, low Blue)
    cv2.circle(img_rust, (260, 220), 85, (25, 68, 175), -1) # Iron oxide rust
    cv2.ellipse(img_rust, (380, 280), (110, 60), 25, 0, 360, (20, 75, 185), -1)
    cv2.circle(img_rust, (420, 170), 45, (30, 85, 195), -1)
    
    # Blur rust borders to look organic
    img_rust = cv2.GaussianBlur(img_rust, (11, 11), 0)
    cv2.imwrite(os.path.join(images_dir, "pump_casing_corrosion.jpg"), img_rust)
    print("Created pump_casing_corrosion.jpg")

    # C. Motor Flange with Mechanical Spalling & Pitting
    img_spall = np.full((500, 650, 3), (160, 165, 170), dtype=np.uint8)
    noise = np.random.normal(0, 10, (500, 650, 3)).astype(np.int16)
    img_spall = np.clip(img_spall.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # Draw localized pitting craters
    pits = [(190, 180), (220, 210), (250, 190), (280, 230), (320, 200), (360, 250), (390, 215)]
    for px, py in pits:
        cv2.circle(img_spall, (px, py), np.random.randint(8, 18), (40, 45, 50), -1)
        cv2.circle(img_spall, (px, py), np.random.randint(3, 7), (20, 22, 25), -1)

    cv2.imwrite(os.path.join(images_dir, "motor_flange_spalling.jpg"), img_spall)
    print("Created motor_flange_spalling.jpg")

if __name__ == "__main__":
    generate_multimodal_data()
