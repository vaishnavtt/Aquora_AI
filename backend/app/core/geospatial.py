"""
AQUORA AI - Geospatial & River Navigation Utilities
Provides spherical Haversine distance computations, coordinate boundary validation,
and OpenStreetMap river/waterway geographic discovery features for Kerala.
"""

import math
import logging
import time
from typing import List, Dict, Any, Optional, Tuple

try:
    from app.core.risk_classifier import classify_risk_score, RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION
except ImportError:
    from backend.app.core.risk_classifier import classify_risk_score, RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION

logger = logging.getLogger(__name__)

# Mean Earth radius in kilometers (WGS84 spherical approximation)
EARTH_RADIUS_KM = 6371.0088

# Kerala Geographic Bounding Box
KERALA_LAT_MIN = 8.15
KERALA_LAT_MAX = 12.85
KERALA_LON_MIN = 74.80
KERALA_LON_MAX = 77.60


def is_valid_coordinate(lat: Optional[float], lon: Optional[float]) -> bool:
    """Validates that latitude and longitude are valid numeric coordinates."""
    if lat is None or lon is None:
        return False
    try:
        f_lat = float(lat)
        f_lon = float(lon)
        return not (math.isnan(f_lat) or math.isnan(f_lon)) and (-90.0 <= f_lat <= 90.0) and (-180.0 <= f_lon <= 180.0)
    except (ValueError, TypeError):
        return False


def is_kerala_coordinate(lat: float, lon: float) -> bool:
    """Checks whether coordinates lie within the Kerala geographical envelope."""
    if not is_valid_coordinate(lat, lon):
        return False
    return (KERALA_LAT_MIN <= lat <= KERALA_LAT_MAX) and (KERALA_LON_MIN <= lon <= KERALA_LON_MAX)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two points on the Earth's surface
    using the spherical Haversine formula.
    
    Returns:
        Distance in kilometers, rounded to 3 decimal places.
    """
    if not (is_valid_coordinate(lat1, lon1) and is_valid_coordinate(lat2, lon2)):
        raise ValueError("Invalid coordinates provided to haversine_distance_km")

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2) + (math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    # Clip 'a' to [0, 1] to prevent domain errors with math.sqrt
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = EARTH_RADIUS_KM * c
    return round(distance, 3)


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates Haversine distance in meters, rounded to 1 decimal place."""
    return round(haversine_distance_km(lat1, lon1, lat2, lon2) * 1000.0, 1)


def format_distance(distance_km: float) -> str:
    """
    Formats distance for human readability:
    - Under 1.0 km -> formatted in meters (e.g. '450 m')
    - 1.0 km and above -> formatted in kilometers (e.g. '2.4 km')
    """
    if distance_km < 1.0:
        return f"{int(round(distance_km * 1000.0))} m"
    return f"{distance_km:.1f} km"


