import os
import uuid
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.database import engine, Base, SessionLocal
from backend.app.models import (
    Machine, SensorReading, UploadedDataset, Alert, 
    MaintenanceTask, Incident, User, WorkerHeartbeat
)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    try:
        # Check if already seeded
        if db.query(Machine).count() > 0:
            print("Database already contains machines. Skipping seed.")
            return

        print("Seeding initial MachineGuard AI enterprise dataset...")

        # 1. Seed Users
        admin_user = User(
            username="admin",
            email="admin@machineguard.ai",
            full_name="Chief Reliability Officer",
            role="admin"
        )
        engineer_user = User(
            username="kush_engineer",
            email="kush@machineguard.ai",
            full_name="Kush Chauhan (Lead Engineer)",
            role="engineer"
        )
        db.add_all([admin_user, engineer_user])
        db.flush()

        # 2. Seed Machines across all 8 mandatory categories
        machines_data = [
            {
                "id": "m-motor-104",
                "name": "High-Voltage Induction Motor M-104",
                "category": "Industrial Motors",
                "asset_tag": "EQ-IND-M104",
                "location_label": "Petrochemical Unit 4, Compressor Line A",
                "status": "WARNING",
                "health_index": 73.4,
                "profile_config": {
                    "sensors": ["vibration_x_rms_mms", "vibration_y_rms_mms", "winding_temperature_c", "motor_current_amps", "shaft_speed_rpm"],
                    "nominal_rpm": 1785,
                    "max_safe_vibration_mms": 4.5,
                    "max_safe_temp_c": 75.0,
                    "baseline": {
                        "vibration_x_rms_mms": {"mean": 1.25, "std": 0.18, "p5": 0.98, "p95": 1.55, "rms": 1.26},
                        "vibration_y_rms_mms": {"mean": 1.05, "std": 0.15, "p5": 0.82, "p95": 1.30, "rms": 1.06},
                        "winding_temperature_c": {"mean": 42.5, "std": 1.2, "p5": 40.5, "p95": 44.8, "rms": 42.5},
                        "motor_current_amps": {"mean": 14.8, "std": 0.4, "p5": 14.1, "p95": 15.5, "rms": 14.8}
                    }
                }
            },
            {
                "id": "m-pump-201",
                "name": "Centrifugal Raw Water Feed Pump P-201",
                "category": "Pumps",
                "asset_tag": "EQ-PMP-201",
                "location_label": "Municipal Reservoir Intake Facility",
                "status": "HEALTHY",
                "health_index": 96.8,
                "profile_config": {
                    "sensors": ["suction_pressure_psi", "discharge_pressure_psi", "pump_casing_vibration_mms", "volumetric_flow_gpm"],
                    "nominal_flow_gpm": 150.0,
                    "baseline": {
                        "suction_pressure_psi": {"mean": 18.5, "std": 0.35, "p5": 17.9, "p95": 19.1, "rms": 18.5},
                        "discharge_pressure_psi": {"mean": 58.2, "std": 0.8, "p5": 56.9, "p95": 59.5, "rms": 58.2},
                        "pump_casing_vibration_mms": {"mean": 1.82, "std": 0.12, "p5": 1.62, "p95": 2.02, "rms": 1.82}
                    }
                }
            },
            {
                "id": "m-cool-med-01",
                "name": "ICU & MRI Cryo Chiller Unit MED-01",
                "category": "Medical Equipment",
                "asset_tag": "EQ-MED-CHILL-01",
                "location_label": "Metropolitan General Hospital, B2 Utility Wing",
                "status": "CRITICAL",
                "health_index": 54.2,
                "profile_config": {
                    "sensors": ["chilled_water_supply_c", "chilled_water_return_c", "condenser_temp_c", "compressor_current_amps"],
                    "critical_asset": True,
                    "target_supply_temp_c": 6.0,
                    "baseline": {
                        "chilled_water_supply_c": {"mean": 6.2, "std": 0.25, "p5": 5.8, "p95": 6.6, "rms": 6.2},
                        "condenser_temp_c": {"mean": 32.5, "std": 0.6, "p5": 31.5, "p95": 33.5, "rms": 32.5}
                    }
                }
            },
            {
                "id": "m-turb-505",
                "name": "Heavy Aeroderivative Gas Turbine T-505",
                "category": "Power Turbines",
                "asset_tag": "EQ-PWR-TRB505",
                "location_label": "Regional Peaking Station, Generator Bay 2",
                "status": "CRITICAL",
                "health_index": 48.9,
                "profile_config": {
                    "sensors": ["radial_vibration_mms", "axial_vibration_mms", "bearing_pad_temp_c", "lube_oil_pressure_bar"],
                    "nominal_rpm": 3600,
                    "baseline": {
                        "radial_vibration_mms": {"mean": 2.1, "std": 0.2, "p5": 1.8, "p95": 2.4, "rms": 2.1},
                        "bearing_pad_temp_c": {"mean": 68.0, "std": 0.9, "p5": 66.5, "p95": 69.5, "rms": 68.0}
                    }
                }
            },
            {
                "id": "m-comp-302",
                "name": "Dual-Stage Rotary Screw Compressor C-302",
                "category": "Compressors",
                "asset_tag": "EQ-CMP-302",
                "location_label": "Pneumatic Control Substation 3",
                "status": "HEALTHY",
                "health_index": 94.5,
                "profile_config": {
                    "sensors": ["discharge_temp_c", "discharge_pressure_bar", "motor_kw", "oil_filter_dp_bar"],
                    "baseline": {
                        "discharge_temp_c": {"mean": 84.0, "std": 1.5, "p5": 81.5, "p95": 86.5, "rms": 84.0}
                    }
                }
            },
            {
                "id": "m-robot-80",
                "name": "6-Axis Articulated Welding Robot Arm R-80",
                "category": "Industrial Robots",
                "asset_tag": "EQ-ROB-080",
                "location_label": "Body Assembly Cell 12, Station 3",
                "status": "HEALTHY",
                "health_index": 98.2,
                "profile_config": {
                    "sensors": ["axis_1_torque_nm", "axis_2_torque_nm", "joint_vibration_g", "gearbox_temp_c"],
                    "baseline": {}
                }
            },
            {
                "id": "m-veh-12",
                "name": "Traction Inverter & Motor Bogie V-12",
                "category": "Vehicle Systems",
                "asset_tag": "EQ-TRN-V12",
                "location_label": "Metropolitan Light Rail Line 1, Trainset 4",
                "status": "HEALTHY",
                "health_index": 91.0,
                "profile_config": {
                    "sensors": ["inverter_temp_c", "stator_temp_c", "vibration_bogie_mms", "traction_current_a"],
                    "baseline": {}
                }
            },
            {
                "id": "m-dc-cool-07",
                "name": "In-Row Precision CRAC Cooling Unit DC-7",
                "category": "Data Center Cooling Equipment",
                "asset_tag": "EQ-DAT-CRAC07",
                "location_label": "Tier IV Pod 3, Cold Aisle Containment",
                "status": "WARNING",
                "health_index": 78.5,
                "profile_config": {
                    "sensors": ["supply_air_temp_c", "return_air_temp_c", "fan_speed_percent", "chilled_water_valve_pct"],
                    "baseline": {}
                }
            }
        ]

        created_machines = []
        for m_data in machines_data:
            m = Machine(**m_data)
            db.add(m)
            created_machines.append(m)
        db.flush()

        # 3. Seed Uploaded Datasets metadata
        demo_files_map = {
            "m-motor-104": ("abnormal_vibration_motor.csv", True),
            "m-pump-201": ("pump_cavitation_pressure.csv", True),
            "m-cool-med-01": ("hospital_cooling_overheat.csv", True),
            "m-turb-505": ("turbine_bearing_flaw.csv", True),
        }

        demo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "demo_data"))

        for m_id, (fname, is_syn) in demo_files_map.items():
            fpath = os.path.join(demo_dir, fname)
            if os.path.exists(fpath):
                df = pd.read_csv(fpath)
                ds = UploadedDataset(
                    machine_id=m_id,
                    filename=fname,
                    file_path=fpath,
                    row_count=len(df),
                    sensor_columns=[c for c in df.columns if c != "timestamp"],
                    is_synthetic=is_syn,
                    provenance="MachineGuard Curated Benchmark Dataset"
                )
                db.add(ds)
        db.flush()

        # 4. Seed Sensor Readings for charts (last 60 time points for Motor-104)
        motor_csv = os.path.join(demo_dir, "abnormal_vibration_motor.csv")
        if os.path.exists(motor_csv):
            df_motor = pd.read_csv(motor_csv)
            for _, row in df_motor.tail(60).iterrows():
                ts = datetime.fromisoformat(row["timestamp"])
                for s_col in ["vibration_x_rms_mms", "winding_temperature_c", "motor_current_amps"]:
                    if s_col in row:
                        unit = "mm/s" if "vibration" in s_col else ("°C" if "temp" in s_col else "A")
                        sr = SensorReading(
                            machine_id="m-motor-104",
                            timestamp=ts,
                            sensor_type=s_col,
                            value=float(row[s_col]),
                            unit=unit,
                            source="SYNTHETIC_DEMO"
                        )
                        db.add(sr)
        db.flush()

        # 5. Seed Alerts & Incidents
        alert_med = Alert(
            id=str(uuid.uuid4()),
            machine_id="m-cool-med-01",
            severity="CRITICAL",
            status="NEW",
            title="CRITICAL: Refrigerant Thermal Runaway Detected",
            description="Condenser temperature exceeded 56°C threshold with chilled water supply rising to 13.7°C. Risk of cooling loss to ICU and surgical suites.",
            readings_snapshot={"condenser_temp_c": 56.5, "chilled_water_supply_c": 13.7, "anomaly_score": 0.94},
            timestamp=datetime.utcnow() - timedelta(minutes=24)
        )
        db.add(alert_med)

        alert_turb = Alert(
            id=str(uuid.uuid4()),
            machine_id="m-turb-505",
            severity="CRITICAL",
            status="ACKNOWLEDGED",
            title="CRITICAL: Turbine Bearing Lubrication Film Breakdown",
            description="Radial vibration exceeded 8.3 mm/s coupled with 97°C bearing pad temperature. Severe boundary friction signature.",
            readings_snapshot={"radial_vibration_mms": 8.3, "bearing_pad_temp_c": 97.5, "anomaly_score": 0.91},
            timestamp=datetime.utcnow() - timedelta(minutes=45),
            acknowledged_by="kush_engineer"
        )
        db.add(alert_turb)

        alert_motor = Alert(
            id=str(uuid.uuid4()),
            machine_id="m-motor-104",
            severity="HIGH",
            status="NEW",
            title="HIGH: Drive-End Bearing Fluting / Spalling Anomaly",
            description="Elevated kurtosis and vibration RMS spikes indicating outer race degradation on Induction Motor M-104.",
            readings_snapshot={"vibration_x_rms_mms": 4.8, "kurtosis": 5.4, "anomaly_score": 0.78},
            timestamp=datetime.utcnow() - timedelta(minutes=12)
        )
        db.add(alert_motor)
        db.flush()

        # Seed Maintenance Tasks
        task_med = MaintenanceTask(
            machine_id="m-cool-med-01",
            alert_id=alert_med.id,
            title="Emergency Refrigerant & Condenser Coil Inspection",
            description="Immediate physical inspection of expansion valve and condenser cleanliness to prevent ICU HVAC failure.",
            priority="CRITICAL",
            assignee="Dr. A. Vance (Facilities Director)",
            status="IN_PROGRESS",
            risk_score=94.0,
            due_date=datetime.utcnow() + timedelta(hours=2),
            audit_trail=[{
                "timestamp": (datetime.utcnow() - timedelta(minutes=20)).isoformat(),
                "user": "System (AI Trigger)",
                "action": "TASK_CREATED",
                "note": "Automatically escalated due to Medical Equipment critical tier"
            }]
        )
        task_turb = MaintenanceTask(
            machine_id="m-turb-505",
            alert_id=alert_turb.id,
            title="Turbine Bearing Pad Ultrasound & Lube Oil Sample",
            description="Extract oil sample for spectrographic wear debris analysis and perform ultrasound stethoscope listening.",
            priority="CRITICAL",
            assignee="Kush Chauhan (Senior Turbomachinery Specialist)",
            status="OPEN",
            risk_score=91.0,
            due_date=datetime.utcnow() + timedelta(hours=6),
            audit_trail=[{
                "timestamp": (datetime.utcnow() - timedelta(minutes=40)).isoformat(),
                "user": "System (AI Trigger)",
                "action": "TASK_CREATED",
                "note": "Flagged from radial vibration excursion"
            }]
        )
        task_motor = MaintenanceTask(
            machine_id="m-motor-104",
            alert_id=alert_motor.id,
            title="Induction Motor DE Bearing Vibration Audit",
            description="Mount portable tri-axial accelerometer for high-frequency spectral FFT verification.",
            priority="HIGH",
            assignee="R. Gomez (Vibration Analyst)",
            status="OPEN",
            risk_score=78.0,
            due_date=datetime.utcnow() + timedelta(hours=24),
            audit_trail=[{
                "timestamp": (datetime.utcnow() - timedelta(minutes=10)).isoformat(),
                "user": "System (AI Trigger)",
                "action": "TASK_CREATED",
                "note": "Generated from anomaly detection"
            }]
        )
        db.add_all([task_med, task_turb, task_motor])

        # Seed Incidents (Disruption Response Center)
        inc_med = Incident(
            machine_id="m-cool-med-01",
            title="Hospital ICU HVAC Thermal Instability",
            operational_impact="Risk of temperature excursion across 32 Intensive Care Unit beds and MRI Suite 2. Secondary impact on vaccine and blood bank storage.",
            severity="CRITICAL",
            status="INVESTIGATING",
            recommended_inspections=[
                "Check refrigerant sight glass for bubbles indicating low charge.",
                "Verify condenser cooling tower fan operation and supply water flow.",
                "Stage portable backup spot-coolers near critical pharmaceutical storage."
            ],
            timeline=[
                {
                    "time": (datetime.utcnow() - timedelta(minutes=24)).isoformat(),
                    "event": "Anomaly Detector identified condenser thermal surge (+24°C slope).",
                    "actor": "MachineGuard AI (worker_alpha)"
                },
                {
                    "time": (datetime.utcnow() - timedelta(minutes=15)).isoformat(),
                    "event": "Automated incident escalated to Hospital Facilities Engineering Command.",
                    "actor": "Incident Dispatcher"
                }
            ]
        )
        db.add(inc_med)

        # Seed initial worker heartbeats
        hb_alpha = WorkerHeartbeat(
            worker_id="worker_alpha",
            status="ACTIVE",
            active_jobs_count=0,
            completed_jobs_count=18,
            failed_jobs_count=0,
            last_heartbeat=datetime.utcnow(),
            system_info={
                "pid": os.getpid(),
                "node": "worker-node-01.internal",
                "supported_models": ["IsolationForest", "BaselineZScore", "FFTVibration"]
            }
        )
        hb_beta = WorkerHeartbeat(
            worker_id="worker_beta",
            status="ACTIVE",
            active_jobs_count=0,
            completed_jobs_count=14,
            failed_jobs_count=0,
            last_heartbeat=datetime.utcnow(),
            system_info={
                "pid": os.getpid(),
                "node": "worker-node-02.internal",
                "supported_models": ["IsolationForest", "BaselineZScore", "FFTVibration"]
            }
        )
        db.add_all([hb_alpha, hb_beta])

        db.commit()
        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
