import pandas as pd
from typing import Dict, Any, List

class PublicDatasetAdapters:
    """
    Public Predictive Maintenance Dataset Adapters.
    Provides standardized data mapping and legal acquisition guidance for
    prominent research benchmark datasets.
    """

    SUPPORTED_DATASETS = {
        "AI4I_2020": {
            "name": "AI4I 2020 Predictive Maintenance Dataset",
            "source": "UCI Machine Learning Repository",
            "citation": "Matzka, S. (2020). Explainable Artificial Intelligence for Predictive Maintenance Applications.",
            "description": "Synthetic dataset reflecting real predictive maintenance data encountered in industry, consisting of 10,000 data points stored as rows with 14 features.",
            "download_url": "https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset",
            "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
            "column_mapping": {
                "Air temperature [K]": "air_temperature_kelvin",
                "Process temperature [K]": "process_temperature_kelvin",
                "Rotational speed [rpm]": "rotational_speed_rpm",
                "Torque [Nm]": "torque_nm",
                "Tool wear [min]": "tool_wear_minutes",
                "Machine failure": "failure_label"
            }
        },
        "NASA_IMS_BEARING": {
            "name": "NASA IMS Bearing Data Set",
            "source": "NASA Prognostics Center of Excellence / University of Cincinnati",
            "citation": "J. Lee, H. Qiu, G. Yu, J. Lin, Rexnord Technical Services (2007). IMS Bearing Data Set.",
            "description": "Run-to-failure vibration data collected from four bearings on a loaded shaft over several weeks.",
            "download_url": "https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/",
            "license": "NASA Open Source Agreement / Public Domain",
            "column_mapping": {
                "Bearing 1": "bearing_1_vibration_g",
                "Bearing 2": "bearing_2_vibration_g",
                "Bearing 3": "bearing_3_vibration_g",
                "Bearing 4": "bearing_4_vibration_g"
            }
        },
        "NASA_CMAPSS": {
            "name": "NASA C-MAPSS Turbofan Engine Degradation Simulation",
            "source": "NASA Ames Research Center",
            "citation": "Saxena, A., Goebel, K., Simon, D., & Eklund, N. (2008). Damage propagation modeling for aircraft engine run-to-failure simulation.",
            "description": "Simulates run-to-failure degradation in multi-sensor turbofan engines under varying operating regimes.",
            "download_url": "https://data.nasa.gov/Aerospace/CMAPSS-Jet-Engine-Simulated-Data/ff5v-kuh6",
            "license": "NASA Open Data / Public Domain",
            "column_mapping": {
                "s2": "total_temperature_lpc_outlet",
                "s3": "total_temperature_hpc_outlet",
                "s4": "total_temperature_lpt_outlet",
                "s7": "total_pressure_hpc_outlet",
                "s8": "physical_fan_speed_rpm",
                "s9": "physical_core_speed_rpm",
                "s11": "static_pressure_hpc_outlet"
            }
        }
    }

    @classmethod
    def get_adapter_info(cls, dataset_key: str) -> Dict[str, Any]:
        return cls.SUPPORTED_DATASETS.get(dataset_key, {})

    @classmethod
    def adapt_dataframe(cls, df: pd.DataFrame, dataset_key: str) -> pd.DataFrame:
        meta = cls.SUPPORTED_DATASETS.get(dataset_key)
        if not meta:
            return df
        
        mapping = meta["column_mapping"]
        # Rename columns that match
        df_renamed = df.rename(columns=mapping)
        return df_renamed
