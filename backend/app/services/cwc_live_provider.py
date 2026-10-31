"""
AQUORA AI - Central Water Commission (CWC) Live River Telemetry Provider
Retrieves authentic, real-time river water-level measurements directly from
the Ministry of Jal Shakti / CWC Flood Forecasting System (ffs.india-water.gov.in).

Supports verified Kerala river monitoring stations:
- Neeleeswaram (Periyar River, Ernakulam)
- Arangali (Chalakkudy River, Thrissur)
- Mankara (Bharathappuzha River, Palakkad)
- Kuttippuram (Bharathappuzha River, Malappuram)
- Pulamanthole (Kunthipuzha River, Malappuram)
- Kuniyil (Chaliyar River, Malappuram/Kozhikode)
- Kuttyadi (Kuttiyadi River, Kozhikode)
- Perumannu (Valapattanam River, Kannur)
- Idukki Arch Reservoir (Periyar Basin, Idukki)
- Idamalayar Reservoir (Periyar Basin, Ernakulam)
"""

import os
import time
import json
import logging
import urllib.request
import urllib.parse
import urllib.error
import ssl
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone, timedelta

import httpx

try:
    from app.core.config import settings
    from app.schemas.cwc_telemetry import CWCLiveStationReading, CWCLiveTelemetryResponse
    from app.schemas.river_data import RiverDataResponse, LatestHistoricalReading
except ImportError:
    from backend.app.core.config import settings
    from backend.app.schemas.cwc_telemetry import CWCLiveStationReading, CWCLiveTelemetryResponse
    from backend.app.schemas.river_data import RiverDataResponse, LatestHistoricalReading

logger = logging.getLogger(__name__)

OFFICIAL_CWC_AGENCY = "Central Water Commission (CWC) Flood Forecast System via Ministry of Jal Shakti"

