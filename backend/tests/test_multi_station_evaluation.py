"""
AQUORA AI - Multi-Station Hydrological Forecasting Unit & Integration Tests
Validates dataset integrity auditing, coordinate anomaly traps, segmentation rules,
and reproducible evaluation metrics across Kerala stations.
"""

import os
import json
import pytest
import pandas as pd
import numpy as np

from app.ml.evaluate_multi_station import (
    load_station_raw,
    create_continuous_hourly_segments,
    calc_metrics,
    RAW_DATA_PATH,
    OUTPUT_METRICS_PATH,
)

def test_raw_dataset_exists():
    """Verify the raw multi-station telemetry CSV is present on disk."""
    assert os.path.exists(RAW_DATA_PATH), f"Raw dataset not found at {RAW_DATA_PATH}"
    assert os.path.getsize(RAW_DATA_PATH) > 50_000_000, "Dataset file smaller than expected"

def test_ramamangalam_coordinate_anomaly_detection():
    """Verify that Ramamangalam Bridge raw coordinate typo is flagged."""
    df, audit = load_station_raw(RAW_DATA_PATH, "RAMAMANGALAM BRIDGE")
    assert audit["station_name"] == "RAMAMANGALAM BRIDGE"
    assert audit["district"] == "ERNAKULAM"
    assert audit["raw_latitude"] == pytest.approx(10.899167, rel=1e-4)
    assert audit["raw_longitude"] == pytest.approx(91.472500, rel=1e-4)
    assert audit["coordinate_anomaly_detected"] is True
    assert "91.4725" in audit["coordinate_anomaly_detail"]
    assert audit["has_2024_telemetry"] is True

def test_malayattoor_and_pala_truncation_detection():
    """Verify that Malayattoor Kodanad and Pala are correctly detected as ending in 2022."""
    _, m_audit = load_station_raw(RAW_DATA_PATH, "MALAYATTOOR KODANAD BRIDGE")
    assert m_audit["station_name"] == "MALAYATTOOR KODANAD BRIDGE"
    assert m_audit["has_2024_telemetry"] is False
    assert m_audit["coordinate_anomaly_detected"] is False
    assert m_audit["max_timestamp"].startswith("2022-11-25")

    _, p_audit = load_station_raw(RAW_DATA_PATH, "PALA")
    assert p_audit["station_name"] == "PALA"
    assert p_audit["has_2024_telemetry"] is False
    assert p_audit["coordinate_anomaly_detected"] is False
    assert p_audit["max_timestamp"].startswith("2022-11-25")

def test_continuous_hourly_segmentation_no_leakage():
    """Verify that segmentation produces clean hourly steps with no NaNs."""
    df, _ = load_station_raw(RAW_DATA_PATH, "PALA")
    dataset, valid_segs, skipped_segs = create_continuous_hourly_segments(df, max_gap_hours=3.0)
    assert valid_segs > 50
    assert len(dataset) > 5000
    assert dataset.isna().sum().sum() == 0, "Found NaNs in segmented feature table"
    assert "target_wl_1h" in dataset.columns
    assert "target_delta_1h" in dataset.columns

def test_multi_station_metrics_artifact_validity():
    """Verify that multi_station_evaluation_metrics.json exists and contains all stations."""
    assert os.path.exists(OUTPUT_METRICS_PATH), "Metrics JSON artifact missing"
    with open(OUTPUT_METRICS_PATH, "r") as f:
        metrics = json.load(f)

    expected_stations = [
        "RAMAMANGALAM BRIDGE",
        "MALAYATTOOR KODANAD BRIDGE",
        "PALA",
        "MANIYAR DAM",
        "TRINAYAKUDAM",
    ]
    for st in expected_stations:
        assert st in metrics, f"Station {st} missing from evaluation metrics"
        st_data = metrics[st]
        assert "audit" in st_data
        assert "samples" in st_data
        assert "metrics" in st_data
        assert "test" in st_data["metrics"]
        test_res = st_data["metrics"]["test"]
        assert "persistence" in test_res
        assert "ridge_regressor" in test_res
        assert test_res["persistence"]["mae_m"] > 0
        assert test_res["ridge_regressor"]["mae_m"] > 0
