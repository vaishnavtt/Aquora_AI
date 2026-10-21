"""
AQUORA AI - Live Meteorological & Weather Forecast Service
Connects to Open-Meteo public REST API (free, open, no commercial key required)
to ingest:
1. Live ambient temperature, current precipitation intensity, and wind speed.
2. Digital Elevation Model (DEM) ground elevation in metres MSL.
3. 24-hour to 48-hour forward hourly rainfall forecasts for predictive runoff.
Features response caching (15m TTL), timeout enforcement, and graceful offline fallback.
"""

import time
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional, Dict, Tuple, List
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.water_body import WaterBodyModel
from app.schemas.weather import LiveWeatherResponse, LiveHourlyPrecipitation

logger = logging.getLogger(__name__)

# WMO Weather Interpretation Codes (WW)
WMO_WEATHER_MAP = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm with rain",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


class WeatherService:
    """
    Ingests live meteorological data and forward precipitation forecasts
    from Open-Meteo for Kerala water bodies.
    """

    def __init__(
        self,
        timeout: float = 4.0,
        cache_ttl: float = 900.0,
    ):
        self.timeout = timeout or settings.OPEN_METEO_TIMEOUT_SECONDS
        self.cache_ttl = cache_ttl or settings.OPEN_METEO_CACHE_TTL_SECONDS
        self.enabled = settings.OPEN_METEO_API_ENABLED
        self._cache: Dict[Tuple[float, float], Tuple[float, LiveWeatherResponse]] = {}

    def _get_fallback_weather(
        self,
        lat: float,
        lon: float,
        water_body_id: Optional[int] = None,
        water_body_name: Optional[str] = None,
        reason: str = "Live meteorological API unavailable or disabled."
    ) -> LiveWeatherResponse:
        """Provides graceful fallback when offline or API call fails."""
        now_iso = datetime.now(timezone.utc).isoformat()
        # Monthly monsoon status
        month = datetime.now().month
        is_monsoon = month in [6, 7, 8, 10, 11]

        hourly_pts: List[LiveHourlyPrecipitation] = []
        for h in range(1, 25):
            t_str = datetime.now(timezone.utc).strftime(f"%Y-%m-%dT{h:02d}:00Z")
            sim_precip = 2.5 if is_monsoon and (14 <= h <= 18) else 0.0
            hourly_pts.append(LiveHourlyPrecipitation(time=t_str, precipitation_mm=sim_precip, temperature_c=27.5))

        return LiveWeatherResponse(
            water_body_id=water_body_id,
            water_body_name=water_body_name or "Kerala Aquatic Location",
            latitude=round(lat, 4),
            longitude=round(lon, 4),
            current_temperature_c=28.0,
            current_precipitation_mm_h=0.0,
            weather_condition="Seasonal Kerala Climatology (Nominal)",
            wind_speed_kmh=4.5,
            accumulated_24h_rainfall_mm=12.0 if is_monsoon else 0.0,
            forecast_24h_rainfall_mm=15.0 if is_monsoon else 0.5,
            elevation_m=18.0,
            hourly_forecast=hourly_pts,
            is_live_data=False,
            data_source="Offline Kerala Climatological Baseline",
            fetched_at=now_iso,
            disclaimer=f"NOTICE: {reason} Showing regional baseline estimates."
        )

    def get_weather_for_coordinates(
        self,
        lat: float,
        lon: float,
        water_body_id: Optional[int] = None,
        water_body_name: Optional[str] = None,
    ) -> LiveWeatherResponse:
        """
        Fetches live weather from Open-Meteo for given coordinates with caching.
        """
        if not self.enabled:
            return self._get_fallback_weather(
                lat, lon, water_body_id, water_body_name, reason="OPEN_METEO_API_ENABLED is set to false."
            )

        cache_key = (round(lat, 3), round(lon, 3))
        now = time.time()

        if cache_key in self._cache:
            cached_time, cached_res = self._cache[cache_key]
            if (now - cached_time) < self.cache_ttl:
                # Update water body metadata on cached copy if provided
                return cached_res.model_copy(
                    update={
                        "water_body_id": water_body_id or cached_res.water_body_id,
                        "water_body_name": water_body_name or cached_res.water_body_name,
                    }
                )

        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat:.4f}&longitude={lon:.4f}&"
            f"current=temperature_2m,precipitation,weather_code,wind_speed_10m&"
            f"hourly=precipitation,temperature_2m&forecast_days=2&timezone=auto"
        )
        headers = {
            "User-Agent": "AQUORA-AI-Hydrology/1.0 (safety@aquora.local)",
            "Accept": "application/json",
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                if resp.status != 200:
                    raise urllib.error.HTTPError(url, resp.status, "Unexpected HTTP status", resp.headers, None)
                payload = json.loads(resp.read().decode("utf-8"))

            current = payload.get("current", {})
            curr_temp = float(current.get("temperature_2m", 28.0))
            curr_precip = float(current.get("precipitation", 0.0))
            w_code = int(current.get("weather_code", 0))
            wind_speed = float(current.get("wind_speed_10m", 0.0))
            elevation = payload.get("elevation")
            condition_text = WMO_WEATHER_MAP.get(w_code, f"Weather code {w_code}")

            hourly_data = payload.get("hourly", {})
            times = hourly_data.get("time", [])
            precips = hourly_data.get("precipitation", [])
            temps = hourly_data.get("temperature_2m", [])

            hourly_list: List[LiveHourlyPrecipitation] = []
            fwd_24h_sum = 0.0
            for i in range(min(48, len(times))):
                p_val = float(precips[i]) if i < len(precips) and precips[i] is not None else 0.0
                t_val = float(temps[i]) if i < len(temps) and temps[i] is not None else curr_temp
                if i < 24:
                    fwd_24h_sum += p_val
                hourly_list.append(LiveHourlyPrecipitation(time=times[i], precipitation_mm=round(p_val, 2), temperature_c=round(t_val, 1)))

            # 24h past accumulation estimate: sum first few available or current * 6
            past_24h_acc = round(curr_precip * 8.0, 1)

            res = LiveWeatherResponse(
                water_body_id=water_body_id,
                water_body_name=water_body_name or f"Kerala Point ({lat:.3f}, {lon:.3f})",
                latitude=round(lat, 4),
                longitude=round(lon, 4),
                current_temperature_c=round(curr_temp, 1),
                current_precipitation_mm_h=round(curr_precip, 2),
                weather_condition=condition_text,
                wind_speed_kmh=round(wind_speed, 1),
                accumulated_24h_rainfall_mm=past_24h_acc,
                forecast_24h_rainfall_mm=round(fwd_24h_sum, 1),
                elevation_m=float(elevation) if elevation is not None else None,
                hourly_forecast=hourly_list,
                is_live_data=True,
                data_source="Open-Meteo Live API (High-Resolution NWP)",
                fetched_at=datetime.now(timezone.utc).isoformat(),
                disclaimer="Live atmospheric telemetry ingested via Open-Meteo REST service. Elevation derived from high-resolution DEM.",
            )

            self._cache[cache_key] = (now, res)
            return res

        except Exception as exc:
            logger.warning("Open-Meteo fetch failed for (%.4f, %.4f): %s", lat, lon, exc)
            return self._get_fallback_weather(
                lat, lon, water_body_id, water_body_name, reason=f"Upstream fetch error: {type(exc).__name__} ({str(exc)})"
            )

    def get_weather_for_water_body(
        self,
        water_body_id: int,
        db: Session
    ) -> LiveWeatherResponse:
        """Look up water body by ID and fetch live weather."""
        wb = db.query(WaterBodyModel).filter(WaterBodyModel.id == water_body_id).first()
        if not wb:
            return self._get_fallback_weather(
                9.9482, 76.5412, water_body_id=water_body_id, reason="Water body ID not found in database."
            )
        return self.get_weather_for_coordinates(
            lat=wb.latitude,
            lon=wb.longitude,
            water_body_id=wb.id,
            water_body_name=wb.name,
        )


weather_service = WeatherService()

def get_weather_service() -> WeatherService:
    return weather_service
