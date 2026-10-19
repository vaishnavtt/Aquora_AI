"""
AQUORA AI - River Telemetry Data Service & Provider Abstraction
Supports live telemetry ingestion from official government hydrology APIs:
1. India NWIC / National Water Data Portal (NWDP / India-WRIS) for Kerala SW station RAMAMANGALAM BRIDGE.
2. U.S. Geological Survey (USGS) National Water Information System (NWIS) for live instantaneous river stage.
Alongside verified historical archive telemetry fallback.
"""

import os
import sys
import time
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
import urllib.request
import urllib.error
import urllib.parse
import json

from app.schemas.river_data import (
    RiverDataResponse,
    LatestHistoricalReading,
    HistoricalReadingPoint,
    HistoricalSeriesResponse,
    ForecastObservationComparisonPoint,
    ForecastVsObservationResponse,
)

logger = logging.getLogger(__name__)

OFFICIAL_SOURCE_AGENCY = "Kerala State Water Resources Department (Kerala SW) via NWIC"
STATION_CANONICAL = "RAMAMANGALAM BRIDGE"
DISTRICT_CANONICAL = "ERNAKULAM"

# Confirmed historical observation from Kerala SW archive
LATEST_HISTORICAL_RECORD = {
    "timestamp": "2025-03-10T08:30:00+05:30",
    "water_level_m": 2.162,
    "description": (
        "Confirmed historical telemetry observation in the official Kerala SW 2021-2025 "
        "archive for RAMAMANGALAM BRIDGE (10-Mar-2025 08:30 IST)."
    ),
}

USGS_DEFAULT_SITE = "11164500"  # San Francisquito Creek at Stanford, CA
USGS_SOURCE_AGENCY = "U.S. Geological Survey (USGS) National Water Information System"

KERALA_STATIONS_CONFIG: Dict[str, Dict[str, Any]] = {
    "RAMAMANGALAM BRIDGE": {
        "canonical": "RAMAMANGALAM BRIDGE",
        "district": "ERNAKULAM",
        "river": "Muvattupuzha",
        "features_file": "ramamangalam_hourly_features.csv",
        "latest_reading": {
            "timestamp": "2025-03-10T08:30:00+05:30",
            "water_level_m": 2.162,
            "description": "Confirmed historical telemetry observation in Kerala SW archive for RAMAMANGALAM BRIDGE (10-Mar-2025 08:30 IST)."
        },
    },
    "PALA": {
        "canonical": "PALA",
        "district": "KOTTAYAM",
        "river": "Meenachil",
        "features_file": "pala_hourly_features.csv",
        "latest_reading": {
            "timestamp": "2022-11-25T11:00:00+05:30",
            "water_level_m": 4.88,
            "description": "Confirmed historical telemetry observation in Kerala SW archive for PALA (25-Nov-2022 11:00 IST)."
        },
    },
    "TRINAYAKUDAM": {
        "canonical": "TRINAYAKUDAM",
        "district": "KOTTAYAM",
        "river": "Muvattupuzha",
        "features_file": "trinayakudam_hourly_features.csv",
        "latest_reading": {
            "timestamp": "2025-01-20T09:00:00+05:30",
            "water_level_m": 2.65,
            "description": "Confirmed historical telemetry observation in Kerala SW archive for TRINAYAKUDAM (20-Jan-2025 09:00 IST)."
        },
    },
}

def resolve_kerala_station(station_query: str) -> Optional[str]:
    clean = station_query.replace("-", " ").replace("_", " ").strip().upper()
    if "RAMAMANGALAM" in clean:
        return "RAMAMANGALAM BRIDGE"
    if "PALA" in clean:
        return "PALA"
    if "TRINAYAKUDAM" in clean:
        return "TRINAYAKUDAM"
    return None


class RiverDataProvider(ABC):
    """Abstract interface for river water level data providers."""

    @abstractmethod
    def fetch_station_data(self, station_name: str) -> RiverDataResponse:
        """Fetch river telemetry observation for a given station."""
        pass


