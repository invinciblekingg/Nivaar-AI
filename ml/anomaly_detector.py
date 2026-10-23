import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from scipy import stats

from ml.baseline_calculator import BaselineCalculator
from ml.explainability import AnomalyExplainer

class AnomalyDetector:
    """
    Industrial predictive maintenance anomaly detector combining:
    1. Statistical Feature Extraction (RMS, Kurtosis, Crest Factor, Skewness)
    2. Baseline Normalization
    3. Isolation Forest Unsupervised Anomaly Detection
    4. Domain-specific physical threshold boundaries (ISO 10816 vibration severity)
    """

    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100,
            n_jobs=-1
        )

    def extract_features(self, df: pd.DataFrame, sensor_cols: List[str]) -> Tuple[pd.DataFrame, Dict[str, float]]:
        """
        Computes engineered physical & statistical features from raw telemetry.
        """
        features_df = pd.DataFrame(index=df.index)
        global_summary = {}

        for col in sensor_cols:
            series = pd.to_numeric(df[col], errors='coerce').ffill().bfill()
            if len(series) == 0:
                continue

            features_df[f"{col}_val"] = series

            # Rolling stats for short-term impulsiveness
            window = min(len(series), 10)
            rolling = series.rolling(window=window, min_periods=1)
            features_df[f"{col}_mean"] = rolling.mean()
            features_df[f"{col}_std"] = rolling.std().fillna(0.0)

            # Vibration-specific features
            if "vibration" in col.lower():
                rms = np.sqrt(np.mean(series ** 2))
                peak = np.max(np.abs(series))
                crest = peak / (rms + 1e-6)
                kurt = float(stats.kurtosis(series, nan_policy='omit')) + 3.0 # Pearson kurtosis (normal=3.0)
                skew = float(stats.skew(series, nan_policy='omit'))

                global_summary["vibration_rms"] = round(float(rms), 4)
                global_summary["crest_factor"] = round(float(crest), 4)
                global_summary["vibration_kurtosis"] = round(float(kurt), 4)
                global_summary["vibration_skewness"] = round(float(skew), 4)

                features_df[f"{col}_rms"] = np.sqrt(rolling.apply(lambda x: np.mean(x**2), raw=True))
                features_df[f"{col}_kurtosis"] = rolling.apply(lambda x: stats.kurtosis(x, nan_policy='omit') + 3.0, raw=True).fillna(3.0)
            
            # Temperature rate of rise
            if "temp" in col.lower():
                features_df[f"{col}_diff"] = series.diff().fillna(0.0)
                global_summary["max_temp"] = round(float(series.max()), 2)
                global_summary["mean_temp"] = round(float(series.mean()), 2)

        return features_df.fillna(0.0), global_summary

    def run_analysis(
        self,
        df: pd.DataFrame,
        machine_info: Dict[str, Any],
        known_baseline: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end anomaly detection on incoming dataset.
        """
        if df.empty:
            raise ValueError("Telemetry dataset is empty.")

        # Identify timestamp column
        ts_col = None
        for col in ["timestamp", "time", "date", "datetime", "Timestamp", "Time"]:
            if col in df.columns:
                ts_col = col
                break
        
        if ts_col:
            timestamps = pd.to_datetime(df[ts_col], errors='coerce').fillna(datetime.utcnow())
        else:
            timestamps = [datetime.utcnow() for _ in range(len(df))]

        # Identify numerical sensor columns
        sensor_cols = []
        for col in df.columns:
            if col == ts_col:
                continue
            if pd.api.types.is_numeric_dtype(df[col]) or pd.to_numeric(df[col], errors='coerce').notnull().sum() > len(df) * 0.5:
                sensor_cols.append(col)

        if not sensor_cols:
            raise ValueError("No valid numerical sensor columns detected in dataset.")

        # Baseline calculation
        if known_baseline and len(known_baseline) > 0:
            baselines = known_baseline
        else:
            baselines = BaselineCalculator.calculate_sensor_baselines(df, sensor_cols)

        # Feature engineering
        features_df, feature_summary = self.extract_features(df, sensor_cols)

        # Scale features
        scaled_features = self.scaler.fit_transform(features_df)

        # Train & evaluate Isolation Forest
        self.model.fit(scaled_features)
        raw_scores = self.model.decision_function(scaled_features) 
        # In scikit-learn, negative decision_function values = anomalies, positive = normal
        
        # Convert to 0.0 - 1.0 anomaly score (higher = more anomalous)
        # Decision function typically spans [-0.4, 0.4]
        min_score = np.min(raw_scores)
        max_score = np.max(raw_scores)
        range_span = (max_score - min_score) if (max_score - min_score) > 1e-6 else 1.0
        normalized_anomaly_scores = 1.0 - ((raw_scores - min_score) / range_span)

        # Identify anomalies
        predictions = self.model.predict(scaled_features) # -1 for anomaly, 1 for normal
        
        anomaly_records = []
        for idx in range(len(df)):
            score = float(normalized_anomaly_scores[idx])
            is_pred_anomaly = predictions[idx] == -1
            
            # Severity mapping
            if score >= 0.80 or (is_pred_anomaly and score >= 0.70):
                severity = "CRITICAL"
            elif score >= 0.65 or is_pred_anomaly:
                severity = "HIGH"
            elif score >= 0.48:
                severity = "MEDIUM"
            else:
                severity = "LOW"

            if severity in ["CRITICAL", "HIGH", "MEDIUM"]:
                row_sensors = df.iloc[idx]
                dominant = AnomalyExplainer.identify_influential_sensors(row_sensors, baselines, sensor_cols)
                top_sensors = [s[0] for s in dominant[:3]]
                
                desc = f"Sensor deviation flagged: {dominant[0][0]} {dominant[0][2]} (Z-score: {dominant[0][1]})"
                
                anomaly_records.append({
                    "timestamp": pd.to_datetime(timestamps.iloc[idx] if hasattr(timestamps, 'iloc') else timestamps[idx]).isoformat(),
                    "anomaly_score": round(score, 4),
                    "severity": severity,
                    "description": desc,
                    "top_influential_sensors": top_sensors,
                    "feature_values": {col: round(float(row_sensors[col]), 3) for col in sensor_cols if col in row_sensors}
                })

        # Calculate evaluated machine health index (0 to 100)
        max_anomaly_score = float(np.max(normalized_anomaly_scores)) if len(normalized_anomaly_scores) > 0 else 0.0
        avg_anomaly_score = float(np.mean(normalized_anomaly_scores)) if len(normalized_anomaly_scores) > 0 else 0.0
        
        health_penalty = (max_anomaly_score * 45.0) + (avg_anomaly_score * 35.0)
        health_index = max(12.0, min(99.5, round(100.0 - health_penalty, 1)))

        # Feature importance approximations
        feature_importance = []
        for i, col in enumerate(features_df.columns):
            corr = np.corrcoef(scaled_features[:, i], normalized_anomaly_scores)[0, 1]
            if not np.isnan(corr):
                feature_importance.append({
                    "feature": col,
                    "importance": round(abs(float(corr)), 3)
                })
        feature_importance.sort(key=lambda x: x["importance"], reverse=True)

        # Fault Hypotheses & Explainable Summary
        overall_dominant = []
        for col in sensor_cols:
            series = pd.to_numeric(df[col], errors='coerce').dropna()
            if col in baselines and len(series) > 0:
                mean = baselines[col]["mean"]
                std = baselines[col]["std"]
                dev = abs(float(series.mean()) - mean) / std if std > 1e-6 else 0.0
                overall_dominant.append((col, round(dev, 2), "overall variance"))
        overall_dominant.sort(key=lambda x: x[1], reverse=True)

        hypotheses = AnomalyExplainer.generate_fault_hypotheses(
            machine_info.get("category", "Industrial Motors"),
            overall_dominant,
            feature_summary
        )

        overall_severity = "LOW"
        if any(a["severity"] == "CRITICAL" for a in anomaly_records):
            overall_severity = "CRITICAL"
        elif any(a["severity"] == "HIGH" for a in anomaly_records):
            overall_severity = "HIGH"
        elif any(a["severity"] == "MEDIUM" for a in anomaly_records):
            overall_severity = "MEDIUM"

        recommendations = AnomalyExplainer.generate_recommendations(hypotheses, overall_severity)

        summary_text = (
            f"Processed {len(df)} telemetry samples across {len(sensor_cols)} channels. "
            f"Identified {len(anomaly_records)} anomalous windows. "
            f"Peak anomaly intensity: {max_anomaly_score:.2f}. "
            f"Evaluated equipment health index is {health_index}% ({overall_severity} risk tier). "
            f"Primary leading indicator: {overall_dominant[0][0] if overall_dominant else 'Multivariate drift'}."
        )

        return {
            "row_count": len(df),
            "sensor_columns": sensor_cols,
            "anomaly_count": len(anomaly_records),
            "max_anomaly_score": round(max_anomaly_score, 4),
            "health_index": health_index,
            "overall_severity": overall_severity,
            "baseline_metrics": baselines,
            "feature_importance": feature_importance[:8],
            "summary": summary_text,
            "recommendations": recommendations,
            "fault_hypotheses": hypotheses,
            "anomalies": anomaly_records[:50] # Top 50 anomalous events for UI pagination
        }