# Verified Kerala CWC Station Registry
CWC_KERALA_STATIONS_CONFIG: Dict[str, Dict[str, Any]] = {
    "012-SWRDKOCHI": {
        "station_code": "012-SWRDKOCHI",
        "station_name": "Neeleeswaram",
        "river": "Periyar",
        "district": "Ernakulam",
        "latitude": 10.1836,
        "longitude": 76.4956,
        "warning_threshold_m": 9.00,
        "danger_threshold_m": 10.00,
        "highest_flood_level_m": 12.40,
        "highest_flood_date": "2018-08-19",
        "station_type": "River Gauge",
    },
    "011-SWRDKOCHI": {
        "station_code": "011-SWRDKOCHI",
        "station_name": "Arangali",
        "river": "Chalakkudy",
        "district": "Thrissur",
        "latitude": 10.2861,
        "longitude": 76.3222,
        "warning_threshold_m": 7.10,
        "danger_threshold_m": 8.10,
        "highest_flood_level_m": 10.58,
        "highest_flood_date": "2018-08-16",
        "station_type": "River Gauge",
    },
    "010-SWRDKOCHI": {
        "station_code": "010-SWRDKOCHI",
        "station_name": "Mankara",
        "river": "Bharathappuzha",
        "district": "Palakkad",
        "latitude": 10.7611,
        "longitude": 76.4861,
        "warning_threshold_m": 51.53,
        "danger_threshold_m": 52.53,
        "highest_flood_level_m": 52.53,
        "highest_flood_date": "2018-08-16",
        "station_type": "River Gauge",
    },
    "CW1VAR000466": {
        "station_code": "CW1VAR000466",
        "station_name": "Kuttippuram",
        "river": "Bharathappuzha",
        "district": "Malappuram",
        "latitude": 10.8408,
        "longitude": 76.0222,
        "warning_threshold_m": 7.50,
        "danger_threshold_m": 8.50,
        "highest_flood_level_m": 6.98,
        "highest_flood_date": "2025-06-26",
        "station_type": "River Gauge",
    },
    "007-SWRDKOCHI": {
        "station_code": "007-SWRDKOCHI",
        "station_name": "Pulamanthole",
        "river": "Kunthipuzha",
        "district": "Malappuram",
        "latitude": 10.8981,
        "longitude": 76.1919,
        "warning_threshold_m": 15.60,
        "danger_threshold_m": 16.60,
        "highest_flood_level_m": 20.25,
        "highest_flood_date": "2019-08-09",
        "station_type": "River Gauge",
    },
    "005-SWRDKOCHI": {
        "station_code": "005-SWRDKOCHI",
        "station_name": "Kuniyil",
        "river": "Chaliyar",
        "district": "Malappuram / Kozhikode",
        "latitude": 11.2394,
        "longitude": 76.0233,
        "warning_threshold_m": 10.85,
        "danger_threshold_m": 11.85,
        "highest_flood_level_m": 12.14,
        "highest_flood_date": "2019-08-09",
        "station_type": "River Gauge",
    },
    "004-SWRDKOCHI": {
        "station_code": "004-SWRDKOCHI",
        "station_name": "Kuttyadi",
        "river": "Kuttiyadi",
        "district": "Kozhikode",
        "latitude": 11.6508,
        "longitude": 75.7583,
        "warning_threshold_m": 5.95,
        "danger_threshold_m": 6.95,
        "highest_flood_level_m": 8.70,
        "highest_flood_date": "2019-08-08",
        "station_type": "River Gauge",
    },
    "002-SWRDKOCHI": {
        "station_code": "002-SWRDKOCHI",
        "station_name": "Perumannu",
        "river": "Valapattanam",
        "district": "Kannur",
        "latitude": 11.9823,
        "longitude": 75.5842,
        "warning_threshold_m": 17.20,
        "danger_threshold_m": 18.20,
        "highest_flood_level_m": 18.28,
        "highest_flood_date": "2019-08-09",
        "station_type": "River Gauge",
    },
    "0024-SWRDKOCHI": {
        "station_code": "0024-SWRDKOCHI",
        "station_name": "Idukki Arch Reservoir",
        "river": "Periyar",
        "district": "Idukki",
        "latitude": 9.8400,
        "longitude": 76.9700,
        "warning_threshold_m": 730.00,
        "danger_threshold_m": 732.43,
        "highest_flood_level_m": 732.43,
        "highest_flood_date": None,
        "station_type": "Reservoir",
    },
    "0025-SWRDKOCHI": {
        "station_code": "0025-SWRDKOCHI",
        "station_name": "Idamalayar Reservoir",
        "river": "Periyar",
        "district": "Ernakulam",
        "latitude": 10.2200,
        "longitude": 76.7000,
        "warning_threshold_m": 167.00,
        "danger_threshold_m": 169.00,
        "highest_flood_level_m": 169.00,
        "highest_flood_date": None,
        "station_type": "Reservoir",
    },
}


def resolve_cwc_station(query: str) -> Optional[str]:
    """
    Resolves user/query string to verified CWC station code.
    Matches exact station code or substrings of station name / river.
    """
    clean = query.replace("-", " ").replace("_", " ").strip().upper()
    exact_match = query.strip().upper()

    # Exact station code check
    for code in CWC_KERALA_STATIONS_CONFIG:
        if code.upper() == exact_match or code.upper().replace("-", " ") == clean:
            return code

    # By station name
    if "NEELEESWARAM" in clean or "NEELESWARAM" in clean or "NEELISWARAM" in clean:
        return "012-SWRDKOCHI"
    if "ARANGALI" in clean or "CHALAKKUDY" in clean or "CHALAKUDY" in clean:
        return "011-SWRDKOCHI"
    if "MANKARA" in clean:
        return "010-SWRDKOCHI"
    if "KUTTIPPURAM" in clean or "KUTTIPURAM" in clean:
        return "CW1VAR000466"
    if "PULAMANTHOLE" in clean or "PULAMANTHOL" in clean or "KUNTHIPUZHA" in clean:
        return "007-SWRDKOCHI"
    if "KUNIYIL" in clean or "CHALIYAR" in clean:
        return "005-SWRDKOCHI"
    if "KUTTYADI" in clean or "KUTTIYADI" in clean:
        return "004-SWRDKOCHI"
    if "PERUMANNU" in clean or "VALAPATTANAM" in clean:
        return "002-SWRDKOCHI"
    if "IDUKKI" in clean:
        return "0024-SWRDKOCHI"
    if "IDAMALAYAR" in clean:
        return "0025-SWRDKOCHI"

    return None