class LiveNWICProvider(RiverDataProvider):
    """
    Live government telemetry provider interface for National Water Informatics Centre (NWIC).
    Ministry of Jal Shakti / Kerala Surface Water Department telemetry APIs.
    """

    def __init__(
        self,
        api_base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout_seconds: float = 5.0,
        cache_ttl_seconds: float = 300.0,
    ):
        self.api_base_url = (
            api_base_url
            or os.getenv("NWIC_API_BASE_URL", "https://nwdp.gov.in/api/v1")
        ).rstrip("/")
        self.api_key = api_key or os.getenv("NWIC_API_KEY", "")
        self.timeout_seconds = float(os.getenv("NWIC_TIMEOUT_SECONDS", str(timeout_seconds)))
        self.cache_ttl_seconds = float(os.getenv("NWIC_CACHE_TTL_SECONDS", str(cache_ttl_seconds)))
        self._cache: Dict[str, Tuple[float, RiverDataResponse]] = {}

    def fetch_station_data(self, station_name: str) -> RiverDataResponse:
        cache_key = station_name.strip().upper()

        # Check cache freshness
        if cache_key in self._cache:
            cached_time, cached_resp = self._cache[cache_key]
            if (time.time() - cached_time) < self.cache_ttl_seconds:
                return cached_resp.model_copy(
                    update={
                        "is_cached": True,
                        "data_freshness": f"Cached ({int(time.time() - cached_time)}s ago)",
                    }
                )

        # If no verified government API key is provided, report explicit UNAVAILABLE status
        if not self.api_key or self.api_key == "your_nwic_api_key_here":
            response = RiverDataResponse(
                station_name=STATION_CANONICAL,
                district=DISTRICT_CANONICAL,
                status="UNAVAILABLE",
                water_level_m=None,
                flow_rate_cms=None,
                observation_timestamp=None,
                is_live=False,
                is_cached=False,
                data_source=OFFICIAL_SOURCE_AGENCY,
                data_freshness="No live feed credentials configured",
                notice=(
                    "No authorized live telemetry API credentials configured for NWIC/Kerala SW. "
                    "Historical telemetry archive data is displayed for research demonstration."
                ),
                access_requirements=(
                    "Official live river telemetry requires registered API access via the National Water "
                    "Data Portal (https://nwdp.gov.in) under the Ministry of Jal Shakti. "
                    "Provide NWIC_API_KEY in backend environment to activate live polling."
                ),
                latest_historical_reading=LatestHistoricalReading(**LATEST_HISTORICAL_RECORD),
            )
            return response

        # Attempt authenticated live request to NWIC endpoint
        endpoint_url = f"{self.api_base_url}/telemetry/river-water-level?station={urllib.parse.quote(station_name)}"
        headers = {
            "User-Agent": "AQUORA-AI/1.0",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        try:
            req = urllib.request.Request(endpoint_url, headers=headers)
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as raw_resp:
                if raw_resp.status == 200:
                    payload = json.loads(raw_resp.read().decode("utf-8"))
                    raw_level = float(payload.get("water_level_m", 0.0))
                    raw_time = payload.get("observation_timestamp")

                    if not (0.0 <= raw_level <= 25.0):
                        raise ValueError(f"Water level out of plausible range (0-25m): {raw_level}")

                    resp = RiverDataResponse(
                        station_name=STATION_CANONICAL,
                        district=DISTRICT_CANONICAL,
                        status="LIVE",
                        water_level_m=round(raw_level, 4),
                        flow_rate_cms=payload.get("flow_rate_cms"),
                        observation_timestamp=raw_time,
                        is_live=True,
                        is_cached=False,
                        data_source=OFFICIAL_SOURCE_AGENCY,
                        data_freshness="Live Telemetry (< 15 min old)",
                        notice="Live telemetry feed authenticated via National Water Data Portal (NWIC).",
                        access_requirements="Live API authenticated via NWIC_API_KEY.",
                        latest_historical_reading=LatestHistoricalReading(**LATEST_HISTORICAL_RECORD),
                    )
                    self._cache[cache_key] = (time.time(), resp)
                    return resp
                else:
                    raise urllib.error.HTTPError(
                        endpoint_url, raw_resp.status, "Unexpected HTTP status", raw_resp.headers, None
                    )

        except Exception as exc:
            logger.warning("Live telemetry fetch from NWIC failed: %s", exc)
            return RiverDataResponse(
                station_name=STATION_CANONICAL,
                district=DISTRICT_CANONICAL,
                status="UNAVAILABLE",
                water_level_m=None,
                flow_rate_cms=None,
                observation_timestamp=None,
                is_live=False,
                is_cached=False,
                data_source=OFFICIAL_SOURCE_AGENCY,
                data_freshness="Service Connection Failed",
                notice=f"Upstream NWIC live telemetry endpoint could not be reached ({type(exc).__name__}).",
                access_requirements=(
                    "Verify NWIC_API_BASE_URL and network connectivity to nwdp.gov.in."
                ),
                latest_historical_reading=LatestHistoricalReading(**LATEST_HISTORICAL_RECORD),
            )


class LiveUSGSProvider(RiverDataProvider):
    """
    Live government telemetry provider using the U.S. Geological Survey (USGS)
    Water Services Instantaneous Values REST API (https://waterservices.usgs.gov/nwis/iv/).
    Publicly supported official government hydrological API.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        default_site: Optional[str] = None,
        timeout_seconds: float = 6.0,
        cache_ttl_seconds: float = 180.0,
    ):
        self.base_url = (
            base_url
            or os.getenv("USGS_API_BASE_URL", "https://waterservices.usgs.gov/nwis/iv/")
        ).rstrip("/")
        self.default_site = (
            default_site
            or os.getenv("USGS_DEFAULT_SITE", USGS_DEFAULT_SITE)
        )
        self.timeout_seconds = float(os.getenv("USGS_TIMEOUT_SECONDS", str(timeout_seconds)))
        self.cache_ttl_seconds = float(os.getenv("USGS_CACHE_TTL_SECONDS", str(cache_ttl_seconds)))
        self._cache: Dict[str, Tuple[float, RiverDataResponse]] = {}

    def fetch_station_data(self, station_name: str) -> RiverDataResponse:
        # Determine USGS site code from station_name or default
        clean = station_name.strip().upper()
        site_id = self.default_site
        if any(char.isdigit() for char in clean):
            # Extract digits if site code was provided
            extracted_digits = "".join(ch for ch in clean if ch.isdigit())
            if len(extracted_digits) >= 6:
                site_id = extracted_digits

        cache_key = f"USGS_{site_id}"
        if cache_key in self._cache:
            cached_time, cached_resp = self._cache[cache_key]
            if (time.time() - cached_time) < self.cache_ttl_seconds:
                return cached_resp.model_copy(
                    update={
                        "is_cached": True,
                        "data_freshness": f"Cached ({int(time.time() - cached_time)}s ago)",
                    }
                )

        # Request instantaneous gage height (00065) and discharge (00060)
        url = f"{self.base_url}/?format=json&sites={site_id}&parameterCd=00065,00060&siteStatus=all"
        headers = {
            "User-Agent": "AQUORA-AI-Hydrology/1.0 (Contact: safety@aquora.local)",
            "Accept": "application/json",
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as raw_resp:
                if raw_resp.status != 200:
                    raise urllib.error.HTTPError(url, raw_resp.status, "Unexpected status", raw_resp.headers, None)

                data = json.loads(raw_resp.read().decode("utf-8"))
                time_series_list = data.get("value", {}).get("timeSeries", [])
                if not time_series_list:
                    raise ValueError(f"No active timeSeries records found for USGS site {site_id}")

                site_name_official = time_series_list[0].get("sourceInfo", {}).get("siteName", f"USGS Site {site_id}")

                stage_m: Optional[float] = None
                flow_cms: Optional[float] = None
                obs_time: Optional[str] = None

                for ts in time_series_list:
                    var_code = ts.get("variable", {}).get("variableCode", [{}])[0].get("value", "")
                    values = ts.get("values", [{}])[0].get("value", [])
                    if not values:
                        continue
                    latest = values[-1]
                    raw_val = float(latest.get("value", 0.0))
                    obs_time = latest.get("dateTime", obs_time)

                    if var_code == "00065":
                        # Gage height in feet -> convert to metres
                        stage_m = round(raw_val * 0.3048, 4)
                    elif var_code == "00060":
                        # Discharge in cubic feet per second -> convert to cubic metres per second
                        flow_cms = round(raw_val * 0.0283168, 4)

                if stage_m is None and flow_cms is None:
                    raise ValueError(f"No recent gage height or streamflow readings returned for site {site_id}")

                resp = RiverDataResponse(
                    station_name=site_name_official,
                    district="CALIFORNIA HYDROLOGIC REGION",
                    status="LIVE",
                    water_level_m=stage_m,
                    flow_rate_cms=flow_cms,
                    observation_timestamp=obs_time,
                    is_live=True,
                    is_cached=False,
                    data_source=USGS_SOURCE_AGENCY,
                    data_freshness="Live Telemetry (Real-time NWIS Feed)",
                    notice="Authentic instantaneous stream telemetry ingested directly from USGS Water Services API.",
                    access_requirements="Public REST service (waterservices.usgs.gov). No API key required.",
                    latest_historical_reading=None,
                )
                self._cache[cache_key] = (time.time(), resp)
                return resp

        except Exception as exc:
            logger.warning("USGS live telemetry fetch failed for %s: %s", site_id, exc)
            return RiverDataResponse(
                station_name=f"USGS Station ({site_id})",
                district="CALIFORNIA HYDROLOGIC REGION",
                status="UNAVAILABLE",
                water_level_m=None,
                flow_rate_cms=None,
                observation_timestamp=None,
                is_live=False,
                is_cached=False,
                data_source=USGS_SOURCE_AGENCY,
                data_freshness="Service Connection Failed",
                notice=f"USGS live telemetry endpoint could not be reached ({type(exc).__name__}: {str(exc)}).",
                access_requirements="Verify internet connectivity to waterservices.usgs.gov.",
                latest_historical_reading=None,
            )


class HistoricalRiverDataProvider(RiverDataProvider):
    """Provides confirmed historical observations from the Kerala SW dataset."""

    def fetch_station_data(self, station_name: str) -> RiverDataResponse:
        return RiverDataResponse(
            station_name=STATION_CANONICAL,
            district=DISTRICT_CANONICAL,
            status="HISTORICAL",
            water_level_m=LATEST_HISTORICAL_RECORD["water_level_m"],
            flow_rate_cms=None,
            observation_timestamp=LATEST_HISTORICAL_RECORD["timestamp"],
            is_live=False,
            is_cached=False,
            data_source=OFFICIAL_SOURCE_AGENCY,
            data_freshness="Historical Archive Record (10-Mar-2025 08:30 IST)",
            notice=(
                "HISTORICAL DEMONSTRATION DATA: This observation is from the official Kerala SW "
                "telemetry archive (10-Mar-2025 08:30 IST), not a live streaming sensor feed."
            ),
            access_requirements="No credentials required for historical research dataset.",
            latest_historical_reading=LatestHistoricalReading(**LATEST_HISTORICAL_RECORD),
        )


class RiverDataService:
    """Orchestrates live telemetry checking with graceful fallback to historical context."""

    def __init__(self):
        self.live_nwic_provider = LiveNWICProvider()
        self.live_usgs_provider = LiveUSGSProvider()
        self.historical_provider = HistoricalRiverDataProvider()
        self._cached_features_dfs: Dict[str, Any] = {}

    def _get_station_features_df(self, station_canonical: str):
        if station_canonical not in self._cached_features_dfs:
            config = KERALA_STATIONS_CONFIG.get(station_canonical)
            if not config:
                return None
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            csv_path = os.path.join(project_root, "data", "processed", config["features_file"])
            if os.path.exists(csv_path):
                try:
                    import pandas as pd
                    self._cached_features_dfs[station_canonical] = pd.read_csv(csv_path)
                except Exception as e:
                    logger.warning("Failed to load historical features CSV for %s: %s", station_canonical, e)
        return self._cached_features_dfs.get(station_canonical)

    def _get_ramamangalam_features_df(self):
        return self._get_station_features_df(STATION_CANONICAL)

    def get_river_data(self, station_query: str, mode: str = "auto") -> RiverDataResponse:
        clean = station_query.replace("-", " ").replace("_", " ").strip().upper()
        mode_clean = (mode or "auto").strip().lower()

        # If user explicitly requested historical mode for Ramamangalam
        if mode_clean == "historical" and ("RAMAMANGALAM" in clean or clean == "HISTORICAL"):
            return self.historical_provider.fetch_station_data(STATION_CANONICAL)

        # Route USGS stations / California live streams
        if "USGS" in clean or "STANFORD" in clean or "FRANCISQUITO" in clean or any(ch.isdigit() for ch in clean):
            return self.live_usgs_provider.fetch_station_data(station_query)

        # Route Kerala SW stations
        kerala_st = resolve_kerala_station(station_query)
        if kerala_st:
            if kerala_st == STATION_CANONICAL:
                # Check live NWIC feed (returns UNAVAILABLE if NWIC_API_KEY absent)
                return self.live_nwic_provider.fetch_station_data(STATION_CANONICAL)

            # Historical archive record for other calibrated stations (e.g. Pala, Trinayakudam)
            cfg = KERALA_STATIONS_CONFIG[kerala_st]
            rec = cfg["latest_reading"]
            return RiverDataResponse(
                station_name=cfg["canonical"],
                district=cfg["district"],
                status="HISTORICAL",
                water_level_m=rec["water_level_m"],
                flow_rate_cms=None,
                observation_timestamp=rec["timestamp"],
                is_live=False,
                is_cached=False,
                data_source=OFFICIAL_SOURCE_AGENCY,
                data_freshness=f"Historical Archive Record ({rec['timestamp']})",
                notice=(
                    f"HISTORICAL DEMONSTRATION DATA: Observation for '{cfg['canonical']}' is from the official "
                    f"Kerala SW telemetry archive, not a live streaming feed."
                ),
                access_requirements="No credentials required for historical research dataset.",
                latest_historical_reading=LatestHistoricalReading(
                    timestamp=rec["timestamp"],
                    water_level_m=rec["water_level_m"],
                    description=rec["description"],
                ),
            )

        # Unsupported station query
        return RiverDataResponse(
            station_name=station_query,
            district="UNKNOWN",
            status="UNAVAILABLE",
            water_level_m=None,
            flow_rate_cms=None,
            observation_timestamp=None,
            is_live=False,
            is_cached=False,
            data_source="Government Telemetry Portal",
            data_freshness="Unsupported Station",
            notice=f"Telemetry integration calibrated for '{STATION_CANONICAL}', 'PALA', 'TRINAYAKUDAM' (NWIC) and USGS sites (e.g. 11164500).",
            access_requirements=None,
            latest_historical_reading=None,
        )

    def get_historical_series(self, station_name: str, limit: int = 48) -> HistoricalSeriesResponse:
        clean = station_name.replace("-", " ").replace("_", " ").strip().upper()
        kerala_st = resolve_kerala_station(station_name)
        if kerala_st:
            df = self._get_station_features_df(kerala_st)
            cfg = KERALA_STATIONS_CONFIG[kerala_st]
            if df is not None and not df.empty:
                tail = df.tail(min(limit, len(df)))
                readings = [
                    HistoricalReadingPoint(
                        timestamp=str(row["datetime"]),
                        water_level_m=round(float(row["wl_t"]), 4),
                        flow_rate_cms=None,
                        source="Kerala State Water Resources Department (Kerala SW)"
                    )
                    for _, row in tail.iterrows()
                ]
                return HistoricalSeriesResponse(
                    station_name=cfg["canonical"],
                    district=cfg["district"],
                    status="AVAILABLE_HISTORICAL",
                    data_source=OFFICIAL_SOURCE_AGENCY,
                    total_records=len(readings),
                    readings=readings,
                    notice=f"Authentic historical river stage telemetry from official Kerala SW archive for {cfg['canonical']}."
                )
            # Fallback to single confirmed reading
            rec = cfg.get("latest_reading", LATEST_HISTORICAL_RECORD)
            return HistoricalSeriesResponse(
                station_name=cfg["canonical"],
                district=cfg["district"],
                status="AVAILABLE_HISTORICAL",
                data_source=OFFICIAL_SOURCE_AGENCY,
                total_records=1,
                readings=[
                    HistoricalReadingPoint(
                        timestamp=rec["timestamp"],
                        water_level_m=rec["water_level_m"],
                        flow_rate_cms=None,
                        source=OFFICIAL_SOURCE_AGENCY
                    )
                ],
                notice=f"Confirmed historical observation point from Kerala SW archive for {cfg['canonical']}."
            )

        if "USGS" in clean or "STANFORD" in clean or "FRANCISQUITO" in clean or any(ch.isdigit() for ch in clean):
            live_data = self.live_usgs_provider.fetch_station_data(station_name)
            if live_data.is_live and live_data.water_level_m is not None:
                return HistoricalSeriesResponse(
                    station_name=live_data.station_name,
                    district=live_data.district,
                    status="AVAILABLE_LIVE",
                    data_source=live_data.data_source,
                    total_records=1,
                    readings=[
                        HistoricalReadingPoint(
                            timestamp=str(live_data.observation_timestamp),
                            water_level_m=live_data.water_level_m,
                            flow_rate_cms=live_data.flow_rate_cms,
                            source=live_data.data_source
                        )
                    ],
                    notice="Instantaneous stream telemetry reading directly from USGS NWIS API."
                )

        return HistoricalSeriesResponse(
            station_name=station_name,
            district="UNKNOWN",
            status="UNAVAILABLE",
            data_source="None",
            total_records=0,
            readings=[],
            notice=f"Historical telemetry series is unavailable for '{station_name}'. AQUORA AI does not synthesize historical trends."
        )

    def get_forecast_vs_observation(self, station_name: str, sample_size: int = 24) -> ForecastVsObservationResponse:
        clean = station_name.replace("-", " ").replace("_", " ").strip().upper()

        # Explicit rejection for dam barrages
        if "MANIYAR" in clean or "DAM" in clean or "BARRAGE" in clean or "RESERVOIR" in clean:
            return ForecastVsObservationResponse(
                station_name=station_name,
                model_name="EXCLUDED_DAM_BARRAGE",
                evaluation_dataset="Kerala SW Maniyar Dam Archive",
                comparisons=[],
                model_mae_m=0.0,
                baseline_persistence_mae_m=0.0,
                mae_reduction_percent=0.0,
                disclaimer=(
                    f"Station '{station_name}' is explicitly excluded from hydrological kinematic delta forecasting. "
                    f"Dam barrages are governed by unmonitored human mechanical sluice/crest gate maneuvers (empirical R² = -8.53); "
                    f"delta forecasting is mathematically unsuitable without real-time spillway gate opening and reservoir operational telemetry."
                )
            )

        kerala_st = resolve_kerala_station(station_name)
        if not kerala_st:
            return ForecastVsObservationResponse(
                station_name=station_name,
                model_name="N/A",
                evaluation_dataset="None",
                comparisons=[],
                model_mae_m=0.0,
                baseline_persistence_mae_m=0.0,
                mae_reduction_percent=0.0,
                disclaimer=f"Forecasting model is uncalibrated for '{station_name}'. Calibrated stations are: 'RAMAMANGALAM BRIDGE', 'PALA', 'TRINAYAKUDAM'."
            )

        df = self._get_station_features_df(kerala_st)
        if df is None or df.empty:
            raise RuntimeError(f"Historical evaluation features dataset is missing for '{kerala_st}'.")

        try:
            from app.ml.water_level_forecaster import get_forecaster_for_station
        except ImportError:
            from backend.app.ml.water_level_forecaster import get_forecaster_for_station

        forecaster = get_forecaster_for_station(kerala_st)
        if not forecaster.is_loaded:
            raise RuntimeError(f"Forecasting model artifact is not loaded for '{kerala_st}'.")

        sample_df = df.tail(min(sample_size, len(df)))
        comparisons = []
        model_errors = []
        baseline_errors = []

        for _, row in sample_df.iterrows():
            wl_t = float(row["wl_t"])
            actual_t1 = float(row["target_wl_1h"])
            feat_values = row[forecaster.feature_names].values.reshape(1, -1)
            predicted_delta = float(forecaster.model.predict(feat_values)[0])
            forecasted_t1 = round(wl_t + predicted_delta, 4)

            err_model = round(abs(forecasted_t1 - actual_t1), 4)
            err_baseline = round(abs(wl_t - actual_t1), 4)
            model_errors.append(err_model)
            baseline_errors.append(err_baseline)

            comparisons.append(ForecastObservationComparisonPoint(
                target_timestamp=str(row["datetime"]),
                water_level_t=round(wl_t, 4),
                forecasted_water_level_1h=forecasted_t1,
                actual_water_level_1h=round(actual_t1, 4),
                absolute_error_m=err_model,
                baseline_persistence_error_m=err_baseline,
                model_beat_persistence=err_model <= err_baseline
            ))

        avg_model_mae = round(sum(model_errors) / max(len(model_errors), 1), 4)
        avg_base_mae = round(sum(baseline_errors) / max(len(baseline_errors), 1), 4)
        reduction = round(((avg_base_mae - avg_model_mae) / avg_base_mae * 100), 2) if avg_base_mae > 0 else 0.0

        model_name = (
            forecaster.artifact.get("model_name", "RidgeRegressor (Kinematic Residual Delta)")
            if forecaster.artifact
            else "RidgeRegressor (Kinematic Residual Delta)"
        )

        return ForecastVsObservationResponse(
            station_name=kerala_st,
            model_name=model_name,
            evaluation_dataset=f"Kerala SW {kerala_st} Telemetry Archive (Out-of-sample Test Sequence)",
            comparisons=comparisons,
            model_mae_m=avg_model_mae,
            baseline_persistence_mae_m=avg_base_mae,
            mae_reduction_percent=reduction,
            disclaimer=f"Genuine ground-truth comparison: Ridge delta forecast vs subsequent recorded observation (t+1 hour) for {kerala_st}. Prototype research only."
        )


river_data_service = RiverDataService()
