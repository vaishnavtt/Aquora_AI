"""
Unit and integration tests for Central Water Commission (CWC) Live Telemetry Provider.
Verifies parsing, validation, freshness classification, station mapping,
error resilience, caching, and preservation of NWIC historical provider.
"""

import time
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

from app.services.cwc_live_provider import (
    CWCLiveProvider,
    resolve_cwc_station,
    CWC_KERALA_STATIONS_CONFIG,
    OFFICIAL_CWC_AGENCY,
)
from app.schemas.cwc_telemetry import CWCLiveStationReading, CWCLiveTelemetryResponse
from app.services.river_data_service import river_data_service
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def cwc_provider():
    return CWCLiveProvider(timeout_seconds=2.0, cache_ttl_seconds=60.0)


def test_resolve_cwc_station():
    """Verifies station query resolution across exact codes, station names, and river names."""
    # Exact codes
    assert resolve_cwc_station("012-SWRDKOCHI") == "012-SWRDKOCHI"
    assert resolve_cwc_station("011-SWRDKOCHI") == "011-SWRDKOCHI"
    assert resolve_cwc_station("CW1VAR000466") == "CW1VAR000466"

    # Station names
    assert resolve_cwc_station("Neeleeswaram") == "012-SWRDKOCHI"
    assert resolve_cwc_station("Arangali") == "011-SWRDKOCHI"
    assert resolve_cwc_station("Mankara") == "010-SWRDKOCHI"
    assert resolve_cwc_station("Kuttippuram") == "CW1VAR000466"
    assert resolve_cwc_station("Pulamanthole") == "007-SWRDKOCHI"
    assert resolve_cwc_station("Kuniyil") == "005-SWRDKOCHI"
    assert resolve_cwc_station("Kuttyadi") == "004-SWRDKOCHI"
    assert resolve_cwc_station("Perumannu") == "002-SWRDKOCHI"
    assert resolve_cwc_station("Idukki") == "0024-SWRDKOCHI"
    assert resolve_cwc_station("Idamalayar") == "0025-SWRDKOCHI"

    # Non-CWC stations
    assert resolve_cwc_station("RAMAMANGALAM BRIDGE") is None
    assert resolve_cwc_station("PALA") is None
    assert resolve_cwc_station("UNKNOWN_STATION") is None


def test_station_config_completeness():
    """Verifies all required Kerala stations have complete coordinates and metadata."""
    required_codes = [
        "012-SWRDKOCHI",  # Neeleeswaram
        "011-SWRDKOCHI",  # Arangali
        "010-SWRDKOCHI",  # Mankara
        "CW1VAR000466",   # Kuttippuram
        "007-SWRDKOCHI",  # Pulamanthole
        "005-SWRDKOCHI",  # Kuniyil
        "004-SWRDKOCHI",  # Kuttyadi
        "002-SWRDKOCHI",  # Perumannu
    ]
    for code in required_codes:
        assert code in CWC_KERALA_STATIONS_CONFIG
        cfg = CWC_KERALA_STATIONS_CONFIG[code]
        assert "station_name" in cfg
        assert "river" in cfg
        assert "district" in cfg
        assert 8.0 <= cfg["latitude"] <= 13.0
        assert 74.0 <= cfg["longitude"] <= 78.0
        assert cfg["warning_threshold_m"] is not None
        assert cfg["danger_threshold_m"] is not None
        assert cfg["danger_threshold_m"] > cfg["warning_threshold_m"]


def test_response_validation_and_rejection(cwc_provider):
    """Verifies parser accepts valid records and strictly rejects malformed or invalid records."""
    valid_payload = [
        {
            "@class": "com.eptisa.dto.NewEntryDataDto",
            "id": {
                "dataTime": "2026-10-30T23:00:00",
                "datatypeCode": "HHS",
                "stationCode": "011-SWRDKOCHI"
            },
            "dataValue": 1.16,
            "clientIpAddress": "59.92.192.192"
        }
    ]
    extracted = cwc_provider._validate_and_extract_reading(valid_payload, "011-SWRDKOCHI")
    assert extracted is not None
    val, obs_time = extracted
    assert val == 1.16
    assert obs_time == "2026-10-30T23:00:00"

    # Wrong station code
    assert cwc_provider._validate_and_extract_reading(valid_payload, "012-SWRDKOCHI") is None

    # Malformed / empty payloads
    assert cwc_provider._validate_and_extract_reading([], "011-SWRDKOCHI") is None
    assert cwc_provider._validate_and_extract_reading("not a list", "011-SWRDKOCHI") is None
    assert cwc_provider._validate_and_extract_reading([{}], "011-SWRDKOCHI") is None

    # Missing value
    invalid_no_val = [{"id": {"stationCode": "011-SWRDKOCHI", "dataTime": "2026-10-30T23:00:00"}, "dataValue": None}]
    assert cwc_provider._validate_and_extract_reading(invalid_no_val, "011-SWRDKOCHI") is None

    # Negative / out-of-bounds stage value
    negative_val = [{"id": {"stationCode": "011-SWRDKOCHI", "dataTime": "2026-10-30T23:00:00"}, "dataValue": -5.0}]
    assert cwc_provider._validate_and_extract_reading(negative_val, "011-SWRDKOCHI") is None

    absurd_val = [{"id": {"stationCode": "011-SWRDKOCHI", "dataTime": "2026-10-30T23:00:00"}, "dataValue": 9999.0}]
    assert cwc_provider._validate_and_extract_reading(absurd_val, "011-SWRDKOCHI") is None


