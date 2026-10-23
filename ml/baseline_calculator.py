import numpy as np
import pandas as pd
from typing import Dict, Any, List

class BaselineCalculator:
    """
    Computes and updates machine-specific nominal baseline statistics.
    Baseline statistics allow unsupervised detection algorithms to normalize
    signals and detect drift or spikes relative to healthy operating states.
    """
    
    @staticmethod
    def calculate_sensor_baselines(df: pd.DataFrame, sensor_cols: List[str]) -> Dict[str, Dict[str, float]]:
        baselines = {}
        for col in sensor_cols:
            if col not in df.columns:
                continue
            series = pd.to_numeric(df[col], errors='coerce').dropna()
            if len(series) == 0:
                continue
            
            mean_val = float(series.mean())
            std_val = float(series.std()) if len(series) > 1 else 0.0
            p5 = float(np.percentile(series, 5))
            p95 = float(np.percentile(series, 95))
            rms = float(np.sqrt(np.mean(series ** 2)))
            
            baselines[col] = {
                "mean": round(mean_val, 4),
                "std": round(std_val if std_val > 1e-6 else 0.01, 4),
                "min": round(float(series.min()), 4),
                "max": round(float(series.max()), 4),
                "p5": round(p5, 4),
                "p95": round(p95, 4),
                "rms": round(rms, 4),
                "nominal_range": [round(p5, 4), round(p95, 4)]
            }
        return baselines

    @staticmethod
    def compute_z_scores(df: pd.DataFrame, baselines: Dict[str, Dict[str, float]]) -> pd.DataFrame:
        z_df = pd.DataFrame(index=df.index)
        for col, stats in baselines.items():
            if col in df.columns:
                series = pd.to_numeric(df[col], errors='coerce').fillna(stats["mean"])
                std = stats["std"] if stats["std"] > 1e-6 else 1.0
                z_df[f"{col}_zscore"] = (series - stats["mean"]) / std
        return z_df
