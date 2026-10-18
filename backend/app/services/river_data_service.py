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

from app.schemas.river_data import RiverDataResponse, LatestHistoricalReading

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

    def get_river_data(self, station_query: str, mode: str = "auto") -> RiverDataResponse:
        clean = station_query.replace("-", " ").replace("_", " ").strip().upper()
        mode_clean = (mode or "auto").strip().lower()

        # If user explicitly requested historical mode for Ramamangalam
        if mode_clean == "historical":
            return self.historical_provider.fetch_station_data(STATION_CANONICAL)

        # Route USGS stations / California live streams
        if "USGS" in clean or "STANFORD" in clean or "FRANCISQUITO" in clean or any(ch.isdigit() for ch in clean):
            return self.live_usgs_provider.fetch_station_data(station_query)

        # Route Ramamangalam Bridge / Kerala SW
        if "RAMAMANGALAM" in clean:
            # Check live NWIC feed (returns UNAVAILABLE if NWIC_API_KEY absent)
            return self.live_nwic_provider.fetch_station_data(STATION_CANONICAL)

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
            notice=f"Telemetry integration calibrated for '{STATION_CANONICAL}' (NWIC) and USGS sites (e.g. 11164500).",
            access_requirements=None,
            latest_historical_reading=None,
        )


river_data_service = RiverDataService()
