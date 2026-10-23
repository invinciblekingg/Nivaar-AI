import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple

class AnomalyExplainer:
    """
    Transforms raw anomaly scores and multivariate sensor metrics into
    explainable diagnostic insights, fault hypotheses, and prioritized recommendations.
    Advisory only - never autonomous machinery shutdown.
    """
    
    @staticmethod
    def identify_influential_sensors(
        row: pd.Series, 
        baselines: Dict[str, Dict[str, float]], 
        sensor_cols: List[str]
    ) -> List[Tuple[str, float, str]]:
        deviations = []
        for col in sensor_cols:
            if col in row and col in baselines:
                val = float(row[col])
                mean = baselines[col]["mean"]
                std = baselines[col]["std"]
                p95 = baselines[col]["p95"]
                p5 = baselines[col]["p5"]
                
                z_score = abs(val - mean) / std if std > 1e-6 else 0.0
                
                direction = "elevated" if val > mean else "suppressed"
                if val > p95:
                    direction = "exceeded nominal 95th percentile"
                elif val < p5:
                    direction = "dropped below nominal 5th percentile"
                    
                deviations.append((col, round(z_score, 2), direction))
                
        # Sort by deviation descending
        deviations.sort(key=lambda x: x[1], reverse=True)
        return deviations

    @staticmethod
    def generate_fault_hypotheses(
        machine_category: str,
        dominant_sensors: List[Tuple[str, float, str]],
        features_summary: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        hypotheses = []
        sensor_names = [s[0].lower() for s in dominant_sensors[:3]]
        
        # Check vibration patterns
        has_vibration = any("vibration" in s for s in sensor_names)
        has_temp = any("temp" in s for s in sensor_names)
        has_pressure = any("pressure" in s for s in sensor_names)
        has_current = any("current" in s for s in sensor_names)
        
        kurtosis = features_summary.get("vibration_kurtosis", 3.0)
        crest_factor = features_summary.get("crest_factor", 1.41)
        
        if machine_category in ["Industrial Motors", "Power Turbines", "Pumps"]:
            if has_vibration and (kurtosis > 4.5 or crest_factor > 3.0):
                hypotheses.append({
                    "component": "Drive-End Bearings",
                    "fault": "Bearing Raceway Spalling / Fluting",
                    "confidence": min(0.92, round(0.55 + 0.08 * kurtosis / 3.0, 2)),
                    "evidence": f"High shock impulsiveness detected: Kurtosis={kurtosis:.2f} (nominal ~3.0), Crest Factor={crest_factor:.2f}."
                })
            elif has_vibration and has_temp:
                hypotheses.append({
                    "component": "Shaft & Coupling Assembly",
                    "fault": "Angular / Parallel Misalignment",
                    "confidence": 0.82,
                    "evidence": "Concurrently elevated radial vibration and bearing house thermal rise."
                })
            elif has_vibration:
                hypotheses.append({
                    "component": "Rotor Assembly",
                    "fault": "Rotor Dynamic Unbalance",
                    "confidence": 0.76,
                    "evidence": "Persistent sinusoidal vibration elevation near fundamental running frequency."
                })

        if machine_category in ["Medical Equipment", "Data Center Cooling Equipment", "Compressors"]:
            if has_temp:
                hypotheses.append({
                    "component": "Cooling System / Heat Exchanger",
                    "fault": "Refrigerant Loss / Heat Exchanger Fouling",
                    "confidence": 0.86,
                    "evidence": "Thermal discharge exceeding continuous operating envelope while duty cycle is high."
                })
            if has_pressure and has_current:
                hypotheses.append({
                    "component": "Compressor Valve / Impeller",
                    "fault": "Pressure Surge / Flow Instability",
                    "confidence": 0.79,
                    "evidence": "Rapid differential pressure drop coupled with motor current hunting."
                })
                
        if machine_category == "Pumps":
            if has_pressure or (has_vibration and has_pressure):
                hypotheses.append({
                    "component": "Impeller & Volute Casing",
                    "fault": "Suction Cavitation / Entrained Vapor",
                    "confidence": 0.88,
                    "evidence": "High-frequency broadband vibration signature with sudden suction pressure fluctuations."
                })
                
        if not hypotheses:
            hypotheses.append({
                "component": "General Powertrain",
                "fault": "Multi-Sensor Operational Anomaly",
                "confidence": 0.65,
                "evidence": f"Statistical variance across {', '.join(sensor_names[:2])} exceeding baseline profile."
            })
            
        return hypotheses

    @staticmethod
    def generate_recommendations(hypotheses: List[Dict[str, Any]], severity: str) -> List[str]:
        recommendations = []
        if severity == "CRITICAL":
            recommendations.append("Priority 1: Dispatch certified maintenance technician for visual and acoustic inspection within 2 hours.")
        elif severity == "HIGH":
            recommendations.append("Priority 2: Schedule on-site physical inspection during the next operational shift.")
        else:
            recommendations.append("Priority 3: Continue non-intrusive monitoring; schedule visual check during routine maintenance.")
            
        for hyp in hypotheses:
            comp = hyp["component"]
            if "Bearing" in comp:
                recommendations.append(f"Perform ultrasound lubrication check and grease condition analysis on {comp}.")
                recommendations.append("Verify bearing housing bolt torque and check for outer ring rotation.")
            elif "Shaft" in comp or "Rotor" in comp:
                recommendations.append("Measure laser shaft alignment (angular and parallel) across coupling.")
                recommendations.append("Inspect flexible coupling elements for wear or elastomer degradation.")
            elif "Cooling" in comp or "Heat Exchanger" in comp:
                recommendations.append("Inspect air filters, intake louvers, and coolant fluid levels.")
                recommendations.append("Measure condenser coils temperature gradient across inlet/outlet.")
            elif "Impeller" in comp or "Pump" in comp:
                recommendations.append("Inspect suction strainer for foreign debris obstruction.")
                recommendations.append("Verify Net Positive Suction Head Available (NPSHa) matches operating conditions.")
                
        recommendations.append("Advisory Notice: Human verification is required prior to performing mechanical teardown.")
        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for r in recommendations:
            if r not in seen:
                seen.add(r)
                deduped.append(r)
        return deduped[:5]