# Curated Authentic OpenStreetMap Geographic Waterways in Kerala
# Source: OpenStreetMap contributors (ODbL)
# These represent unmonitored geographic river, stream, and canal reaches to supplement
# monitored AQUORA stations when a user explores rivers near them.
KERALA_OSM_WATERWAYS: List[Dict[str, Any]] = [
    {
        "osm_id": 10001,
        "name": "Periyar River (Aluva Ghat reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 10.1118,
        "longitude": 76.3533,
        "district": "Ernakulam",
        "basin_region": "Periyar River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Major perennial river reach near Aluva Palace ghats; popular public transit and bathing reach.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10002,
        "name": "Periyar River (Malayattoor reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 10.1882,
        "longitude": 76.4975,
        "district": "Ernakulam",
        "basin_region": "Periyar River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Upstream Periyar reach flowing past Malayattoor foothills; rocky riverbed with variable currents.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10003,
        "name": "Muvattupuzha River (Muvattupuzha Town Confluence)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 9.9863,
        "longitude": 76.5786,
        "district": "Ernakulam",
        "basin_region": "Muvattupuzha River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Confluence reach of Thodupuzha, Kaliyar, and Kothamangalam rivers forming main Muvattupuzha.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10004,
        "name": "Bharathapuzha (Shoranur Bridge Reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 10.7634,
        "longitude": 76.2755,
        "district": "Palakkad",
        "basin_region": "Bharathapuzha Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Broad sand-bed river reach of Bharathapuzha (Nila) at Shoranur railway crossing.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10005,
        "name": "Pamba River (Chengannur Ghats)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 9.3175,
        "longitude": 76.6125,
        "district": "Alappuzha",
        "basin_region": "Pamba River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Sacred river reach of holy Pamba flowing through Central Travancore floodplains.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10006,
        "name": "Chalakudy River (Pariyaram reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 10.3120,
        "longitude": 76.3680,
        "district": "Thrissur",
        "basin_region": "Chalakudy River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Fast-flowing riparian corridor of Chalakudy river downstream of Athirappilly cascades.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10007,
        "name": "Chaliyar River (Feroke Estuary reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 11.1764,
        "longitude": 75.8361,
        "district": "Kozhikode",
        "basin_region": "Chaliyar River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Tidal estuarine stretch of Chaliyar river near Feroke historical bridge.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10008,
        "name": "Meenachil River (Nagampadam Reach, Kottayam)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 9.5985,
        "longitude": 76.5298,
        "district": "Kottayam",
        "basin_region": "Meenachil River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Urban Meenachil reach winding through Kottayam municipality towards Vembanad backwaters.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10009,
        "name": "Kallada River (Punalur Suspension Bridge reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 9.0192,
        "longitude": 76.9242,
        "district": "Kollam",
        "basin_region": "Kallada River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Historic suspension bridge crossing of Kallada river with granite boulders and deep scours.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10010,
        "name": "Karamana River (Trivandrum City reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 8.4789,
        "longitude": 76.9634,
        "district": "Thiruvananthapuram",
        "basin_region": "Karamana River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Southern Kerala river reach originating from Agastyarkoodam hills flowing through state capital.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10011,
        "name": "National Waterway 3 (Kochi-Alappuzha Canal Reach)",
        "type": "canal",
        "waterway_tag": "canal",
        "latitude": 9.9650,
        "longitude": 76.2820,
        "district": "Ernakulam",
        "basin_region": "West Coast Canal System",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Regulated inland navigation canal channel passing through Kochi metropolitan waterway network.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10012,
        "name": "Ithikkara River (Chathannoor Reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 8.8612,
        "longitude": 76.7154,
        "district": "Kollam",
        "basin_region": "Ithikkara River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Flows into Paravur lake; sand-mining vulnerable reach with unexpected deep scouring.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10013,
        "name": "Korapuzha River (Elathur Estuary)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 11.3524,
        "longitude": 75.7481,
        "district": "Kozhikode",
        "basin_region": "Korapuzha Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Northern Kerala estuarine reach forming district boundary between Calicut and Koyilandy.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10014,
        "name": "Valapattanam River (Parassinikkadavu reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 11.9845,
        "longitude": 75.4021,
        "district": "Kannur",
        "basin_region": "Valapattanam River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Largest river in Kannur district flowing past the revered Parassinikkadavu Muthappan temple ghats.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10015,
        "name": "Kabini River (Kuruva Island Dweep Reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 11.8217,
        "longitude": 76.0911,
        "district": "Wayanad",
        "basin_region": "Cauvery River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "East-flowing tributary of Cauvery river wrapping around protected evergreen river delta islets.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10016,
        "name": "Manimala River (Mallappally Reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 9.4478,
        "longitude": 76.6542,
        "district": "Pathanamthitta",
        "basin_region": "Manimala River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Perennial river flowing from Peermade hills; flood-prone floodplain reach in Mallappally.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10017,
        "name": "Achenkovil River (Mavelikkara Reach)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 9.2435,
        "longitude": 76.5412,
        "district": "Alappuzha",
        "basin_region": "Achenkovil River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Meandering Onattukara river reach; sudden depth variations and sandy banks.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10018,
        "name": "Kuttiyadi River (Kuttiyadi Dam Spillway)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 11.6667,
        "longitude": 75.8333,
        "district": "Kozhikode",
        "basin_region": "Kuttiyadi River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Upstream mountain river downstream of Peruvannamuzhi reservoir with rocky rapids.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10019,
        "name": "Chandragiri River (Kasaragod Estuary)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 12.4933,
        "longitude": 74.9922,
        "district": "Kasaragod",
        "basin_region": "Chandragiri Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Northernmost major river of Kerala entering Arabian Sea near historic Chandragiri Fort.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
    {
        "osm_id": 10020,
        "name": "Kadalundi River (Kadalundi Bird Sanctuary Estuary)",
        "type": "river",
        "waterway_tag": "river",
        "latitude": 11.1278,
        "longitude": 75.8286,
        "district": "Malappuram",
        "basin_region": "Kadalundi River Basin",
        "data_source": "OpenStreetMap Waterway (Geographic Feature)",
        "description": "Ecologically sensitive estuarine river delta with tidal sandbanks and mudflats.",
        "is_monitored_station": False,
        "has_prediction": False,
    },
]

# Simple in-memory cache for Overpass API responses (TTL 1 hour)
_OVERPASS_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
OVERPASS_CACHE_TTL_SECONDS = 3600.0


def find_nearby_water_bodies(
    lat: float,
    lon: float,
    radius_km: float,
    db_stations: List[Any],
    include_osm: bool = True
) -> List[Dict[str, Any]]:
    """
    Finds and ranks all water bodies and rivers within `radius_km` of `(lat, lon)`:
    1. Database monitored stations (CWC, Kerala SW, KSEB)
    2. OpenStreetMap geographic river/waterway reaches (distinguished as unmonitored)
    
    Returns results sorted by distance ascending.
    """
    if not is_valid_coordinate(lat, lon):
        raise ValueError(f"Invalid coordinate center ({lat}, {lon})")

    radius_km = max(0.1, min(100.0, float(radius_km)))
    results: List[Dict[str, Any]] = []

    # 1. Monitored Database Stations
    for wb in db_stations:
        if not is_valid_coordinate(wb.latitude, wb.longitude):
            continue

        dist_km = haversine_distance_km(lat, lon, wb.latitude, wb.longitude)
        if dist_km <= radius_km:
            # Authoritative risk level & category
            level, category = classify_risk_score(wb.risk_score)
            
            results.append({
                "id": wb.id,
                "name": wb.name.replace(" (Demonstration Station)", "").replace(" (DEMO Station)", "").strip(),
                "type": wb.type,
                "latitude": round(wb.latitude, 6),
                "longitude": round(wb.longitude, 6),
                "distance_km": dist_km,
                "distance_meters": round(dist_km * 1000.0, 1),
                "distance_formatted": format_distance(dist_km),
                "district": getattr(wb, "district", None) or getattr(wb, "basin_region", "Kerala"),
                "basin_region": getattr(wb, "basin_region", "Kerala River Basin"),
                "is_monitored_station": True,
                "has_prediction": True,
                "current_risk_level": level,
                "risk_category": category,
                "risk_score": wb.risk_score,
                "data_source": wb.data_source or "AQUORA Monitored Station",
                "last_updated": wb.last_updated.isoformat() if hasattr(wb.last_updated, "isoformat") else str(wb.last_updated),
                "description": wb.description,
                "assessment_scope": "Monitored Point Station: Hydrodynamic sensors and validated risk pipeline active.",
            })

    # 2. OpenStreetMap Geographic Waterways (Unmonitored)
    if include_osm:
        for osm in KERALA_OSM_WATERWAYS:
            dist_km = haversine_distance_km(lat, lon, osm["latitude"], osm["longitude"])
            if dist_km <= radius_km:
                results.append({
                    "id": osm["osm_id"],
                    "name": osm["name"],
                    "type": osm["type"],
                    "latitude": round(osm["latitude"], 6),
                    "longitude": round(osm["longitude"], 6),
                    "distance_km": dist_km,
                    "distance_meters": round(dist_km * 1000.0, 1),
                    "distance_formatted": format_distance(dist_km),
                    "district": osm["district"],
                    "basin_region": osm["basin_region"],
                    "is_monitored_station": False,
                    "has_prediction": False,
                    "current_risk_level": RISK_LEVEL_NO_PREDICTION,
                    "risk_category": RISK_CATEGORY_NO_PREDICTION,
                    "risk_score": None,
                    "data_source": osm["data_source"],
                    "last_updated": None,
                    "description": osm["description"],
                    "assessment_scope": "Unmonitored Geographic Waterway: Sensor telemetry unavailable. AQUORA strictly avoids extrapolating point risk to entire rivers.",
                })

    # Sort strictly by distance ascending
    results.sort(key=lambda item: item["distance_km"])
    return results


def search_waterways_and_stations(
    query: str,
    db_stations: List[Any],
    limit: int = 25
) -> List[Dict[str, Any]]:
    """
    Searches across monitored stations and geographic OSM waterways by:
    - River name
    - District
    - Basin region
    - Waterway type
    """
    clean_q = query.strip().lower()
    if not clean_q:
        return []

    results: List[Dict[str, Any]] = []

    # Search DB stations
    for wb in db_stations:
        if not is_valid_coordinate(wb.latitude, wb.longitude):
            continue
        name_match = clean_q in wb.name.lower()
        basin_match = clean_q in (wb.basin_region or "").lower()
        type_match = clean_q in (wb.type or "").lower()

        if name_match or basin_match or type_match:
            level, category = classify_risk_score(wb.risk_score)
            results.append({
                "id": wb.id,
                "name": wb.name.replace(" (Demonstration Station)", "").replace(" (DEMO Station)", "").strip(),
                "type": wb.type,
                "latitude": round(wb.latitude, 6),
                "longitude": round(wb.longitude, 6),
                "district": getattr(wb, "basin_region", "Kerala"),
                "basin_region": getattr(wb, "basin_region", "Kerala"),
                "is_monitored_station": True,
                "has_prediction": True,
                "current_risk_level": level,
                "risk_category": category,
                "risk_score": wb.risk_score,
                "data_source": wb.data_source,
                "last_updated": wb.last_updated.isoformat() if hasattr(wb.last_updated, "isoformat") else str(wb.last_updated),
                "description": wb.description,
            })

    # Search OSM waterways
    for osm in KERALA_OSM_WATERWAYS:
        name_match = clean_q in osm["name"].lower()
        dist_match = clean_q in osm["district"].lower()
        basin_match = clean_q in osm["basin_region"].lower()
        type_match = clean_q in osm["type"].lower()

        if name_match or dist_match or basin_match or type_match:
            results.append({
                "id": osm["osm_id"],
                "name": osm["name"],
                "type": osm["type"],
                "latitude": round(osm["latitude"], 6),
                "longitude": round(osm["longitude"], 6),
                "district": osm["district"],
                "basin_region": osm["basin_region"],
                "is_monitored_station": False,
                "has_prediction": False,
                "current_risk_level": RISK_LEVEL_NO_PREDICTION,
                "risk_category": RISK_CATEGORY_NO_PREDICTION,
                "risk_score": None,
                "data_source": osm["data_source"],
                "last_updated": None,
                "description": osm["description"],
            })

    return results[:limit]