def test_freshness_classification(cwc_provider):
    """Verifies LIVE, RECENT, STALE, and UNAVAILABLE classification rules."""
    # <= 4 hours -> LIVE
    f, s, is_live = cwc_provider._classify_freshness(age_hours=2.5, has_reading=True)
    assert f == "LIVE"
    assert s == "LIVE"
    assert is_live is True

    # 4 to 24 hours -> RECENT (not live)
    f, s, is_live = cwc_provider._classify_freshness(age_hours=14.0, has_reading=True)
    assert f == "RECENT"
    assert s == "RECENT"
    assert is_live is False

    # > 24 hours -> STALE
    f, s, is_live = cwc_provider._classify_freshness(age_hours=48.0, has_reading=True)
    assert f == "STALE"
    assert s == "STALE"
    assert is_live is False

    # Missing reading -> UNAVAILABLE
    f, s, is_live = cwc_provider._classify_freshness(age_hours=None, has_reading=False)
    assert f == "UNAVAILABLE"
    assert s == "UNAVAILABLE"
    assert is_live is False


def test_level_status_determination(cwc_provider):
    """Verifies NORMAL, WARNING, and DANGER threshold evaluation."""
    warn = 7.10
    danger = 8.10

    assert cwc_provider._determine_level_status(5.00, warn, danger) == "NORMAL"
    assert cwc_provider._determine_level_status(7.10, warn, danger) == "WARNING"
    assert cwc_provider._determine_level_status(7.50, warn, danger) == "WARNING"
    assert cwc_provider._determine_level_status(8.10, warn, danger) == "DANGER"
    assert cwc_provider._determine_level_status(9.20, warn, danger) == "DANGER"
    assert cwc_provider._determine_level_status(None, warn, danger) == "UNKNOWN"


def test_cwc_cache_behavior(cwc_provider):
    """Verifies that subsequent queries within cache TTL return cached responses with is_cached=True."""
    mock_reading = CWCLiveStationReading(
        station_code="011-SWRDKOCHI",
        station_name="Arangali",
        river="Chalakkudy",
        district="Thrissur",
        latitude=10.2861,
        longitude=76.3222,
        current_water_level_m=1.16,
        observation_time_iso="2026-10-30T17:30:00Z",
        observation_time_ist="30-Oct-2026 23:00 IST",
        retrieval_timestamp="2026-10-31T01:00:00Z",
        data_source=OFFICIAL_CWC_AGENCY,
        data_freshness="LIVE",
        status="LIVE",
        is_live=True,
        is_cached=False,
        unit="m",
        warning_threshold_m=7.10,
        danger_threshold_m=8.10,
        level_status="NORMAL"
    )

    cwc_provider._cache["011-SWRDKOCHI"] = (time.time(), mock_reading)

    cached_res = cwc_provider.fetch_station_reading_sync("011-SWRDKOCHI", force_refresh=False)
    assert cached_res.is_cached is True
    assert cached_res.current_water_level_m == 1.16


def test_network_failure_handling(cwc_provider):
    """Verifies that network timeout or HTTP error returns UNAVAILABLE without crashing."""
    with patch("urllib.request.urlopen", side_effect=Exception("Connection timed out")):
        res = cwc_provider.fetch_station_reading_sync("011-SWRDKOCHI", force_refresh=True)
        assert res.status == "UNAVAILABLE"
        assert res.data_freshness == "UNAVAILABLE"
        assert res.current_water_level_m is None
        assert res.is_live is False
        assert "Connection timed out" in (res.notice or "")


def test_river_data_service_cwc_routing():
    """Verifies RiverDataService routes CWC stations to CWC provider and leaves NWIC intact."""
    # 1. CWC station query
    cwc_res = river_data_service.get_river_data("ARANGALI")
    assert cwc_res.station_name == "Arangali"
    assert "Central Water Commission" in cwc_res.data_source

    # 2. Ramamangalam Bridge query (must preserve NWIC!)
    nwic_res = river_data_service.get_river_data("RAMAMANGALAM BRIDGE")
    assert nwic_res.station_name == "RAMAMANGALAM BRIDGE"
    assert "Kerala State Water Resources Department" in nwic_res.data_source
    assert "NWIC" in nwic_res.data_source

    # 3. Pala query (must preserve NWIC!)
    pala_res = river_data_service.get_river_data("PALA")
    assert pala_res.station_name == "PALA"
    assert "NWIC" in pala_res.data_source


def test_cwc_telemetry_endpoints(test_client):
    """Verifies /api/v1/cwc/telemetry and /api/v1/telemetry/providers/status."""
    # Providers status
    res_prov = test_client.get("/api/v1/telemetry/providers/status")
    assert res_prov.status_code == 200
    providers = res_prov.json().get("providers", [])
    prov_ids = [p["id"] for p in providers]
    assert "cwc" in prov_ids
    assert "nwic" in prov_ids
    assert "usgs" in prov_ids

    cwc_entry = next(p for p in providers if p["id"] == "cwc")
    assert cwc_entry["is_live"] is True
    assert cwc_entry["requires_auth"] is False

    # CWC Telemetry batch endpoint
    res_cwc = test_client.get("/api/v1/cwc/telemetry")
    assert res_cwc.status_code == 200
    cwc_data = res_cwc.json()
    assert "stations" in cwc_data
    assert cwc_data["total_stations"] >= 8
    station_names = [s["station_name"] for s in cwc_data["stations"]]
    assert "Arangali" in station_names
    assert "Neeleeswaram" in station_names
    assert "Kuttippuram" in station_names