class CWCLiveProvider:
    """
    Dedicated Central Water Commission (CWC) Live Telemetry Provider.
    Extracts authentic river water levels without requiring authentication tokens.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        cache_ttl_seconds: Optional[float] = None,
    ):
        self.base_url = (
            base_url
            or getattr(settings, "CWC_API_BASE_URL", "https://ffs.india-water.gov.in")
        ).rstrip("/")
        self.timeout_seconds = float(
            timeout_seconds
            or getattr(settings, "CWC_TIMEOUT_SECONDS", 8.0)
        )
        self.cache_ttl_seconds = float(
            cache_ttl_seconds
            or getattr(settings, "CWC_CACHE_TTL_SECONDS", 300.0)
        )
        # In-memory station reading cache: {station_code: (timestamp, CWCLiveStationReading)}
        self._cache: Dict[str, Tuple[float, CWCLiveStationReading]] = {}
        # Full response cache: (timestamp, CWCLiveTelemetryResponse)
        self._all_cache: Optional[Tuple[float, CWCLiveTelemetryResponse]] = None

    def _build_query_url(self, station_code: str, datatype: str, start_dt: str, end_dt: str) -> str:
        """Constructs Spring JPA specification query URL for CWC backend."""
        spec = {
            "where": {
                "where": {
                    "expression": {
                        "fieldName": "id.stationCode",
                        "operator": "eq",
                        "value": station_code,
                        "valueIsRelationField": False
                    }
                },
                "and": {
                    "expression": {
                        "fieldName": "id.datatypeCode",
                        "operator": "eq",
                        "value": datatype,
                        "valueIsRelationField": False
                    }
                }
            },
            "and": {
                "expression": {
                    "fieldName": "id.dataTime",
                    "operator": "btn",
                    "value": f"{start_dt},{end_dt}",
                    "valueIsRelationField": False
                }
            }
        }
        sort_criteria = {
            "sortOrderDtos": [
                {
                    "field": "id.dataTime",
                    "sortDirection": "DESC"
                }
            ]
        }
        encoded_spec = urllib.parse.quote(json.dumps(spec))
        encoded_sort = urllib.parse.quote(json.dumps(sort_criteria))
        return (
            f"{self.base_url}/iam/api/new-entry-data/specification/sorted-page"
            f"?page-number=0&page-size=3"
            f"&specification={encoded_spec}"
            f"&sort-criteria={encoded_sort}"
        )

    def _parse_observation_time(self, raw_time: str) -> Tuple[str, str, float]:
        """
        Parses CWC dataTime (recorded in Indian Standard Time UTC+05:30).
        Returns (iso_string, ist_formatted_string, age_hours).
        """
        # Formats: 2026-10-30T23:00:00 or 2026-10-30T23:00:00.000
        clean_time = raw_time.split(".")[0]
        try:
            dt = datetime.strptime(clean_time, "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            dt = datetime.now()

        # CWC records are in IST (UTC+05:30)
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        dt_ist = dt.replace(tzinfo=ist_tz)
        dt_utc = dt_ist.astimezone(timezone.utc)

        now_utc = datetime.now(timezone.utc)
        age_hours = max(0.0, (now_utc - dt_utc).total_seconds() / 3600.0)

        iso_str = dt_utc.isoformat()
        ist_str = dt_ist.strftime("%d-%b-%Y %H:%M IST")

        return iso_str, ist_str, age_hours

    def _classify_freshness(self, age_hours: Optional[float], has_reading: bool) -> Tuple[str, str, bool]:
        """
        Calculates data freshness according to rigorous real-time criteria:
        - LIVE: <= 4 hours old
        - RECENT: > 4 hours and <= 24 hours old
        - STALE: > 24 hours old
        - UNAVAILABLE: No reading or network failure
        Returns (freshness_status, operational_status, is_live).
        """
        if not has_reading or age_hours is None:
            return "UNAVAILABLE", "UNAVAILABLE", False

        if age_hours <= 4.0:
            return "LIVE", "LIVE", True
        elif age_hours <= 24.0:
            return "RECENT", "RECENT", False
        else:
            return "STALE", "STALE", False

    def _determine_level_status(self, current_level: Optional[float], warn: Optional[float], danger: Optional[float]) -> str:
        if current_level is None:
            return "UNKNOWN"
        if danger is not None and current_level >= danger:
            return "DANGER"
        if warn is not None and current_level >= warn:
            return "WARNING"
        return "NORMAL"

    def _validate_and_extract_reading(self, payload: Any, station_code: str) -> Optional[Tuple[float, str]]:
        """
        Validates the raw CWC API response array and extracts (water_level_m, dataTime).
        Rejects malformed, incomplete, or negative/out-of-bound readings.
        """
        if not isinstance(payload, list) or not payload:
            return None

        for item in payload:
            if not isinstance(item, dict):
                continue

            item_id = item.get("id")
            if not isinstance(item_id, dict):
                continue

            resp_st_code = item_id.get("stationCode")
            if resp_st_code != station_code:
                continue

            raw_time = item_id.get("dataTime")
            raw_value = item.get("dataValue")

            if raw_time is None or raw_value is None:
                continue

            try:
                stage_m = float(raw_value)
            except (ValueError, TypeError):
                continue

            # Hydro-physical validation: non-negative and within plausible Indian river/reservoir limits
            # High reservoirs in Kerala (e.g. Idukki FRL) reach 732m; rivers stay below 80m.
            if 0.0 <= stage_m <= 850.0:
                return stage_m, str(raw_time)

        return None

    def fetch_station_reading_sync(
        self,
        station_code: str,
        lookback_days: int = 4,
        force_refresh: bool = False
    ) -> CWCLiveStationReading:
        """Synchronously retrieves live observation for a specific CWC station code."""
        cfg = CWC_KERALA_STATIONS_CONFIG.get(station_code)
        if not cfg:
            resolved = resolve_cwc_station(station_code)
            if resolved:
                cfg = CWC_KERALA_STATIONS_CONFIG[resolved]
                station_code = resolved
            else:
                raise ValueError(f"Unknown or unsupported CWC station: '{station_code}'")

        # Cache check
        now_ts = time.time()
        if not force_refresh and station_code in self._cache:
            cached_time, cached_reading = self._cache[station_code]
            if (now_ts - cached_time) < self.cache_ttl_seconds:
                return cached_reading.model_copy(update={"is_cached": True})

        now_utc = datetime.now(timezone.utc)
        retrieval_iso = now_utc.isoformat()

        # Date window for CWC query
        start_dt = (now_utc - timedelta(days=lookback_days)).strftime("%Y-%m-%dT00:00:00.000")
        end_dt = (now_utc + timedelta(hours=3)).strftime("%Y-%m-%dT23:59:59.000")

        headers = {
            "User-Agent": "AQUORA-AI-Hydrology/2.0 (Kerala River Surveillance)",
            "Accept": "application/json",
            "class-name": "NewEntryDataDto",
            "Referer": "https://ffs.india-water.gov.in/",
        }

        reading_tuple: Optional[Tuple[float, str]] = None
        error_msg: Optional[str] = None

        # Query "HHS" (Hourly Stage) first, then fallback to "GHT" (Gauge Height Telemetric)
        for datatype in ["HHS", "GHT"]:
            url = self._build_query_url(station_code, datatype, start_dt, end_dt)
            for attempt in range(2):
                try:
                    req = urllib.request.Request(url, headers=headers)
                    ctx = ssl.create_default_context()
                    ctx.check_hostname = False
                    ctx.verify_mode = ssl.CERT_NONE

                    with urllib.request.urlopen(req, context=ctx, timeout=self.timeout_seconds) as resp:
                        if resp.status == 200:
                            data = json.loads(resp.read().decode("utf-8"))
                            reading_tuple = self._validate_and_extract_reading(data, station_code)
                            if reading_tuple:
                                break
                except Exception as exc:
                    logger.debug("CWC query attempt %d failed for %s (%s): %s", attempt + 1, station_code, datatype, exc)
                    error_msg = f"{type(exc).__name__}: {str(exc)}"
                    time.sleep(0.3)

            if reading_tuple:
                break

        if reading_tuple:
            stage_m, raw_time = reading_tuple
            obs_iso, obs_ist, age_h = self._parse_observation_time(raw_time)
            freshness, stat, is_live = self._classify_freshness(age_h, True)
            lvl_stat = self._determine_level_status(
                stage_m,
                cfg.get("warning_threshold_m"),
                cfg.get("danger_threshold_m")
            )
            notice = (
                f"Authentic CWC physical telemetry observation ({obs_ist}). "
                f"Recorded ~{round(age_h, 1)}h ago."
            )
            result = CWCLiveStationReading(
                station_code=cfg["station_code"],
                station_name=cfg["station_name"],
                river=cfg["river"],
                district=cfg["district"],
                latitude=cfg["latitude"],
                longitude=cfg["longitude"],
                current_water_level_m=round(stage_m, 3),
                observation_time_iso=obs_iso,
                observation_time_ist=obs_ist,
                retrieval_timestamp=retrieval_iso,
                data_source=OFFICIAL_CWC_AGENCY,
                data_freshness=freshness,
                status=stat,
                is_live=is_live,
                is_cached=False,
                unit="m",
                warning_threshold_m=cfg.get("warning_threshold_m"),
                danger_threshold_m=cfg.get("danger_threshold_m"),
                highest_flood_level_m=cfg.get("highest_flood_level_m"),
                highest_flood_date=cfg.get("highest_flood_date"),
                level_status=lvl_stat,
                notice=notice,
            )
        else:
            freshness, stat, is_live = self._classify_freshness(None, False)
            notice = (
                f"CWC telemetry observation currently unavailable for {cfg['station_name']} "
                f"({error_msg or 'No active records returned in lookback window'})."
            )
            result = CWCLiveStationReading(
                station_code=cfg["station_code"],
                station_name=cfg["station_name"],
                river=cfg["river"],
                district=cfg["district"],
                latitude=cfg["latitude"],
                longitude=cfg["longitude"],
                current_water_level_m=None,
                observation_time_iso=None,
                observation_time_ist=None,
                retrieval_timestamp=retrieval_iso,
                data_source=OFFICIAL_CWC_AGENCY,
                data_freshness=freshness,
                status=stat,
                is_live=is_live,
                is_cached=False,
                unit="m",
                warning_threshold_m=cfg.get("warning_threshold_m"),
                danger_threshold_m=cfg.get("danger_threshold_m"),
                highest_flood_level_m=cfg.get("highest_flood_level_m"),
                highest_flood_date=cfg.get("highest_flood_date"),
                level_status="UNKNOWN",
                notice=notice,
            )

        self._cache[station_code] = (now_ts, result)
        return result

    async def fetch_station_reading_async(
        self,
        station_code: str,
        lookback_days: int = 4,
        force_refresh: bool = False
    ) -> CWCLiveStationReading:
        """Asynchronously retrieves live observation for a specific CWC station code."""
        cfg = CWC_KERALA_STATIONS_CONFIG.get(station_code)
        if not cfg:
            resolved = resolve_cwc_station(station_code)
            if resolved:
                cfg = CWC_KERALA_STATIONS_CONFIG[resolved]
                station_code = resolved
            else:
                raise ValueError(f"Unknown or unsupported CWC station: '{station_code}'")

        now_ts = time.time()
        if not force_refresh and station_code in self._cache:
            cached_time, cached_reading = self._cache[station_code]
            if (now_ts - cached_time) < self.cache_ttl_seconds:
                return cached_reading.model_copy(update={"is_cached": True})

        now_utc = datetime.now(timezone.utc)
        retrieval_iso = now_utc.isoformat()

        start_dt = (now_utc - timedelta(days=lookback_days)).strftime("%Y-%m-%dT00:00:00.000")
        end_dt = (now_utc + timedelta(hours=3)).strftime("%Y-%m-%dT23:59:59.000")

        headers = {
            "User-Agent": "AQUORA-AI-Hydrology/2.0 (Kerala River Surveillance)",
            "Accept": "application/json",
            "class-name": "NewEntryDataDto",
            "Referer": "https://ffs.india-water.gov.in/",
        }

        reading_tuple: Optional[Tuple[float, str]] = None
        error_msg: Optional[str] = None

        async with httpx.AsyncClient(verify=False, timeout=self.timeout_seconds) as client:
            for datatype in ["HHS", "GHT"]:
                url = self._build_query_url(station_code, datatype, start_dt, end_dt)
                for attempt in range(2):
                    try:
                        resp = await client.get(url, headers=headers)
                        if resp.status_code == 200:
                            data = resp.json()
                            reading_tuple = self._validate_and_extract_reading(data, station_code)
                            if reading_tuple:
                                break
                    except Exception as exc:
                        logger.debug("Async CWC query failed for %s (%s): %s", station_code, datatype, exc)
                        error_msg = f"{type(exc).__name__}: {str(exc)}"
                if reading_tuple:
                    break

        if reading_tuple:
            stage_m, raw_time = reading_tuple
            obs_iso, obs_ist, age_h = self._parse_observation_time(raw_time)
            freshness, stat, is_live = self._classify_freshness(age_h, True)
            lvl_stat = self._determine_level_status(
                stage_m,
                cfg.get("warning_threshold_m"),
                cfg.get("danger_threshold_m")
            )
            notice = (
                f"Authentic CWC physical telemetry observation ({obs_ist}). "
                f"Recorded ~{round(age_h, 1)}h ago."
            )
            result = CWCLiveStationReading(
                station_code=cfg["station_code"],
                station_name=cfg["station_name"],
                river=cfg["river"],
                district=cfg["district"],
                latitude=cfg["latitude"],
                longitude=cfg["longitude"],
                current_water_level_m=round(stage_m, 3),
                observation_time_iso=obs_iso,
                observation_time_ist=obs_ist,
                retrieval_timestamp=retrieval_iso,
                data_source=OFFICIAL_CWC_AGENCY,
                data_freshness=freshness,
                status=stat,
                is_live=is_live,
                is_cached=False,
                unit="m",
                warning_threshold_m=cfg.get("warning_threshold_m"),
                danger_threshold_m=cfg.get("danger_threshold_m"),
                highest_flood_level_m=cfg.get("highest_flood_level_m"),
                highest_flood_date=cfg.get("highest_flood_date"),
                level_status=lvl_stat,
                notice=notice,
            )
        else:
            freshness, stat, is_live = self._classify_freshness(None, False)
            notice = (
                f"CWC telemetry observation currently unavailable for {cfg['station_name']} "
                f"({error_msg or 'No active records returned in lookback window'})."
            )
            result = CWCLiveStationReading(
                station_code=cfg["station_code"],
                station_name=cfg["station_name"],
                river=cfg["river"],
                district=cfg["district"],
                latitude=cfg["latitude"],
                longitude=cfg["longitude"],
                current_water_level_m=None,
                observation_time_iso=None,
                observation_time_ist=None,
                retrieval_timestamp=retrieval_iso,
                data_source=OFFICIAL_CWC_AGENCY,
                data_freshness=freshness,
                status=stat,
                is_live=is_live,
                is_cached=False,
                unit="m",
                warning_threshold_m=cfg.get("warning_threshold_m"),
                danger_threshold_m=cfg.get("danger_threshold_m"),
                highest_flood_level_m=cfg.get("highest_flood_level_m"),
                highest_flood_date=cfg.get("highest_flood_date"),
                level_status="UNKNOWN",
                notice=notice,
            )

        self._cache[station_code] = (now_ts, result)
        return result

    def fetch_all_kerala_stations_sync(self, force_refresh: bool = False) -> CWCLiveTelemetryResponse:
        """Synchronously retrieves all verified Kerala CWC stations."""
        now_ts = time.time()
        if not force_refresh and self._all_cache:
            cached_time, cached_resp = self._all_cache
            if (now_ts - cached_time) < self.cache_ttl_seconds:
                return cached_resp

        station_readings: List[CWCLiveStationReading] = []
        for code in CWC_KERALA_STATIONS_CONFIG:
            try:
                reading = self.fetch_station_reading_sync(code, force_refresh=force_refresh)
                station_readings.append(reading)
            except Exception as exc:
                logger.warning("Error fetching CWC station %s: %s", code, exc)

        live_count = sum(1 for r in station_readings if r.status in ("LIVE", "RECENT"))
        total_count = len(station_readings)

        provider_status = "CONNECTED" if live_count > 0 else "DEGRADED" if total_count > 0 else "UNAVAILABLE"

        response = CWCLiveTelemetryResponse(
            timestamp=datetime.now(timezone.utc).isoformat(),
            provider="Central Water Commission (CWC) - Ministry of Jal Shakti",
            provider_status=provider_status,
            api_endpoint=f"{self.base_url}/iam/api/new-entry-data/specification/sorted-page",
            total_stations=total_count,
            live_stations_count=live_count,
            stations=station_readings,
            notice=f"Monitoring {total_count} official CWC stations across Kerala river basins. {live_count} currently active.",
            disclaimer=(
                "Authentic river stage observations ingested directly from CWC Flood Forecasting System. "
                "Not fed into Ramamangalam kinematic delta forecasting model without station-specific recalibration."
            )
        )
        self._all_cache = (now_ts, response)
        return response

    async def fetch_all_kerala_stations_async(self, force_refresh: bool = False) -> CWCLiveTelemetryResponse:
        """Asynchronously retrieves all verified Kerala CWC stations."""
        now_ts = time.time()
        if not force_refresh and self._all_cache:
            cached_time, cached_resp = self._all_cache
            if (now_ts - cached_time) < self.cache_ttl_seconds:
                return cached_resp

        import asyncio
        tasks = [
            self.fetch_station_reading_async(code, force_refresh=force_refresh)
            for code in CWC_KERALA_STATIONS_CONFIG
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        station_readings: List[CWCLiveStationReading] = []
        for r in results:
            if isinstance(r, CWCLiveStationReading):
                station_readings.append(r)
            else:
                logger.warning("Async CWC station fetch exception: %s", r)

        live_count = sum(1 for r in station_readings if r.status in ("LIVE", "RECENT"))
        total_count = len(station_readings)
        provider_status = "CONNECTED" if live_count > 0 else "DEGRADED" if total_count > 0 else "UNAVAILABLE"

        response = CWCLiveTelemetryResponse(
            timestamp=datetime.now(timezone.utc).isoformat(),
            provider="Central Water Commission (CWC) - Ministry of Jal Shakti",
            provider_status=provider_status,
            api_endpoint=f"{self.base_url}/iam/api/new-entry-data/specification/sorted-page",
            total_stations=total_count,
            live_stations_count=live_count,
            stations=station_readings,
            notice=f"Monitoring {total_count} official CWC stations across Kerala river basins. {live_count} currently active.",
            disclaimer=(
                "Authentic river stage observations ingested directly from CWC Flood Forecasting System. "
                "Not fed into Ramamangalam kinematic delta forecasting model without station-specific recalibration."
            )
        )
        self._all_cache = (now_ts, response)
        return response

    def fetch_station_data(self, station_name: str) -> RiverDataResponse:
        """
        Implements RiverDataProvider interface for seamless integration into RiverDataService.
        Maps CWC reading into standard RiverDataResponse format.
        """
        code = resolve_cwc_station(station_name)
        if not code:
            raise ValueError(f"Unrecognized CWC station: '{station_name}'")

        cwc_reading = self.fetch_station_reading_sync(code)
        now_iso = datetime.now(timezone.utc).isoformat()

        return RiverDataResponse(
            station_name=cwc_reading.station_name,
            district=cwc_reading.district,
            status=cwc_reading.status,
            water_level_m=cwc_reading.current_water_level_m,
            flow_rate_cms=None,
            observation_timestamp=cwc_reading.observation_time_iso,
            retrieval_timestamp=cwc_reading.retrieval_timestamp,
            monitoring_station_distance_km=None,
            is_live=cwc_reading.is_live,
            is_cached=cwc_reading.is_cached,
            data_source=cwc_reading.data_source,
            data_freshness=f"{cwc_reading.data_freshness} ({cwc_reading.observation_time_ist or 'No Time'})",
            notice=cwc_reading.notice or "CWC Flood Forecasting System observation.",
            access_requirements="Public REST endpoint (ffs.india-water.gov.in). Zero authorization tokens required.",
            latest_historical_reading=None,
        )


cwc_live_provider = CWCLiveProvider()

